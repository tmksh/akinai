import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendOrderEmails } from '@/lib/order-emails';
import { readPlansSettings } from '@/lib/customer-subscription-plans';
import { getWebhookSecretCandidates } from '@/lib/stripe-client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = SupabaseClient<any, 'public', any>;

/**
 * Webhook ペイロードの Stripe API バージョン差異を吸収するヘルパー群。
 *
 * 背景: Webhook が送ってくる JSON の形は「エンドポイントの API バージョン」で決まる。
 * 2025-03-31.basil 以降では以下のフィールドがトップレベルから移動・廃止された:
 *   - invoice.subscription          → invoice.parent.subscription_details.subscription
 *                                      / invoice.lines.data[].parent.subscription_item_details.subscription
 *   - subscription.current_period_end → subscription.items.data[].current_period_end
 * SDK 経由の API 呼び出し（subscriptions.retrieve 等）は SDK 固定バージョンで応答するため
 * 旧形式のままだが、Webhook ペイロードは新形式になり得る。両方を見て取得する。
 */
function extractInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const pick = (v: unknown): string | null =>
    !v ? null : typeof v === 'string' ? v : ((v as { id?: string }).id ?? null);

  const inv = invoice as unknown as {
    subscription?: unknown;
    parent?: { subscription_details?: { subscription?: unknown } | null } | null;
    lines?: {
      data?: Array<{
        subscription?: unknown;
        parent?: { subscription_item_details?: { subscription?: unknown } | null } | null;
      }>;
    };
  };

  const direct = pick(inv.subscription) || pick(inv.parent?.subscription_details?.subscription);
  if (direct) return direct;

  for (const line of inv.lines?.data ?? []) {
    const fromLine = pick(line.subscription) || pick(line.parent?.subscription_item_details?.subscription);
    if (fromLine) return fromLine;
  }
  return null;
}

function extractCurrentPeriodEnd(subscription: unknown): number | null {
  const sub = subscription as {
    current_period_end?: number | null;
    items?: { data?: Array<{ current_period_end?: number | null }> };
  } | null | undefined;
  if (!sub) return null;
  if (sub.current_period_end) return sub.current_period_end;
  return sub.items?.data?.find((i) => i.current_period_end)?.current_period_end ?? null;
}

function extractCurrentPeriodStart(subscription: unknown): number | null {
  const sub = subscription as {
    current_period_start?: number | null;
    items?: { data?: Array<{ current_period_start?: number | null }> };
  } | null | undefined;
  if (!sub) return null;
  if (sub.current_period_start) return sub.current_period_start;
  return sub.items?.data?.find((i) => i.current_period_start)?.current_period_start ?? null;
}

/**
 * GET /api/stripe/webhook
 *
 * Stripe Webhook の設定状況を確認するための診断エンドポイント。
 * Webhook が動いていない場合の切り分けに使う。
 * 認証なしで叩けるが、シークレットそのものは返さず、設定の有無だけ返す。
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/stripe/webhook',
    method: 'POST',
    hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
    hasTestStripeSecretKey: !!process.env.STRIPE_TEST_SECRET_KEY,
    hasAccountWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasConnectWebhookSecret: !!process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
    hasTestAccountWebhookSecret: !!process.env.STRIPE_TEST_WEBHOOK_SECRET,
    hasTestConnectWebhookSecret: !!process.env.STRIPE_TEST_CONNECT_WEBHOOK_SECRET,
    handles: [
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'checkout.session.completed (mode=payment / subscription)',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'customer.subscription.trial_will_end',
      'invoice.payment_succeeded',
    ],
    notes: [
      'Connect 経由のサブスク更新は subscription.metadata.akinai_customer_id で判定する',
      'Account events と Connect events は Stripe Dashboard 上で別々の Endpoint として登録する必要がある',
      '別 Endpoint の場合は STRIPE_WEBHOOK_SECRET と STRIPE_CONNECT_WEBHOOK_SECRET の両方を環境変数に設定する',
    ],
  });
}

/**
 * POST /api/stripe/webhook
 *
 * Stripe からの Webhook イベントを処理する。
 * Connect アカウントからのイベントも含め、ここで一括受信する。
 *
 * 対応イベント:
 * - payment_intent.succeeded   → 注文を「支払い済み」に更新
 * - payment_intent.payment_failed → 注文を「支払い失敗」に更新
 * - checkout.session.completed → 注文を「支払い済み」に更新（Checkout Session モード用）
 */
export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables for webhook');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const body = await request.text();

  let event: Stripe.Event;

  const secretCandidates = getWebhookSecretCandidates();

  if (secretCandidates.length > 0) {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error('[Webhook] Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // 本番・テスト両方のシークレットを順に試す
    let verified: Stripe.Event | null = null;
    let lastError: unknown = null;
    for (const secret of secretCandidates) {
      try {
        verified = stripe.webhooks.constructEvent(body, signature, secret);
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!verified) {
      console.error(
        '[Webhook] Signature verification failed for all configured secrets:',
        lastError
      );
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    event = verified;
  } else {
    // 開発環境では署名検証をスキップ
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  }

  // Connect アカウントの場合は event.account にアカウントIDが入る
  const connectedAccountId = event.account || null;

  // 受信イベントを必ずログに出す（運用調査用）
  console.log(
    `[Webhook] received: type=${event.type}, id=${event.id}, account=${connectedAccountId ?? '(platform)'}`
  );

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSuccess(supabase, paymentIntent, connectedAccountId);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(supabase, paymentIntent, connectedAccountId);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription') {
          // customer_id メタデータ付きはエンドユーザー向けサブスク
          if (session.metadata?.customer_id) {
            await handleCustomerSubscriptionCheckoutComplete(supabase, stripe, session, connectedAccountId);
          } else {
            await handleSubscriptionCheckoutComplete(supabase, session);
          }
        } else {
          await handleCheckoutComplete(supabase, session, connectedAccountId);
        }
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(supabase, subscription);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        // 顧客向けサブスクは customer_id メタデータで判定
        if (subscription.metadata?.akinai_customer_id) {
          await handleCustomerSubscriptionChange(supabase, subscription, event.data.previous_attributes);
        } else {
          await handleSubscriptionUpdated(supabase, subscription);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.metadata?.akinai_customer_id) {
          await handleCustomerSubscriptionCanceled(supabase, subscription);
        } else {
          await handleSubscriptionDeleted(supabase, subscription);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        // 顧客サブスクの場合は別ハンドラに委譲（テナント自身のサブスクと区別）
        const isCustomerInvoice = await routeInvoicePaymentSucceeded(
          stripe,
          supabase,
          invoice,
          connectedAccountId
        );
        if (!isCustomerInvoice) {
          await handleInvoicePaymentSucceeded(supabase, invoice);
        }
        break;
      }

      default:
        // 未対応のイベントは無視
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * サブスクリプション Checkout Session 完了時の処理
 */
async function handleSubscriptionCheckoutComplete(
  supabase: SupabaseAdmin,
  session: Stripe.Checkout.Session
) {
  const organizationId = session.metadata?.organization_id;
  const plan = session.metadata?.plan;

  if (!organizationId || !plan) {
    console.warn('subscription checkout: missing metadata');
    return;
  }

  console.log(`[Webhook] subscription checkout completed: org=${organizationId}, plan=${plan}`);

  await supabase
    .from('organizations')
    .update({
      plan,
      stripe_subscription_id: session.subscription as string,
      stripe_customer_id: session.customer as string,
      subscription_status: 'trialing',
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);
}

/**
 * サブスクリプション更新時の処理
 */
async function handleSubscriptionUpdated(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription
) {
  const organizationId = subscription.metadata?.organization_id;
  if (!organizationId) return;

  console.log(`[Webhook] subscription updated: org=${organizationId}, status=${subscription.status}`);

  const periodEndUnix = extractCurrentPeriodEnd(subscription);

  await supabase
    .from('organizations')
    .update({
      subscription_status: subscription.status,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      subscription_current_period_end: periodEndUnix
        ? new Date(periodEndUnix * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);
}

/**
 * サブスクリプション削除時の処理
 */
async function handleSubscriptionDeleted(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription
) {
  const organizationId = subscription.metadata?.organization_id;
  if (!organizationId) return;

  console.log(`[Webhook] subscription deleted: org=${organizationId}`);

  await supabase
    .from('organizations')
    .update({
      plan: 'starter',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);
}

/**
 * invoice.payment_succeeded を「顧客サブスク向け」と「テナント自身のサブスク向け」に振り分ける。
 *
 * 顧客サブスクの場合、Subscription のメタデータに akinai_customer_id があるので
 * それを判定材料にする。Connect アカウント経由のイベントなので
 * Subscription を取り直す際は stripeAccount オプションが必要。
 *
 * 戻り値: 顧客サブスクとして処理した場合 true。
 */
async function routeInvoicePaymentSucceeded(
  stripe: Stripe,
  supabase: SupabaseAdmin,
  invoice: Stripe.Invoice,
  connectedAccountId: string | null
): Promise<boolean> {
  const subscriptionId = extractInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return false;

  // Connect 経由の場合は stripeAccount を指定して Subscription を取得する
  let subscription: Stripe.Subscription | null = null;
  try {
    subscription = await stripe.subscriptions.retrieve(
      subscriptionId,
      connectedAccountId ? { stripeAccount: connectedAccountId } : undefined
    );
  } catch (err) {
    console.warn('[Webhook] failed to retrieve subscription for invoice:', err);
    return false;
  }

  const organizationId = subscription.metadata?.akinai_organization_id;
  const customerId = subscription.metadata?.akinai_customer_id;
  const planId = subscription.metadata?.akinai_plan_id;

  // 顧客サブスクではない（テナント自身のサブスク）
  if (!organizationId || !customerId) return false;

  console.log(
    `[Webhook] customer invoice.payment_succeeded: org=${organizationId}, customer=${customerId}, sub=${subscriptionId}, invoice=${invoice.id}`
  );

  const { data: customer } = await supabase
    .from('customers')
    .select('name, email')
    .eq('id', customerId)
    .eq('organization_id', organizationId)
    .single();

  // テナント設定を確認
  const { data: orgData } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();
  const plansSettings = readPlansSettings(orgData?.settings as Record<string, unknown> | null);
  if (!plansSettings.subscriptionCreatesOrder) return true;

  // 初回か継続/アップグレードかを判定
  const isFirstInvoice = !invoice.billing_reason || invoice.billing_reason === 'subscription_create';

  // ── 冪等チェック ──
  // 初回: checkout.session.completed 経由の ensureSubscriptionOrder と重複しないよう
  //   invoice.id OR subscriptionId の両方で確認する。
  // 継続・アップグレード: subscriptionId は過去の注文にも含まれるため invoice.id のみで確認する。
  //   （同一 subscriptionId でも別 invoice = 別課金として新規注文を作成する）
  const idempotencyFilter = isFirstInvoice
    ? `notes.ilike.%${invoice.id}%,notes.ilike.%${subscriptionId}%`
    : `notes.ilike.%${invoice.id}%`;

  const { data: existingByInvoice } = await supabase
    .from('orders')
    .select('id')
    .eq('organization_id', organizationId)
    .or(idempotencyFilter)
    .limit(1);
  if (existingByInvoice && existingByInvoice.length > 0) {
    console.log('[Webhook] order already exists for this invoice/subscription, skip:', invoice.id);
    return true;
  }

  const plan = plansSettings.plans.find((p) => p.id === planId);
  // invoice.amount_paid を優先（プラン変更・日割り等で実際の請求額が異なる場合に対応）
  const amount = invoice.amount_paid ?? plan?.amount ?? 0;
  const planName = plan?.name ?? 'サブスクリプション';
  const notePrefix = isFirstInvoice
    ? 'サブスクリプション初回'
    : invoice.billing_reason === 'subscription_update'
    ? 'サブスクリプションアップグレード'
    : 'サブスクリプション継続課金';

  const orderNumber = generateOrderNumber();
  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
      organization_id: organizationId,
      order_number: orderNumber,
      customer_id: customerId,
      customer_name: (customer?.name as string | null) || '',
      customer_email: (customer?.email as string | null) || '',
      subtotal: amount,
      shipping_cost: 0,
      tax: 0,
      total: amount,
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'subscription',
      shipping_address: {},
      notes: `${notePrefix}: ${planName} (${subscriptionId} / ${invoice.id})`,
      stripe_payment_intent_id: null,
    })
    .select('id')
    .single();

  if (orderError || !newOrder) {
    console.error('[Webhook] Failed to create subscription order:', orderError);
    return true;
  }

  await supabase.from('order_items').insert({
    order_id: newOrder.id,
    product_id: null,
    variant_id: null,
    product_name: planName,
    variant_name: "",
    sku: "",
    quantity: 1,
    unit_price: amount,
    total_price: amount,
  });

  await recalcCustomerOrderStats(supabase, organizationId, customerId);

  if (plansSettings.subscriptionSendsEmail) {
    await sendOrderEmails(supabase, newOrder.id, organizationId);
  }

  console.log(`[Webhook] Subscription order created (invoice=${invoice.id}, first=${isFirstInvoice}): ${newOrder.id}`);
  return true;
}

/**
 * 請求書支払い成功時の処理（テナント自身のサブスク）
 */
async function handleInvoicePaymentSucceeded(
  supabase: SupabaseAdmin,
  invoice: Stripe.Invoice
) {
  const subscriptionId = extractInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!org) return;

  console.log(`[Webhook] invoice.payment_succeeded: org=${org.id}`);

  await supabase
    .from('organizations')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', org.id);
}

function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

/**
 * planId からプラン名を解決する。
 */
function resolvePlanLabel(
  plansSettings: ReturnType<typeof readPlansSettings>,
  planId: string | undefined | null
): string | null {
  if (!planId) return null;
  const plan = plansSettings.plans.find((p) => p.id === planId);
  return plan?.name ?? null;
}

/**
 * 顧客の total_orders / total_spent を orders テーブルから再集計して書き戻す。
 *
 * orders テーブルには集計トリガーが無いため、order を作る／変える／消すたびに
 * 呼び出して整合性を保つ用途。
 *
 * 集計対象: payment_status が 'failed'/'refunded' 以外の order を「成立」として数える。
 */
async function recalcCustomerOrderStats(
  supabase: SupabaseAdmin,
  organizationId: string,
  customerId: string
) {
  const { data: rows, error } = await supabase
    .from('orders')
    .select('total, payment_status')
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId);

  if (error) {
    console.error('[Webhook] recalcCustomerOrderStats query failed:', error);
    return;
  }

  const valid = (rows ?? []).filter(
    (r) => r.payment_status !== 'failed' && r.payment_status !== 'refunded'
  );
  const totalOrders = valid.length;
  const totalSpent = valid.reduce((sum, r) => sum + (Number(r.total) || 0), 0);

  await supabase
    .from('customers')
    .update({
      total_orders: totalOrders,
      total_spent: totalSpent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('organization_id', organizationId);
}

/**
 * サブスクリプション注文を冪等に確保するヘルパー。
 *
 * - 同一 stripeSubscriptionId の注文が既にあれば何もしない（重複防止）
 * - plansSettings.subscriptionCreatesOrder が false なら何もしない
 * - checkout.session.completed と invoice.payment_succeeded の両方から安全に呼べる
 */
async function ensureSubscriptionOrder(
  supabase: SupabaseAdmin,
  args: {
    organizationId: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    planId?: string;
    stripeSubscriptionId: string;
    plansSettings: ReturnType<typeof readPlansSettings>;
  }
): Promise<void> {
  const { organizationId, customerId, customerName, customerEmail, planId, stripeSubscriptionId, plansSettings } = args;

  if (!plansSettings.subscriptionCreatesOrder) return;

  // 同一サブスクの注文が既にあればスキップ
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .ilike('notes', `%${stripeSubscriptionId}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log('[Webhook] subscription order already exists, skip:', stripeSubscriptionId);
    return;
  }

  const plan = plansSettings.plans.find((p) => p.id === planId);
  const amount = plan?.amount ?? 0;
  const planName = plan?.name ?? 'サブスクリプション';

  const orderNumber = generateOrderNumber();
  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
      organization_id: organizationId,
      order_number: orderNumber,
      customer_id: customerId,
      customer_name: customerName,
      customer_email: customerEmail,
      subtotal: amount,
      shipping_cost: 0,
      tax: 0,
      total: amount,
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'subscription',
      shipping_address: {},
      notes: `サブスクリプション初回: ${planName} (${stripeSubscriptionId})`,
      stripe_payment_intent_id: null,
    })
    .select('id')
    .single();

  if (orderError || !newOrder) {
    console.error('[Webhook] ensureSubscriptionOrder: Failed to create order:', orderError);
    return;
  }

  await supabase.from('order_items').insert({
    order_id: newOrder.id,
    product_id: null,
    variant_id: null,
    product_name: planName,
    variant_name: "",
    sku: "",
    quantity: 1,
    unit_price: amount,
    total_price: amount,
  });

  await recalcCustomerOrderStats(supabase, organizationId, customerId);

  if (plansSettings.subscriptionSendsEmail) {
    await sendOrderEmails(supabase, newOrder.id, organizationId);
  }

  console.log(`[Webhook] ensureSubscriptionOrder: order created: ${newOrder.id}`);
}

/**
 * エンドユーザー向けサブスクリプション Checkout 完了時の処理
 * customers.custom_fields.subscription を更新する。
 * 組織設定に応じて orders への記録・確認メール送信も行う。
 */
async function handleCustomerSubscriptionCheckoutComplete(
  supabase: SupabaseAdmin,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  connectedAccountId: string | null
) {
  const organizationId = session.metadata?.organization_id;
  const customerId = session.metadata?.customer_id;
  const planId = session.metadata?.plan_id;

  if (!organizationId || !customerId || !planId) {
    console.warn('customer subscription checkout: missing metadata', session.metadata);
    return;
  }

  console.log(
    `[Webhook] customer subscription checkout completed: org=${organizationId}, customer=${customerId}, plan=${planId}`
  );

  const { data: existing } = await supabase
    .from('customers')
    .select('custom_fields, status, name, email')
    .eq('id', customerId)
    .eq('organization_id', organizationId)
    .single();

  const currentCustomFields =
    (existing?.custom_fields as Record<string, unknown> | null) || {};

  // プラン名を解決して custom_fields.plan も同時に更新する
  const { data: orgForPlan } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();
  const plansSettingsForLabel = readPlansSettings(
    orgForPlan?.settings as Record<string, unknown> | null
  );
  const planLabel = resolvePlanLabel(plansSettingsForLabel, planId);

  // サブスクリプションの current_period_end を Stripe から取得する
  let currentPeriodEnd: string | null = null;
  if (session.subscription) {
    try {
      const subId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;
      const retrieveOptions = connectedAccountId ? { stripeAccount: connectedAccountId } : undefined;
      const stripeSub = await stripe.subscriptions.retrieve(subId, retrieveOptions as Parameters<typeof stripe.subscriptions.retrieve>[1]);
      const periodEndUnix = extractCurrentPeriodEnd(stripeSub);
      currentPeriodEnd = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;
    } catch (err) {
      console.warn('[Webhook] failed to retrieve subscription for currentPeriodEnd:', err);
    }
  }

  const now = new Date().toISOString();
  const subscription = {
    planId,
    stripeSubscriptionId: session.subscription as string,
    stripeCustomerId: session.customer as string,
    status: 'active',
    currentPeriodEnd,
    cancelAtPeriodEnd: false,
    startedAt: now,
    updatedAt: now,
  };

  await supabase
    .from('customers')
    .update({
      status: existing?.status === 'suspended' ? 'suspended' : 'active',
      custom_fields: {
        ...currentCustomFields,
        subscription,
        // プラン名が解決できた場合のみ更新（不明なら従来値を保持）
        ...(planLabel ? { plan: planLabel } : {}),
      },
      updated_at: now,
    })
    .eq('id', customerId)
    .eq('organization_id', organizationId);

  // ── 注文作成（冪等） ──
  // invoice.payment_succeeded でも作成するが、そのイベントが届かないケースへの保険として
  // checkout.session.completed でも作成する。stripeSubscriptionId でのチェックにより
  // 両方届いても重複しない。
  await ensureSubscriptionOrder(supabase, {
    organizationId,
    customerId,
    customerName: (existing?.name as string | null) || '',
    customerEmail: (existing?.email as string | null) || '',
    planId,
    stripeSubscriptionId: session.subscription as string,
    plansSettings: plansSettingsForLabel,
  });
}

/**
 * 顧客向けサブスクリプションが更新された場合の処理
 * （customer.subscription.created / customer.subscription.updated）
 *
 * 防御策:
 *  1. すでに active/trialing が入っているのに incomplete 系で上書きしない
 *     （Stripe からのイベント到着順序による status 劣化を防ぐ）
 *  2. status が active/trialing になった時点で orders にレコードが無ければ
 *     フォールバックで作成する（checkout.session.completed が失敗していた場合の救済）
 */
async function handleCustomerSubscriptionChange(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription,
  previousAttributes?: unknown
) {
  const organizationId = subscription.metadata?.akinai_organization_id;
  const customerId = subscription.metadata?.akinai_customer_id;
  const planId = subscription.metadata?.akinai_plan_id;

  if (!organizationId || !customerId) {
    console.warn('customer subscription change: missing metadata', subscription.metadata);
    return;
  }

  console.log(
    `[Webhook] customer subscription changed: org=${organizationId}, customer=${customerId}, status=${subscription.status}`
  );

  const { data: existing } = await supabase
    .from('customers')
    .select('custom_fields, name, email')
    .eq('id', customerId)
    .eq('organization_id', organizationId)
    .single();

  const currentCustomFields =
    (existing?.custom_fields as Record<string, unknown> | null) || {};
  const currentSub =
    (currentCustomFields.subscription as Record<string, unknown> | undefined) || {};

  // ── 防御 1: ステータスの劣化を防ぐ ──
  // 既に active / trialing が入っている場合、incomplete 系での上書きは無視。
  // （Stripe では subscription.created (incomplete) が後着するパターンがある）
  const incompleteStatuses = ['incomplete', 'incomplete_expired'];
  const currentStatus = currentSub.status as string | undefined;
  let nextStatus: string = subscription.status;
  if (
    (currentStatus === 'active' || currentStatus === 'trialing') &&
    incompleteStatuses.includes(subscription.status)
  ) {
    console.log(
      `[Webhook] skip subscription status downgrade: keep=${currentStatus}, ignored=${subscription.status}`
    );
    nextStatus = currentStatus;
  }

  const now = new Date().toISOString();

  const scheduledPlanId = currentSub.scheduledPlanId as string | undefined;
  const incomingPeriodEndUnix = extractCurrentPeriodEnd(subscription);
  const incomingNewPeriodEnd = incomingPeriodEndUnix
    ? new Date(incomingPeriodEndUnix * 1000).toISOString()
    : null;
  const prevPeriodEnd = currentSub.currentPeriodEnd as string | undefined;

  // ダウングレード予約が存在し、incoming planId が scheduledPlanId と一致する場合は
  // 「登録時の即時イベント」か「期間終了による自動更新」かを判定する。
  // 判定シグナル（どちらか成立で「有効化」）:
  //  (a) 期間が進んだ: prevPeriodEnd !== newPeriodEnd
  //  (b) 予約時刻より後に新しい課金期間が始まった: current_period_start > scheduledAt
  // (b) を併用するのは、過去に current_period_end を取りこぼして prevPeriodEnd が
  // 欠落しているケース（旧 API バージョン差異による空振り）でも再送信で復旧できるようにするため。
  const isScheduledDowngrade = !!(scheduledPlanId && planId && planId === scheduledPlanId);
  const isPeriodAdvanced = !!(prevPeriodEnd && incomingNewPeriodEnd && prevPeriodEnd !== incomingNewPeriodEnd);

  const incomingPeriodStartUnix = extractCurrentPeriodStart(subscription);
  const scheduledAt = currentSub.scheduledAt as string | undefined;
  const isPeriodStartedAfterSchedule = !!(
    incomingPeriodStartUnix &&
    scheduledAt &&
    new Date(incomingPeriodStartUnix * 1000).getTime() > new Date(scheduledAt).getTime()
  );

  // イベント自身の previous_attributes から「この更新で課金期間が前進したか」を判定する。
  // akinai 側の保存値に依存しないため、過去のデータ欠落があっても再送信で正しく復旧できる。
  // 登録時の即時更新（価格変更のみ・期間据え置き）では期間が変わらないため発火しない。
  const prevPeriodEndFromEventUnix = extractCurrentPeriodEnd(previousAttributes);
  const isPeriodAdvancedFromEvent = !!(
    prevPeriodEndFromEventUnix &&
    incomingPeriodEndUnix &&
    prevPeriodEndFromEventUnix !== incomingPeriodEndUnix
  );

  const isScheduleActivated =
    isScheduledDowngrade &&
    (isPeriodAdvanced || isPeriodStartedAfterSchedule || isPeriodAdvancedFromEvent);
  const isScheduleRegistrationEvent = isScheduledDowngrade && !isScheduleActivated;

  if (isScheduleRegistrationEvent) {
    // スケジュール登録時の即時 webhook → planId は現状維持、currentPeriodEnd のみ更新
    console.log(
      `[Webhook] schedule registration event (not renewal): keep planId=${currentSub.planId}, scheduledPlanId=${scheduledPlanId}`
    );
    await supabase
      .from('customers')
      .update({
        custom_fields: {
          ...currentCustomFields,
          subscription: {
            ...currentSub,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            status: nextStatus,
            currentPeriodEnd: incomingNewPeriodEnd,
            cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
            updatedAt: now,
          },
        },
        updated_at: now,
      })
      .eq('id', customerId)
      .eq('organization_id', organizationId);
    return;
  }

  // 通常更新 or スケジュールダウングレード自動実行
  const activePlanId = isScheduleActivated
    ? scheduledPlanId   // ダウングレード実行: scheduledPlanId を正式な planId に
    : (planId ?? currentSub.planId);

  const updatedSub = {
    ...currentSub,
    planId: activePlanId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    status: nextStatus,
    currentPeriodEnd: incomingNewPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    startedAt: currentSub.startedAt ?? now,
    updatedAt: now,
    // ダウングレード予約が実行されたらクリア
    ...(isScheduleActivated
      ? { scheduledPlanId: null, scheduledPlanName: null, scheduledAt: null }
      : {}),
  };

  // active / trialing になった場合は custom_fields.plan もプラン名で同期する
  let planLabel: string | null = null;
  if (nextStatus === 'active' || nextStatus === 'trialing') {
    const { data: orgForPlan } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();
    const plansSettingsForLabel = readPlansSettings(
      orgForPlan?.settings as Record<string, unknown> | null
    );
    planLabel = resolvePlanLabel(
      plansSettingsForLabel,
      (activePlanId as string | undefined) || null
    );
  }

  await supabase
    .from('customers')
    .update({
      custom_fields: {
        ...currentCustomFields,
        subscription: updatedSub,
        ...(planLabel ? { plan: planLabel } : {}),
      },
      updated_at: now,
    })
    .eq('id', customerId)
    .eq('organization_id', organizationId);

  // 注文作成は invoice.payment_succeeded に一本化しているため、ここでは行わない
}

/**
 * 顧客向けサブスクリプションが完全に終了したときの処理
 */
async function handleCustomerSubscriptionCanceled(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription
) {
  const organizationId = subscription.metadata?.akinai_organization_id;
  const customerId = subscription.metadata?.akinai_customer_id;

  if (!organizationId || !customerId) {
    console.warn('customer subscription canceled: missing metadata', subscription.metadata);
    return;
  }

  console.log(
    `[Webhook] customer subscription canceled: org=${organizationId}, customer=${customerId}`
  );

  const { data: existing } = await supabase
    .from('customers')
    .select('custom_fields')
    .eq('id', customerId)
    .eq('organization_id', organizationId)
    .single();

  const currentCustomFields =
    (existing?.custom_fields as Record<string, unknown> | null) || {};
  const currentSub =
    (currentCustomFields.subscription as Record<string, unknown> | undefined) || {};

  const now = new Date().toISOString();
  const updatedSub = {
    ...currentSub,
    status: 'canceled',
    cancelAtPeriodEnd: false,
    updatedAt: now,
  };

  await supabase
    .from('customers')
    .update({
      custom_fields: {
        ...currentCustomFields,
        subscription: updatedSub,
        // サブスク終了に伴い plan を free に戻す
        plan: 'free',
      },
      updated_at: now,
    })
    .eq('id', customerId)
    .eq('organization_id', organizationId);
}

/**
 * トライアル終了直前通知の処理（Stripe は終了 3 日前に送信）
 */
async function handleTrialWillEnd(
  supabase: SupabaseAdmin,
  subscription: Stripe.Subscription
) {
  const organizationId = subscription.metadata?.organization_id;
  if (!organizationId) return;

  const trialEndsAt = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  console.log(`[Webhook] trial_will_end: org=${organizationId}, trialEndsAt=${trialEndsAt}`);

  await supabase
    .from('organizations')
    .update({
      trial_ends_at: trialEndsAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);
}

/**
 * PaymentIntent 成功時の処理
 */
async function handlePaymentSuccess(
  supabase: SupabaseAdmin,
  paymentIntent: Stripe.PaymentIntent,
  connectedAccountId: string | null
) {
  const orderId = paymentIntent.metadata?.order_id;
  const organizationId = paymentIntent.metadata?.organization_id;

  if (!orderId) {
    console.warn('payment_intent.succeeded: No order_id in metadata, skipping');
    return;
  }

  console.log(`[Webhook] payment_intent.succeeded: order=${orderId}, account=${connectedAccountId}`);

  // 注文を「支払い済み」に更新
  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'paid',
      status: 'confirmed',
      stripe_payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('Failed to update order payment status:', error);
    throw error;
  }

  // 在庫を実際に減らす
  if (organizationId) {
    await deductStock(supabase, orderId, organizationId);
  }
}

/**
 * PaymentIntent 失敗時の処理
 */
async function handlePaymentFailure(
  supabase: SupabaseAdmin,
  paymentIntent: Stripe.PaymentIntent,
  connectedAccountId: string | null
) {
  const orderId = paymentIntent.metadata?.order_id;

  if (!orderId) {
    console.warn('payment_intent.payment_failed: No order_id in metadata, skipping');
    return;
  }

  console.log(`[Webhook] payment_intent.payment_failed: order=${orderId}, account=${connectedAccountId}`);

  const { error } = await supabase
    .from('orders')
    .update({
      payment_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error('Failed to update order payment status:', error);
    throw error;
  }
}

/**
 * Checkout Session 完了時の処理
 */
async function handleCheckoutComplete(
  supabase: SupabaseAdmin,
  session: Stripe.Checkout.Session,
  connectedAccountId: string | null
) {
  const orderId = session.metadata?.order_id;
  const organizationId = session.metadata?.organization_id;

  if (!orderId) {
    console.warn('checkout.session.completed: No order_id in metadata, skipping');
    return;
  }

  console.log(`[Webhook] checkout.session.completed: order=${orderId}, account=${connectedAccountId}`);

  if (session.payment_status === 'paid') {
    const { error } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'confirmed',
        stripe_payment_intent_id: session.payment_intent as string | null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      console.error('Failed to update order:', error);
      throw error;
    }

    // 在庫を実際に減らす
    if (organizationId) {
      await deductStock(supabase, orderId, organizationId);
    }

    // 注文確認メールを送信
    await sendOrderEmails(supabase, orderId, organizationId || null);
  }
}

/**
 * 注文明細を元に在庫を減らす
 */
async function deductStock(
  supabase: SupabaseAdmin,
  orderId: string,
  organizationId: string
) {
  // 注文明細を取得
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('variant_id, quantity, product_id, product_name, variant_name, sku')
    .eq('order_id', orderId);

  if (itemsError || !items) {
    console.error('Failed to fetch order items for stock deduction:', itemsError);
    return;
  }

  for (const item of items) {
    // 現在の在庫を取得
    const { data: variant } = await supabase
      .from('product_variants')
      .select('stock')
      .eq('id', item.variant_id)
      .single();

    if (!variant) continue;

    const previousStock = variant.stock;
    const newStock = Math.max(0, previousStock - item.quantity);

    // 在庫を更新
    await supabase
      .from('product_variants')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', item.variant_id);

    // 在庫移動履歴を記録
    await supabase.from('stock_movements').insert({
      organization_id: organizationId,
      product_id: item.product_id,
      variant_id: item.variant_id,
      type: 'out',
      quantity: -item.quantity,
      previous_stock: previousStock,
      new_stock: newStock,
      reason: '決済完了による在庫引き落とし',
      reference: orderId,
      product_name: item.product_name,
      variant_name: item.variant_name,
      sku: item.sku,
    });
  }
}



import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendOrderEmails } from '@/lib/order-emails';
import { readPlansSettings } from '@/lib/customer-subscription-plans';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = SupabaseClient<any, 'public', any>;

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
    hasAccountWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    hasConnectWebhookSecret: !!process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
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
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  // Account events 用と Connect events 用は Stripe 側で別 Endpoint として登録され、
  // それぞれ別の署名シークレットになるので両方を読み込む。
  // Stripe Dashboard で Endpoint を1つしか作っていない場合は、
  // 同じシークレットを両方の env にセットすればよい。
  const accountWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const connectWebhookSecret =
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET || accountWebhookSecret;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables for webhook');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // リクエストボディを raw text で取得（署名検証に必要）
  const body = await request.text();

  let event: Stripe.Event;

  if (accountWebhookSecret || connectWebhookSecret) {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error('[Webhook] Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Account 用と Connect 用のシークレットを順に試す。
    // どちらかで検証に成功すればそれを採用する。
    const candidates = [
      { name: 'account', secret: accountWebhookSecret },
      { name: 'connect', secret: connectWebhookSecret },
    ].filter((c): c is { name: string; secret: string } => !!c.secret);

    let verified: Stripe.Event | null = null;
    let lastError: unknown = null;
    for (const c of candidates) {
      try {
        verified = stripe.webhooks.constructEvent(body, signature, c.secret);
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
            await handleCustomerSubscriptionCheckoutComplete(supabase, session);
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
          await handleCustomerSubscriptionChange(supabase, subscription);
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

  await supabase
    .from('organizations')
    .update({
      subscription_status: subscription.status,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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
  const subscriptionId = invoice.subscription as string | null;
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

  // 同じ invoice.id で重複作成しないようチェック
  const { data: existingByInvoice } = await supabase
    .from('orders')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .ilike('notes', `%${invoice.id}%`)
    .limit(1);
  if (existingByInvoice && existingByInvoice.length > 0) {
    console.log('[Webhook] invoice already recorded as order, skip');
    return true;
  }

  // 同サブスクの orders がまだ無い場合は「初回」扱い → ensureSubscriptionOrder で作る
  const { data: existingForSub } = await supabase
    .from('orders')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .ilike('notes', `%${subscriptionId}%`)
    .limit(1);

  if (!existingForSub || existingForSub.length === 0) {
    await ensureSubscriptionOrder(supabase, {
      organizationId,
      customerId,
      customerName: (customer?.name as string | null) || '',
      customerEmail: (customer?.email as string | null) || '',
      planId,
      stripeSubscriptionId: subscriptionId,
    });
    return true;
  }

  // 継続課金: テナント設定で orders 作成が有効なら新しいレコードを作る
  const { data: orgData } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();
  const plansSettings = readPlansSettings(orgData?.settings as Record<string, unknown> | null);
  if (!plansSettings.subscriptionCreatesOrder) return true;

  const plan = plansSettings.plans.find((p) => p.id === planId);
  // invoice の amount_paid を優先する（プラン金額が変わっていても請求実額を記録できるため）
  const amount = invoice.amount_paid ?? plan?.amount ?? 0;
  const planName = plan?.name ?? 'サブスクリプション';

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
      notes: `サブスクリプション継続課金: ${planName} (${subscriptionId} / ${invoice.id})`,
      stripe_payment_intent_id: null,
    })
    .select('id')
    .single();

  if (orderError || !newOrder) {
    console.error('[Webhook] Failed to create renewal order:', orderError);
    return true;
  }

  await supabase.from('order_items').insert({
    order_id: newOrder.id,
    product_id: null,
    variant_id: null,
    product_name: planName,
    variant_name: null,
    sku: null,
    quantity: 1,
    unit_price: amount,
    total_price: amount,
  });

  if (plansSettings.subscriptionSendsEmail) {
    await sendOrderEmails(supabase, newOrder.id, organizationId);
  }

  console.log(`[Webhook] Subscription renewal order created: ${newOrder.id}`);
  return true;
}

/**
 * 請求書支払い成功時の処理（テナント自身のサブスク）
 */
async function handleInvoicePaymentSucceeded(
  supabase: SupabaseAdmin,
  invoice: Stripe.Invoice
) {
  if (!invoice.subscription) return;

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('stripe_subscription_id', invoice.subscription)
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
 * 顧客サブスク決済の orders レコードを冪等に確保する。
 *
 * - 同一 stripeSubscriptionId の orders が既にあれば何もしない（重複防止）
 * - テナント設定 subscriptionCreatesOrder が false なら何もしない
 * - 設定 subscriptionSendsEmail が true なら作成後にメール送信
 *
 * checkout.session.completed と customer.subscription.updated の両方から
 * 安全に呼び出せるよう、必ず冪等であることを担保する。
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
  }
): Promise<{ orderId: string | null; created: boolean }> {
  const {
    organizationId,
    customerId,
    customerName,
    customerEmail,
    planId,
    stripeSubscriptionId,
  } = args;

  // 既存 order があれば何もしない（冪等性）
  // notes に stripeSubscriptionId を埋め込むことでフィルタしている
  const { data: existingOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .ilike('notes', `%${stripeSubscriptionId}%`)
    .limit(1);

  if (existingOrders && existingOrders.length > 0) {
    return { orderId: existingOrders[0].id, created: false };
  }

  // テナント設定を確認
  const { data: orgData } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  const plansSettings = readPlansSettings(orgData?.settings as Record<string, unknown> | null);
  if (!plansSettings.subscriptionCreatesOrder) {
    return { orderId: null, created: false };
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
      // 後段で stripeSubscriptionId 検索できるよう必ずIDを含める
      notes: `サブスクリプション: ${planName} (${stripeSubscriptionId})`,
      stripe_payment_intent_id: null,
    })
    .select('id')
    .single();

  if (orderError || !newOrder) {
    console.error('[Webhook] Failed to create subscription order:', orderError);
    return { orderId: null, created: false };
  }

  console.log(`[Webhook] Subscription order created (fallback): ${newOrder.id}`);

  await supabase.from('order_items').insert({
    order_id: newOrder.id,
    product_id: null,
    variant_id: null,
    product_name: planName,
    variant_name: null,
    sku: null,
    quantity: 1,
    unit_price: amount,
    total_price: amount,
  });

  if (plansSettings.subscriptionSendsEmail) {
    await sendOrderEmails(supabase, newOrder.id, organizationId);
  }

  return { orderId: newOrder.id, created: true };
}

/**
 * エンドユーザー向けサブスクリプション Checkout 完了時の処理
 * customers.custom_fields.subscription を更新する。
 * 組織設定に応じて orders への記録・確認メール送信も行う。
 */
async function handleCustomerSubscriptionCheckoutComplete(
  supabase: SupabaseAdmin,
  session: Stripe.Checkout.Session
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

  const now = new Date().toISOString();
  const subscription = {
    planId,
    stripeSubscriptionId: session.subscription as string,
    stripeCustomerId: session.customer as string,
    status: 'active',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    startedAt: now,
    updatedAt: now,
  };

  await supabase
    .from('customers')
    .update({
      status: existing?.status === 'suspended' ? 'suspended' : 'active',
      custom_fields: { ...currentCustomFields, subscription },
      updated_at: now,
    })
    .eq('id', customerId)
    .eq('organization_id', organizationId);

  // 共通ヘルパーで冪等に orders を確保（重複作成しない）
  await ensureSubscriptionOrder(supabase, {
    organizationId,
    customerId,
    customerName: (existing?.name as string | null) || '',
    customerEmail: (existing?.email as string | null) || '',
    planId,
    stripeSubscriptionId: session.subscription as string,
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
  subscription: Stripe.Subscription
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
  const updatedSub = {
    ...currentSub,
    planId: planId ?? currentSub.planId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    status: nextStatus,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    startedAt: currentSub.startedAt ?? now,
    updatedAt: now,
  };

  await supabase
    .from('customers')
    .update({
      custom_fields: { ...currentCustomFields, subscription: updatedSub },
      updated_at: now,
    })
    .eq('id', customerId)
    .eq('organization_id', organizationId);

  // ── 防御 2: active/trialing になった時点で orders を確保 ──
  // checkout.session.completed が失敗 or 未着のケースに備えて、ここでも orders を作る。
  if (nextStatus === 'active' || nextStatus === 'trialing') {
    await ensureSubscriptionOrder(supabase, {
      organizationId,
      customerId,
      customerName: (existing?.name as string | null) || '',
      customerEmail: (existing?.email as string | null) || '',
      planId: (planId ?? currentSub.planId) as string | undefined,
      stripeSubscriptionId: subscription.id,
    });
  }
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
      custom_fields: { ...currentCustomFields, subscription: updatedSub },
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



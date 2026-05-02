import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendOrderEmails } from '@/lib/order-emails';
import { readPlansSettings } from '@/lib/customer-subscription-plans';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = SupabaseClient<any, 'public', any>;

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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
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

  // Webhook シークレットが設定されている場合は署名を検証
  if (webhookSecret) {
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
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
        await handleInvoicePaymentSucceeded(supabase, invoice);
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
 * 請求書支払い成功時の処理
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

  // 組織設定を確認して orders 記録・メール送信を条件実行
  const { data: orgData } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  const plansSettings = readPlansSettings(orgData?.settings as Record<string, unknown> | null);

  if (plansSettings.subscriptionCreatesOrder || plansSettings.subscriptionSendsEmail) {
    // プラン情報を取得して金額を特定
    const plan = plansSettings.plans.find((p) => p.id === planId);
    const amount = plan?.amount ?? (session.amount_total ?? 0);
    const planName = plan?.name ?? 'サブスクリプション';

    const customerName = (existing?.name as string | null) || '';
    const customerEmail = (existing?.email as string | null) || '';

    let orderId: string | null = null;

    if (plansSettings.subscriptionCreatesOrder) {
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
          notes: `サブスクリプション: ${planName}`,
          stripe_payment_intent_id: null,
        })
        .select('id')
        .single();

      if (orderError) {
        console.error('[Webhook] Failed to create subscription order:', orderError);
      } else {
        orderId = newOrder?.id ?? null;
        console.log(`[Webhook] Subscription order created: ${orderId}`);

        // order_items にプランを1行追加
        if (orderId) {
          await supabase.from('order_items').insert({
            order_id: orderId,
            product_id: null,
            variant_id: null,
            product_name: planName,
            variant_name: null,
            sku: null,
            quantity: 1,
            unit_price: amount,
            total_price: amount,
          });
        }
      }
    }

    if (plansSettings.subscriptionSendsEmail && orderId) {
      await sendOrderEmails(supabase, orderId, organizationId);
    }
  }
}

/**
 * 顧客向けサブスクリプションが更新された場合の処理
 * （customer.subscription.created / customer.subscription.updated）
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
    planId: planId ?? currentSub.planId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    status: subscription.status,
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



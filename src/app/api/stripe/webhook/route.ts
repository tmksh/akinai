import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { sendEmail } from '@/lib/email';
import { buildOrderConfirmationEmail, buildNewOrderNotificationEmail, buildAgentOrderNotificationEmail, type OrderEmailData, type AgentOrderEmailData } from '@/lib/email-templates/order';

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
          await handleSubscriptionCheckoutComplete(supabase, session);
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
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
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

/**
 * 注文確認メール（顧客）+ 新規注文通知（管理者）を送信
 */
async function sendOrderEmails(
  supabase: SupabaseAdmin,
  orderId: string,
  organizationId: string | null
) {
  try {
    // 注文情報を取得
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) return;

    // 注文明細を取得
    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, variant_name, quantity, unit_price, total_price')
      .eq('order_id', orderId);

    if (!items) return;

    // 組織情報を取得
    const orgId = organizationId || order.organization_id;
    const { data: org } = await supabase
      .from('organizations')
      .select('name, email, mail_from_address, mail_domain_verified')
      .eq('id', orgId)
      .single();

    const shopName = org?.name || 'ショップ';

    // カスタムテンプレート設定を取得
    const { data: orgWithTemplate } = await supabase
      .from('organizations')
      .select('email_templates')
      .eq('id', orgId)
      .single();
    const customTemplates = (orgWithTemplate?.email_templates as Record<string, unknown>) || {};
    const confirmCustom = (customTemplates.order_confirmation as Record<string, unknown>) || {};
    const notifyCustom = (customTemplates.order_notification as Record<string, unknown>) || {};

    const addr = (order.shipping_address as Record<string, string | null>) || {};

    const emailData: OrderEmailData = {
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      items: items.map(i => ({
        productName: i.product_name,
        variantName: i.variant_name || undefined,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        totalPrice: i.total_price,
      })),
      subtotal: order.subtotal,
      shippingFee: order.shipping_cost || 0,
      tax: order.tax || 0,
      total: order.total,
      paymentMethod: order.payment_method || 'credit_card',
      shippingAddress: {
        postalCode: addr.postalCode || undefined,
        prefecture: addr.prefecture || undefined,
        city: addr.city || undefined,
        line1: addr.line1 || undefined,
        line2: addr.line2 || null,
        phone: addr.phone || undefined,
      },
      shopName,
    };

    // 顧客へ注文確認メール（enabled が false でなければ送信）
    if (confirmCustom.enabled !== false) {
      const { subject: customerSubject, html: customerHtml } = buildOrderConfirmationEmail(
        emailData,
        confirmCustom as Parameters<typeof buildOrderConfirmationEmail>[1]
      );
      await sendEmail({
        to: order.customer_email,
        subject: customerSubject,
        html: customerHtml,
        organizationId: orgId,
      });
      console.log(`[Email] Order confirmation sent to ${order.customer_email}`);
    }

    // 管理者へ新規注文通知（enabled が false でなければ送信）
    if (notifyCustom.enabled !== false) {
      const adminEmail =
        (notifyCustom.adminEmail as string | undefined) ||
        org?.email ||
        org?.mail_from_address;
      if (adminEmail) {
        const { subject: adminSubject, html: adminHtml } = buildNewOrderNotificationEmail(
          emailData,
          notifyCustom as Parameters<typeof buildNewOrderNotificationEmail>[1]
        );
        await sendEmail({
          to: adminEmail,
          subject: adminSubject,
          html: adminHtml,
          organizationId: orgId,
        });
        console.log(`[Email] New order notification sent to ${adminEmail}`);
      }
    }

    // 代理店向け通知（注文に agent_id がある場合）
    const agentCustom = (customTemplates.agent_notification as Record<string, unknown>) || {};
    if (agentCustom.enabled !== false && order.agent_id) {
      const { data: agent } = await supabase
        .from('agents')
        .select('email, name, company, code, commission_rate')
        .eq('id', order.agent_id)
        .single();

      if (agent?.email) {
        const agentEmailData: AgentOrderEmailData = {
          orderNumber: order.order_number,
          customerName: order.customer_name,
          agentCode: agent.code,
          agentName: agent.name,
          agentCompany: agent.company || '',
          items: items.map(i => ({
            productName: i.product_name,
            variantName: i.variant_name || undefined,
            quantity: i.quantity,
            totalPrice: i.total_price,
          })),
          subtotal: order.subtotal,
          total: order.total,
          commissionRate: Number(agent.commission_rate),
          commissionAmount: order.agent_commission_amount || 0,
          shopName,
        };
        const { subject: agentSubject, html: agentHtml } = buildAgentOrderNotificationEmail(
          agentEmailData,
          agentCustom as Parameters<typeof buildAgentOrderNotificationEmail>[1]
        );
        await sendEmail({
          to: agent.email,
          subject: agentSubject,
          html: agentHtml,
          organizationId: orgId,
        });
        console.log(`[Email] Agent notification sent to ${agent.email}`);
      }
    }
  } catch (err) {
    // メール送信失敗は注文処理に影響させない
    console.error('[Email] Failed to send order emails:', err);
  }
}

/**
 * /api/v1/customer/subscription
 *
 * エンドユーザー（顧客）向けサブスクリプション操作。
 * - Authorization: Bearer <customer_jwt>
 *
 * POST   : Checkout Session を作成（{ planId, successUrl?, cancelUrl? }）
 * GET    : 自分の契約状態を取得
 * PATCH  : プラン変更（{ planId, scheduleAtPeriodEnd? }）
 *           scheduleAtPeriodEnd=false（デフォルト）: 即時切り替え・日割り計算あり
 *           scheduleAtPeriodEnd=true: 期間終了時に切り替え（ダウングレード予約）
 * DELETE : 期間終了時に解約（cancel_at_period_end）
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { verifyCustomerToken } from '@/lib/api/customer-auth';
import { corsHeaders, handleOptions } from '@/lib/api/auth';
import {
  readPlansSettings,
  readSubscriptionInfo,
} from '@/lib/customer-subscription-plans';
import { sendOrderEmails } from '@/lib/order-emails';
import { getStripeConfig } from '@/lib/stripe-client';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function jsonError(message: string, status: number) {
  const res = NextResponse.json({ error: message }, { status });
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function jsonSuccess<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status });
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

// =====================================================
// POST — Checkout Session 作成
// =====================================================
export async function POST(request: NextRequest) {
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  let body: { planId?: string; successUrl?: string; cancelUrl?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  if (!body.planId) return jsonError('planId is required', 400);

  const supabase = getAdminSupabase();

  const { data: org } = await supabase
    .from('organizations')
    .select('id, settings, stripe_account_id, stripe_test_mode, stripe_test_account_id, frontend_url')
    .eq('id', verify.payload.org)
    .single();

  if (!org) return jsonError('Organization not found', 404);

  let stripeConfig;
  try {
    stripeConfig = getStripeConfig(org);
  } catch {
    return jsonError('Stripe is not configured', 500);
  }
  const { stripe, accountId } = stripeConfig;
  if (!accountId) return jsonError('Stripe is not connected', 400);

  const plansSettings = readPlansSettings(org.settings as Record<string, unknown> | null);
  if (!plansSettings.enabled) return jsonError('Customer subscriptions are disabled', 400);

  const plan = plansSettings.plans.find((p) => p.id === body.planId);
  if (!plan) return jsonError('Plan not found', 404);
  if (!plan.isActive) return jsonError('Plan is not available', 400);

  // 顧客取得
  const { data: customer } = await supabase
    .from('customers')
    .select('id, email, name, role, custom_fields')
    .eq('id', verify.payload.sub)
    .eq('organization_id', verify.payload.org)
    .single();

  if (!customer) return jsonError('Customer not found', 404);

  // role が一致するプランしか購入させない
  if (customer.role !== plan.targetRole) {
    return jsonError('Plan is not available for your account type', 403);
  }

  // 既存契約があり active/trialing ならエラー
  const existingSub = readSubscriptionInfo(customer.custom_fields as Record<string, unknown> | null);
  if (existingSub && (existingSub.status === 'active' || existingSub.status === 'trialing')) {
    return jsonError('You already have an active subscription', 409);
  }

  let stripeCustomerId = existingSub?.stripeCustomerId;
  if (!stripeCustomerId) {
    try {
      const stripeCustomer = await stripe.customers.create(
        {
          email: customer.email,
          name: customer.name,
          metadata: {
            akinai_customer_id: customer.id,
            akinai_organization_id: verify.payload.org,
          },
        },
        { stripeAccount: accountId }
      );
      stripeCustomerId = stripeCustomer.id;
    } catch (err) {
      console.error('Failed to create Stripe customer:', err);
      return jsonError('Failed to create Stripe customer', 500);
    }
  }

  const baseUrl =
    body.successUrl || body.cancelUrl
      ? null
      : org.frontend_url || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const successUrl = body.successUrl || `${baseUrl}/mypage?subscription=success`;
  const cancelUrl = body.cancelUrl || `${baseUrl}/mypage?subscription=canceled`;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          organization_id: verify.payload.org,
          customer_id: customer.id,
          plan_id: plan.id,
        },
        subscription_data: {
          metadata: {
            akinai_organization_id: verify.payload.org,
            akinai_customer_id: customer.id,
            akinai_plan_id: plan.id,
          },
        },
      },
      { stripeAccount: accountId }
    );
  } catch (err) {
    console.error('Failed to create checkout session:', err);
    return jsonError('Failed to create checkout session', 500);
  }

  return jsonSuccess({ url: session.url, sessionId: session.id });
}

// =====================================================
// GET — 自分の契約状態取得
// =====================================================
export async function GET(request: NextRequest) {
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  const supabase = getAdminSupabase();
  const { data: customer } = await supabase
    .from('customers')
    .select('custom_fields')
    .eq('id', verify.payload.sub)
    .eq('organization_id', verify.payload.org)
    .single();

  if (!customer) return jsonError('Customer not found', 404);

  const sub = readSubscriptionInfo(customer.custom_fields as Record<string, unknown> | null);
  if (!sub) return jsonSuccess({ subscription: null });

  // プラン情報も付与して返す
  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', verify.payload.org)
    .single();

  const plansSettings = readPlansSettings(org?.settings as Record<string, unknown> | null);
  const plan = plansSettings.plans.find((p) => p.id === sub.planId);

  const scheduledPlanId = (sub as unknown as Record<string, unknown>).scheduledPlanId as string | null | undefined;
  const scheduledPlan = scheduledPlanId
    ? plansSettings.plans.find((p) => p.id === scheduledPlanId)
    : null;

  return jsonSuccess({
    subscription: sub,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          amount: plan.amount,
          currency: plan.currency,
          interval: plan.interval,
          features: plan.features,
          targetRole: plan.targetRole,
        }
      : null,
    scheduledPlan: scheduledPlan
      ? {
          id: scheduledPlan.id,
          name: scheduledPlan.name,
          description: scheduledPlan.description,
          amount: scheduledPlan.amount,
          currency: scheduledPlan.currency,
          interval: scheduledPlan.interval,
          features: scheduledPlan.features,
          targetRole: scheduledPlan.targetRole,
          scheduledAt: (sub as unknown as Record<string, unknown>).scheduledAt as string | null,
        }
      : null,
  });
}

// =====================================================
// PATCH — プラン変更（即時切り替え・日割り精算）
// =====================================================
export async function PATCH(request: NextRequest) {
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  let body: { planId?: string; scheduleAtPeriodEnd?: boolean };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  if (!body.planId) return jsonError('planId is required', 400);
  const scheduleAtPeriodEnd = body.scheduleAtPeriodEnd === true;

  const supabase = getAdminSupabase();

  const { data: org } = await supabase
    .from('organizations')
    .select('id, settings, stripe_account_id, stripe_test_mode, stripe_test_account_id')
    .eq('id', verify.payload.org)
    .single();

  if (!org) return jsonError('Organization not found', 404);

  let stripeConfig;
  try {
    stripeConfig = getStripeConfig(org);
  } catch {
    return jsonError('Stripe is not configured', 500);
  }
  const { stripe, accountId } = stripeConfig;
  if (!accountId) return jsonError('Stripe is not connected', 400);

  const plansSettings = readPlansSettings(org.settings as Record<string, unknown> | null);
  if (!plansSettings.enabled) return jsonError('Customer subscriptions are disabled', 400);

  const newPlan = plansSettings.plans.find((p) => p.id === body.planId);
  if (!newPlan) return jsonError('Plan not found', 404);
  if (!newPlan.isActive) return jsonError('Plan is not available', 400);

  // 顧客取得
  const { data: customer } = await supabase
    .from('customers')
    .select('id, email, name, role, custom_fields')
    .eq('id', verify.payload.sub)
    .eq('organization_id', verify.payload.org)
    .single();

  if (!customer) return jsonError('Customer not found', 404);

  // role が新プランの targetRole と一致するか確認
  if (customer.role !== newPlan.targetRole) {
    return jsonError('Plan is not available for your account type', 403);
  }

  // 現在の契約を確認
  const existingSub = readSubscriptionInfo(customer.custom_fields as Record<string, unknown> | null);
  if (!existingSub?.stripeSubscriptionId) {
    return jsonError('No active subscription to change', 404);
  }
  if (existingSub.status !== 'active' && existingSub.status !== 'trialing') {
    return jsonError('Subscription is not active', 409);
  }
  if (existingSub.planId === body.planId) {
    return jsonError('Already on this plan', 409);
  }

  let stripeSub: Stripe.Subscription;
  try {
    stripeSub = await stripe.subscriptions.retrieve(
      existingSub.stripeSubscriptionId,
      { stripeAccount: accountId }
    );
  } catch (err) {
    console.error('Failed to retrieve subscription:', err);
    return jsonError('Failed to retrieve current subscription', 500);
  }

  const currentItemId = stripeSub.items.data[0]?.id;
  if (!currentItemId) return jsonError('Subscription item not found', 500);

  let updatedSub: Stripe.Subscription;
  try {
    if (scheduleAtPeriodEnd) {
      // 期間終了時に切り替え（ダウングレード予約）
      // proration_behavior: 'none' = 即時課金なし。次回更新時に新プランで請求される
      updatedSub = await stripe.subscriptions.update(
          existingSub.stripeSubscriptionId,
          {
            items: [{ id: currentItemId, price: newPlan.stripePriceId }],
            proration_behavior: 'none',
            metadata: {
              akinai_organization_id: verify.payload.org,
              akinai_customer_id: customer.id,
              akinai_plan_id: newPlan.id,
            },
          },
          { stripeAccount: accountId }
        );
      } else {
        updatedSub = await stripe.subscriptions.update(
          existingSub.stripeSubscriptionId,
          {
            items: [{ id: currentItemId, price: newPlan.stripePriceId }],
            proration_behavior: 'always_invoice',
            payment_behavior: 'error_if_incomplete',
            metadata: {
              akinai_organization_id: verify.payload.org,
              akinai_customer_id: customer.id,
              akinai_plan_id: newPlan.id,
            },
          },
          { stripeAccount: accountId }
        );
    }
  } catch (err) {
    console.error('Failed to update subscription:', err);
    if (err instanceof Stripe.errors.StripeError && err.type === 'StripeCardError') {
      return jsonError(`Payment failed: ${err.message}`, 402);
    }
    const msg = err instanceof Error ? err.message : 'Stripe plan change failed';
    return jsonError(`Failed to change plan: ${msg}`, 500);
  }

  // Akinai 顧客の custom_fields を更新
  const now = new Date().toISOString();
  const currentCustomFields = (customer.custom_fields as Record<string, unknown>) || {};

  let updatedSubscription: Record<string, unknown>;
  let planFieldUpdate: Record<string, unknown> = {};

  if (scheduleAtPeriodEnd) {
    // ダウングレード予約: 現在の planId は変えず、scheduledPlanId に次プランを記録
    updatedSubscription = {
      ...existingSub,
      scheduledPlanId: newPlan.id,
      scheduledPlanName: newPlan.name,
      scheduledAt: now,
      updatedAt: now,
    };
    // custom_fields.plan は現在のプランのまま（変更しない）
  } else {
    // 即時切り替え: planId を更新し、予約情報があればクリア
    updatedSubscription = {
      ...existingSub,
      planId: newPlan.id,
      scheduledPlanId: null,
      scheduledPlanName: null,
      scheduledAt: null,
      status: updatedSub.status,
      updatedAt: now,
    };
    planFieldUpdate = { plan: newPlan.name };
  }

  await supabase
    .from('customers')
    .update({
      custom_fields: {
        ...currentCustomFields,
        subscription: updatedSubscription,
        ...planFieldUpdate,
      },
      updated_at: now,
    })
    .eq('id', customer.id)
    .eq('organization_id', verify.payload.org);

  console.log(
    `[subscription PATCH] plan changed: customer=${customer.id}, from=${existingSub.planId}, to=${newPlan.id}`
  );

  // 最新インボイスの状態を取得し、支払い済みなら注文を作成する
  let latestInvoiceStatus: string | null = null;
  if (updatedSub.latest_invoice) {
    const invoiceId = typeof updatedSub.latest_invoice === 'string'
      ? updatedSub.latest_invoice
      : updatedSub.latest_invoice.id;
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId, { stripeAccount: accountId });
      latestInvoiceStatus = invoice.status;

      // 支払い成功 & subscriptionCreatesOrder が有効なら注文を作成
      if (invoice.status === 'paid' && plansSettings.subscriptionCreatesOrder) {
        // 冪等チェック: 同じインボイスの注文が既にあればスキップ
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('organization_id', verify.payload.org)
          .ilike('notes', `%${invoiceId}%`)
          .limit(1);

        if (!existingOrder || existingOrder.length === 0) {
          const amount = invoice.amount_paid ?? newPlan.amount ?? 0;
          const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 9000) + 1000}`;

          const { data: newOrder } = await supabase
            .from('orders')
            .insert({
              organization_id: verify.payload.org,
              order_number: orderNumber,
              customer_id: customer.id,
              customer_name: (customer.name as string) || '',
              customer_email: (customer.email as string) || '',
              subtotal: amount,
              shipping_cost: 0,
              tax: 0,
              total: amount,
              status: 'confirmed',
              payment_status: 'paid',
              payment_method: 'subscription',
              shipping_address: {},
              notes: `サブスクリプションアップグレード: ${newPlan.name} (${existingSub.stripeSubscriptionId} / ${invoiceId})`,
              stripe_payment_intent_id: null,
            })
            .select('id')
            .single();

          if (newOrder) {
            await supabase.from('order_items').insert({
              order_id: newOrder.id,
              product_id: null,
              variant_id: null,
              product_name: newPlan.name,
              variant_name: '',
              sku: '',
              quantity: 1,
              unit_price: amount,
              total_price: amount,
            });

            // 顧客統計を再集計
            const { data: allOrders } = await supabase
              .from('orders')
              .select('total, payment_status')
              .eq('organization_id', verify.payload.org)
              .eq('customer_id', customer.id);
            const validOrders = (allOrders ?? []).filter(
              (o) => o.payment_status !== 'failed' && o.payment_status !== 'refunded'
            );
            await supabase
              .from('customers')
              .update({
                total_orders: validOrders.length,
                total_spent: validOrders.reduce((s, o) => s + Number(o.total), 0),
                updated_at: new Date().toISOString(),
              })
              .eq('id', customer.id)
              .eq('organization_id', verify.payload.org);

            if (plansSettings.subscriptionSendsEmail) {
              await sendOrderEmails(supabase, newOrder.id, verify.payload.org);
            }

            console.log(`[subscription PATCH] upgrade order created: ${newOrder.id}`);
          }
        }
      }
    } catch (err) {
      // インボイス取得・注文作成失敗はログのみ（本体のレスポンスには影響させない）
      console.error('[subscription PATCH] invoice/order handling failed:', err);
    }
  }

  return jsonSuccess({
    success: true,
    planId: newPlan.id,
    planName: newPlan.name,
    subscriptionId: existingSub.stripeSubscriptionId,
    status: updatedSub.status,
    scheduledAtPeriodEnd: scheduleAtPeriodEnd,
    latestInvoiceStatus,
  });
}

// =====================================================
// DELETE — 解約予約（period end）
// =====================================================
export async function DELETE(request: NextRequest) {
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  const supabase = getAdminSupabase();
  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_account_id, stripe_test_mode, stripe_test_account_id')
    .eq('id', verify.payload.org)
    .single();
  if (!org) return jsonError('Organization not found', 404);

  let stripeConfig;
  try {
    stripeConfig = getStripeConfig(org);
  } catch {
    return jsonError('Stripe is not configured', 500);
  }
  const { stripe, accountId } = stripeConfig;
  if (!accountId) return jsonError('Stripe is not connected', 400);

  const { data: customer } = await supabase
    .from('customers')
    .select('custom_fields')
    .eq('id', verify.payload.sub)
    .eq('organization_id', verify.payload.org)
    .single();
  if (!customer) return jsonError('Customer not found', 404);

  const sub = readSubscriptionInfo(customer.custom_fields as Record<string, unknown> | null);
  if (!sub?.stripeSubscriptionId) {
    return jsonError('No active subscription', 404);
  }

  try {
    await stripe.subscriptions.update(
      sub.stripeSubscriptionId,
      { cancel_at_period_end: true },
      { stripeAccount: accountId }
    );
  } catch (err) {
    console.error('Failed to cancel subscription:', err);
    return jsonError('Failed to cancel subscription', 500);
  }

  return jsonSuccess({ success: true, cancelAtPeriodEnd: true });
}

export async function OPTIONS() {
  return handleOptions();
}

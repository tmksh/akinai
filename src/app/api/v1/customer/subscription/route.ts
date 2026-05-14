/**
 * /api/v1/customer/subscription
 *
 * エンドユーザー（顧客）向けサブスクリプション操作。
 * - Authorization: Bearer <customer_jwt>
 *
 * POST   : Checkout Session を作成（{ planId, successUrl?, cancelUrl? }）
 * GET    : 自分の契約状態を取得
 * PATCH  : プラン変更（{ planId }）— Stripe 上で即時切り替え・日割り計算あり
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

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return jsonError('Stripe is not configured', 500);

  let body: { planId?: string; successUrl?: string; cancelUrl?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  if (!body.planId) return jsonError('planId is required', 400);

  const supabase = getAdminSupabase();

  // 組織情報とプラン定義を取得
  const { data: org } = await supabase
    .from('organizations')
    .select('id, settings, stripe_account_id, frontend_url')
    .eq('id', verify.payload.org)
    .single();

  if (!org) return jsonError('Organization not found', 404);
  if (!org.stripe_account_id) return jsonError('Stripe is not connected', 400);

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

  const stripe = new Stripe(stripeSecretKey);

  // Stripe Customer を取得 or 作成（Connected Account 上）
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
        { stripeAccount: org.stripe_account_id }
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
      { stripeAccount: org.stripe_account_id }
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
  });
}

// =====================================================
// PATCH — プラン変更（即時切り替え・日割り精算）
// =====================================================
export async function PATCH(request: NextRequest) {
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return jsonError('Stripe is not configured', 500);

  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  if (!body.planId) return jsonError('planId is required', 400);

  const supabase = getAdminSupabase();

  // 組織情報とプラン定義を取得
  const { data: org } = await supabase
    .from('organizations')
    .select('id, settings, stripe_account_id')
    .eq('id', verify.payload.org)
    .single();

  if (!org) return jsonError('Organization not found', 404);
  if (!org.stripe_account_id) return jsonError('Stripe is not connected', 400);

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

  const stripe = new Stripe(stripeSecretKey);

  // 現在の Stripe Subscription を取得して item ID を確認
  let stripeSub: Stripe.Subscription;
  try {
    stripeSub = await stripe.subscriptions.retrieve(
      existingSub.stripeSubscriptionId,
      { stripeAccount: org.stripe_account_id }
    );
  } catch (err) {
    console.error('Failed to retrieve subscription:', err);
    return jsonError('Failed to retrieve current subscription', 500);
  }

  const currentItemId = stripeSub.items.data[0]?.id;
  if (!currentItemId) return jsonError('Subscription item not found', 500);

  // Stripe でプランを即時変更（日割り計算あり）
  let updatedSub: Stripe.Subscription;
  try {
    updatedSub = await stripe.subscriptions.update(
      existingSub.stripeSubscriptionId,
      {
        items: [{ id: currentItemId, price: newPlan.stripePriceId }],
        proration_behavior: 'create_prorations',
        metadata: {
          akinai_organization_id: verify.payload.org,
          akinai_customer_id: customer.id,
          akinai_plan_id: newPlan.id,
        },
      },
      { stripeAccount: org.stripe_account_id }
    );
  } catch (err) {
    console.error('Failed to update subscription:', err);
    const msg = err instanceof Error ? err.message : 'Stripe plan change failed';
    return jsonError(`Failed to change plan: ${msg}`, 500);
  }

  // Akinai 顧客の custom_fields を新プランで更新
  const now = new Date().toISOString();
  const currentCustomFields = (customer.custom_fields as Record<string, unknown>) || {};
  const updatedSubscription = {
    ...existingSub,
    planId: newPlan.id,
    status: updatedSub.status,
    updatedAt: now,
  };

  await supabase
    .from('customers')
    .update({
      custom_fields: {
        ...currentCustomFields,
        subscription: updatedSubscription,
        plan: newPlan.name,
      },
      updated_at: now,
    })
    .eq('id', customer.id)
    .eq('organization_id', verify.payload.org);

  console.log(
    `[subscription PATCH] plan changed: customer=${customer.id}, from=${existingSub.planId}, to=${newPlan.id}`
  );

  return jsonSuccess({
    success: true,
    planId: newPlan.id,
    planName: newPlan.name,
    subscriptionId: existingSub.stripeSubscriptionId,
    status: updatedSub.status,
  });
}

// =====================================================
// DELETE — 解約予約（period end）
// =====================================================
export async function DELETE(request: NextRequest) {
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return jsonError('Stripe is not configured', 500);

  const supabase = getAdminSupabase();
  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', verify.payload.org)
    .single();
  if (!org?.stripe_account_id) return jsonError('Stripe is not connected', 400);

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

  const stripe = new Stripe(stripeSecretKey);
  try {
    await stripe.subscriptions.update(
      sub.stripeSubscriptionId,
      { cancel_at_period_end: true },
      { stripeAccount: org.stripe_account_id }
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

/**
 * /api/v1/stripe/subscription-checkout
 *
 * 外部サイト（自社サイトなど）から AKINAI_API_KEY で呼び出す
 * サブスクリプション Checkout Session 発行エンドポイント。
 *
 * POST: {
 *   planId:     string           // サブスクリプションプランID（Plan ID）
 *   customerId: string           // Akinai 顧客ID
 *   successUrl: string
 *   cancelUrl:  string
 *   metadata?:  Record<string, string>  // 任意（Stripe metadata に追記される）
 * }
 * → { url, sessionId }
 *
 * 決済完了後は customer.subscription.updated webhook が
 * 顧客の契約状態を更新し、必要に応じてメール送信が行われる。
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { validateApiKey, corsHeaders, handleOptions } from '@/lib/api/auth';
import {
  readPlansSettings,
  readSubscriptionInfo,
} from '@/lib/customer-subscription-plans';
import { getStripeConfig } from '@/lib/stripe-client';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function jsonError(message: string, status: number) {
  const res = NextResponse.json({ error: message }, { status });
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function jsonSuccess<T>(data: T) {
  const res = NextResponse.json(data, { status: 200 });
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

/** metadata の値をすべて文字列に変換（Stripe の制約） */
function sanitizeMetadata(
  raw: Record<string, unknown> | undefined
): Record<string, string> {
  if (!raw) return {};
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => [k, String(v)])
  );
}

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) return jsonError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  const organizationId = auth.organizationId!;

  let body: {
    planId?: string;
    customerId?: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  if (!body.planId) return jsonError('planId is required', 400);
  if (!body.customerId) return jsonError('customerId is required', 400);
  if (!body.successUrl) return jsonError('successUrl is required', 400);
  if (!body.cancelUrl) return jsonError('cancelUrl is required', 400);

  const supabase = getAdminSupabase();

  // 組織情報を取得
  const { data: org } = await supabase
    .from('organizations')
    .select('id, settings, stripe_account_id, stripe_test_mode, stripe_test_account_id')
    .eq('id', organizationId)
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

  // プラン設定を確認
  const plansSettings = readPlansSettings(org.settings as Record<string, unknown> | null);
  if (!plansSettings.enabled) return jsonError('Customer subscriptions are disabled', 400);

  const plan = plansSettings.plans.find((p) => p.id === body.planId);
  if (!plan) return jsonError('Plan not found', 404);
  if (!plan.isActive) return jsonError('Plan is not available', 400);

  // 顧客が同一テナントに属するか検証
  const { data: customer } = await supabase
    .from('customers')
    .select('id, email, name, role, custom_fields')
    .eq('id', body.customerId)
    .eq('organization_id', organizationId)
    .single();

  if (!customer) return jsonError('Customer not found', 404);

  if (customer.role !== plan.targetRole) {
    return jsonError('Plan is not available for this customer type', 403);
  }

  // 既に active / trialing な契約があればエラー
  const existingSub = readSubscriptionInfo(customer.custom_fields as Record<string, unknown> | null);
  if (existingSub && (existingSub.status === 'active' || existingSub.status === 'trialing')) {
    return jsonError('Customer already has an active subscription', 409);
  }

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
            akinai_organization_id: organizationId,
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

  const extraMetadata = sanitizeMetadata(body.metadata);
  const idempotencyKey = `sub-checkout-${organizationId}-${customer.id}-${plan.id}`;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: body.successUrl,
        cancel_url: body.cancelUrl,
        metadata: {
          organization_id: organizationId,
          customer_id: customer.id,
          plan_id: plan.id,
          ...extraMetadata,
        },
        subscription_data: {
          metadata: {
            akinai_organization_id: organizationId,
            akinai_customer_id: customer.id,
            akinai_plan_id: plan.id,
          },
        },
      },
      { stripeAccount: accountId, idempotencyKey }
    );
  } catch (err) {
    console.error('Failed to create checkout session:', err);
    return jsonError('Failed to create checkout session', 500);
  }

  return jsonSuccess({ url: session.url, sessionId: session.id });
}

export async function OPTIONS() {
  return handleOptions();
}

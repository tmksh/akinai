/**
 * POST /api/v1/customer/billing-portal
 *
 * Stripe Customer Portal のセッションURLを発行する。
 * 顧客はこのURLにアクセスして、請求書確認・カード変更・解約などを自分で行える。
 *
 * - Authorization: Bearer <customer_jwt>
 * - Body: { returnUrl?: string }
 * - Returns: { url: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCustomerToken } from '@/lib/api/customer-auth';
import { corsHeaders, handleOptions } from '@/lib/api/auth';
import { readSubscriptionInfo } from '@/lib/customer-subscription-plans';
import { getStripeConfig } from '@/lib/stripe-client';

function jsonError(message: string, status: number) {
  const res = NextResponse.json({ error: message }, { status });
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function jsonSuccess<T>(data: T) {
  const res = NextResponse.json(data);
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function POST(request: NextRequest) {
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  let body: { returnUrl?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_account_id, stripe_test_mode, stripe_test_account_id, frontend_url')
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
  if (!sub?.stripeCustomerId) {
    return jsonError('No subscription found', 404);
  }

  const returnUrl =
    body.returnUrl ||
    `${org.frontend_url || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/mypage`;

  try {
    const portal = await stripe.billingPortal.sessions.create(
      {
        customer: sub.stripeCustomerId,
        return_url: returnUrl,
      },
      { stripeAccount: accountId }
    );
    return jsonSuccess({ url: portal.url });
  } catch (err) {
    console.error('Failed to create billing portal session:', err);
    return jsonError('Failed to create portal session', 500);
  }
}

export async function OPTIONS() {
  return handleOptions();
}

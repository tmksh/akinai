/**
 * POST /api/v1/auth/register-with-plan
 *
 * サプライヤー（またはバイヤー）を有料プランで登録する。
 * 顧客レコードを status: pending で作成し、Stripe Checkout Session を即時発行する。
 * 決済完了後は checkout.session.completed / customer.subscription.created webhook が
 * customers.status を pending → active に切り替える。
 *
 * Request body:
 * {
 *   // 顧客情報
 *   name:          string
 *   email:         string
 *   password:      string
 *   role?:         'personal' | 'buyer' | 'supplier'   // 後方互換（roles 未指定時）
 *   roles?:        CustomerRoleKey[]                   // 推奨（先頭がプライマリ）
 *   prefecture?:   string
 *   businessType?: string
 *   company?:      string
 *   phone?:        string
 *   referralCode?: string                  // 紹介コード（参照元コード）
 *   customFields?: Record<string, unknown> // customers.custom_fields に保存する任意フィールド
 *
 *   // Checkout 情報
 *   planId:            string              // CustomerSubscriptionPlan.id
 *   successUrl:        string
 *   cancelUrl:         string
 *   checkoutMetadata?: Record<string, string>  // Stripe metadata に追記
 * }
 *
 * Response:
 * {
 *   token:       string   // JWT（以降の API 呼び出しに使用）
 *   customer:    { id, name, email, role, roles, status, ... }
 *   checkoutUrl: string   // Stripe Checkout ページへのリダイレクト URL
 *   sessionId:   string   // Stripe Checkout Session ID
 * }
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';
import { validateApiKey, apiError, apiSuccess, handleOptions, corsHeaders } from '@/lib/api/auth';
import { signCustomerToken } from '@/lib/api/customer-auth';
import { readPlansSettings, isPlanApplicable } from '@/lib/customer-subscription-plans';
import { getStripeConfig } from '@/lib/stripe-client';
import { randomBytes } from 'crypto';

type CustomerRoleKey = 'personal' | 'buyer' | 'supplier';

interface RegisterWithPlanRequest {
  // 顧客情報
  name: string;
  email: string;
  password: string;
  role?: CustomerRoleKey;
  roles?: CustomerRoleKey[];
  prefecture?: string;
  businessType?: string;
  company?: string;
  phone?: string;
  referralCode?: string;
  /** customers.custom_fields に保存する任意フィールド（プラン選択時のフォーム入力など） */
  customFields?: Record<string, unknown>;

  // Checkout 情報
  planId: string;
  successUrl: string;
  cancelUrl: string;
  checkoutMetadata?: Record<string, string>;
}

/** 紹介コードを生成する（例: REF-A3X9K2） */
function generateReferralCode(): string {
  return 'REF-' + randomBytes(3).toString('hex').toUpperCase();
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
  if (!auth.success) return apiError(auth.error!, auth.status);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return apiError('Server configuration error', 500);
  }

  let body: RegisterWithPlanRequest;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  // ─── バリデーション ───
  if (!body.name?.trim()) return apiError('name is required', 400);
  if (!body.email?.trim()) return apiError('email is required', 400);
  if (!body.password || body.password.length < 6) {
    return apiError('password must be at least 6 characters', 400);
  }
  if (!body.planId) return apiError('planId is required', 400);
  if (!body.successUrl) return apiError('successUrl is required', 400);
  if (!body.cancelUrl) return apiError('cancelUrl is required', 400);

  const validRoles: CustomerRoleKey[] = ['personal', 'buyer', 'supplier'];
  if (body.role && !validRoles.includes(body.role)) {
    return apiError('role must be personal, buyer, or supplier', 400);
  }
  if (body.roles) {
    if (!Array.isArray(body.roles) || body.roles.length === 0) {
      return apiError('roles must be a non-empty array', 400);
    }
    if (body.roles.some((r) => !validRoles.includes(r))) {
      return apiError('each role must be personal, buyer, or supplier', 400);
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const organizationId = auth.organizationId!;

  // ─── 組織情報 + Stripe 設定を取得 ───
  const { data: org } = await supabase
    .from('organizations')
    .select('id, settings, features, stripe_account_id, stripe_test_mode, stripe_test_account_id')
    .eq('id', organizationId)
    .single();

  if (!org) return apiError('Organization not found', 404);

  let stripeConfig;
  try {
    stripeConfig = getStripeConfig(org);
  } catch {
    return apiError('Stripe is not configured', 500);
  }
  const { stripe, accountId } = stripeConfig as { stripe: Stripe; accountId: string | null };
  if (!accountId) return apiError('Stripe is not connected', 400);

  // ─── プラン検証 ───
  const plansSettings = readPlansSettings(org.settings as Record<string, unknown> | null);
  if (!plansSettings.enabled) return apiError('Customer subscriptions are disabled', 400);

  const plan = plansSettings.plans.find((p) => p.id === body.planId);
  if (!plan) return apiError('Plan not found', 400);
  if (!plan.isActive) return apiError('Plan is not available', 400);

  // ─── ロールとプランの適合チェック ───
  const roles: CustomerRoleKey[] = body.roles ?? (body.role ? [body.role] : ['personal']);
  const role = roles[0];

  if (!isPlanApplicable(plan, roles)) {
    return apiError('Plan is not available for the specified role', 403);
  }

  // ─── メールアドレス重複チェック ───
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', body.email.trim().toLowerCase())
    .maybeSingle();

  if (existing) return apiError('A customer with this email already exists', 409);

  // ─── 紹介コード生成（機能フラグが有効な場合） ───
  const orgFeatures = (org.features as Record<string, unknown>) || {};
  const isReferralEnabled = !!orgFeatures.referral_code;

  let newReferralCode: string | null = null;
  if (isReferralEnabled) {
    for (let i = 0; i < 5; i++) {
      const candidate = generateReferralCode();
      const { data: dup } = await supabase
        .from('customers')
        .select('id')
        .eq('referral_code', candidate)
        .maybeSingle();
      if (!dup) {
        newReferralCode = candidate;
        break;
      }
    }
  }

  // ─── 顧客を status: pending で作成 ───
  const passwordHash = await bcrypt.hash(body.password, 12);

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .insert({
      organization_id: organizationId,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      password_hash: passwordHash,
      role,
      roles,
      // 有料プラン登録は常に pending（決済完了後に webhook で active に昇格）
      status: 'pending',
      type: role === 'personal' ? 'individual' : 'business',
      phone: body.phone ?? null,
      company: body.company ?? null,
      prefecture: body.prefecture ?? null,
      business_type: body.businessType ?? null,
      custom_fields: body.customFields ?? null,
      email_verified: false,
      referral_code: newReferralCode,
      referred_by_code: body.referralCode ?? null,
    })
    .select('id, name, email, phone, company, type, role, roles, status, prefecture, business_type, custom_fields, tags, total_orders, total_spent, referral_code, created_at')
    .single();

  if (customerError || !customer) {
    console.error('register-with-plan: customer creation error:', customerError);
    return apiError('Failed to create customer', 500);
  }

  // ─── Stripe Customer を Connected Account 上に作成 ───
  let stripeCustomerId: string;
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
    console.error('register-with-plan: failed to create Stripe customer:', err);
    // 顧客レコードをロールバック
    await supabase.from('customers').delete().eq('id', customer.id);
    return apiError('Failed to create Stripe customer', 500);
  }

  // ─── Checkout Session を発行 ───
  const extraMetadata = sanitizeMetadata(body.checkoutMetadata);
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
    console.error('register-with-plan: failed to create checkout session:', err);
    // 顧客レコードをロールバック
    await supabase.from('customers').delete().eq('id', customer.id);
    return apiError('Failed to create checkout session', 500);
  }

  // ─── JWT 発行 ───
  const token = await signCustomerToken({
    sub: customer.id,
    org: organizationId,
    email: customer.email,
  });

  const response = apiSuccess(
    {
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        type: customer.type,
        role: customer.role,
        roles: (customer.roles as string[] | null) || [customer.role],
        status: customer.status,
        prefecture: customer.prefecture,
        businessType: customer.business_type,
        customFields: (customer.custom_fields as Record<string, unknown> | null) ?? {},
        tags: (customer.tags as string[] | null) || [],
        totalOrders: customer.total_orders,
        totalSpent: customer.total_spent,
        referralCode: customer.referral_code ?? null,
        createdAt: customer.created_at,
      },
      checkoutUrl: session.url,
      sessionId: session.id,
    },
    undefined,
    auth.rateLimit
  );

  Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export async function OPTIONS() {
  return handleOptions();
}

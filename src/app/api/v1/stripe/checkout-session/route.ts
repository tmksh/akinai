/**
 * POST /api/v1/stripe/checkout-session
 *
 * 【新フロー】アカウントを事前作成せず Stripe Checkout Session のみ発行する。
 * 決済完了後、checkout.session.completed Webhook でアカウントを作成・有効化する。
 *
 * 旧エンドポイント /api/v1/auth/register-with-plan との違い:
 *   旧: アカウント作成(pending) → Checkout Session 発行  ← 離脱時に残留アカウントが生じる
 *   新: Checkout Session 発行のみ → 決済完了後に Webhook でアカウント作成
 *
 * Request body:
 * {
 *   // 顧客情報（決済後に作成される）
 *   name:          string
 *   email:         string
 *   password:      string
 *   role?:         'personal' | 'buyer' | 'supplier'
 *   roles?:        CustomerRoleKey[]
 *   prefecture?:   string
 *   businessType?: string
 *   company?:      string
 *   phone?:        string
 *   referralCode?: string
 *   customFields?: Record<string, unknown>   // 500 chars 超は Stripe 側で切り捨て
 *
 *   // Checkout 情報
 *   planId:            string
 *   successUrl:        string   // {CHECKOUT_SESSION_ID} プレースホルダを含めること推奨
 *   cancelUrl:         string
 *   checkoutMetadata?: Record<string, string>
 * }
 *
 * Response:
 * {
 *   checkoutUrl: string   // Stripe Checkout ページへのリダイレクト URL
 *   sessionId:   string   // Stripe Checkout Session ID（ステータス確認用）
 * }
 *
 * 決済完了後のトークン取得:
 *   GET /api/v1/stripe/checkout-status?sessionId={CHECKOUT_SESSION_ID}
 *   → { status: 'complete', token, customer } または { status: 'pending' }
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';
import { validateApiKey, apiError, apiSuccess, handleOptions, corsHeaders } from '@/lib/api/auth';
import { readPlansSettings, isPlanApplicable } from '@/lib/customer-subscription-plans';
import { getStripeConfig } from '@/lib/stripe-client';

type CustomerRoleKey = 'personal' | 'buyer' | 'supplier';

interface CheckoutSessionRequest {
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
  customFields?: Record<string, unknown>;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  checkoutMetadata?: Record<string, string>;
}

/** metadata 値を Stripe の上限（500 chars）に収める */
function truncate(value: string | undefined | null, max = 490): string {
  if (!value) return '';
  return value.length > max ? value.slice(0, max) : value;
}

/** metadata の値をすべて文字列に変換 */
function sanitizeMetadata(raw: Record<string, unknown> | undefined): Record<string, string> {
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

  let body: CheckoutSessionRequest;
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

  // ─── パスワードをハッシュ化（Stripe metadata に保存） ───
  const passwordHash = await bcrypt.hash(body.password, 12);

  // ─── カスタムフィールドを JSON 文字列化（500 chars 上限対応） ───
  let customFieldsStr = '';
  if (body.customFields && Object.keys(body.customFields).length > 0) {
    const raw = JSON.stringify(body.customFields);
    customFieldsStr = raw.length <= 490 ? raw : '';
    if (!customFieldsStr) {
      console.warn('[checkout-session] customFields too large for Stripe metadata, will be omitted');
    }
  }

  // ─── Stripe Checkout Session を発行 ───
  const extraMetadata = sanitizeMetadata(body.checkoutMetadata);
  const idempotencyKey = `reg-checkout-${organizationId}-${body.email.trim().toLowerCase()}-${plan.id}`;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: body.successUrl,
        cancel_url: body.cancelUrl,
        customer_email: body.email.trim().toLowerCase(),
        metadata: {
          organization_id: organizationId,
          plan_id: plan.id,
          // 新フローの識別フラグ: webhook でこれを見てアカウント作成する
          reg_mode: 'create_on_complete',
          // 登録情報（webhook がアカウント作成に使用）
          reg_name: truncate(body.name.trim()),
          reg_email: truncate(body.email.trim().toLowerCase()),
          reg_password_hash: passwordHash,
          reg_role: role,
          reg_roles: JSON.stringify(roles),
          reg_phone: truncate(body.phone),
          reg_company: truncate(body.company),
          reg_prefecture: truncate(body.prefecture),
          reg_business_type: truncate(body.businessType),
          reg_referred_by: truncate(body.referralCode),
          ...(customFieldsStr ? { reg_custom_fields: customFieldsStr } : {}),
          ...extraMetadata,
        },
        subscription_data: {
          metadata: {
            akinai_organization_id: organizationId,
            akinai_plan_id: plan.id,
          },
        },
      },
      { stripeAccount: accountId, idempotencyKey }
    );
  } catch (err) {
    console.error('[checkout-session] failed to create checkout session:', err);
    return apiError('Failed to create checkout session', 500);
  }

  const response = apiSuccess(
    {
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

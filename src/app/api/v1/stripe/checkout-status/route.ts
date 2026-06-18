/**
 * GET /api/v1/stripe/checkout-status?sessionId=cs_xxx
 *
 * Stripe Checkout Session の完了状態とアカウント情報を返す。
 *
 * 新フロー（POST /api/v1/stripe/checkout-session）での決済完了後、
 * まちもぐ側から呼び出してトークンを取得するためのポーリングエンドポイント。
 *
 * フロー:
 *   1. まちもぐ → POST /api/v1/stripe/checkout-session → checkoutUrl 取得
 *   2. ユーザーが Stripe Checkout で決済完了
 *   3. ブラウザが successUrl?session_id={CHECKOUT_SESSION_ID} にリダイレクト
 *   4. まちもぐ → GET /api/v1/stripe/checkout-status?sessionId=cs_xxx を数秒おきにポーリング
 *   5. status=complete になったら token + customer を取得してログイン処理
 *
 * Response (pending):
 * {
 *   status: 'pending'
 * }
 *
 * Response (complete):
 * {
 *   status:   'complete'
 *   token:    string    // JWT（30日有効）
 *   customer: { id, name, email, role, roles, status, ... }
 * }
 *
 * Response (not_found / expired):
 * {
 *   status: 'not_found'
 * }
 */

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey, apiError, apiSuccess, handleOptions, corsHeaders } from '@/lib/api/auth';
import { signCustomerToken } from '@/lib/api/customer-auth';

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) return apiError(auth.error!, auth.status);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return apiError('Server configuration error', 500);
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return apiError('sessionId is required', 400);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const organizationId = auth.organizationId!;

  // webhook 処理後に custom_fields.checkout_session_id が付与された顧客を検索
  const { data: customer, error } = await supabase
    .from('customers')
    .select(
      'id, name, email, phone, company, type, role, roles, status, prefecture, business_type, custom_fields, tags, total_orders, total_spent, referral_code, created_at'
    )
    .eq('organization_id', organizationId)
    .eq('custom_fields->>checkout_session_id', sessionId)
    .maybeSingle();

  if (error) {
    console.error('[checkout-status] query error:', error);
    return apiError('Internal server error', 500);
  }

  // まだ webhook が処理されていない（または session が存在しない）
  if (!customer) {
    const response = apiSuccess({ status: 'pending' }, undefined, auth.rateLimit);
    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  // 顧客が見つかった → JWT を発行して返す
  const token = await signCustomerToken({
    sub: customer.id,
    org: organizationId,
    email: customer.email,
  });

  const response = apiSuccess(
    {
      status: 'complete',
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

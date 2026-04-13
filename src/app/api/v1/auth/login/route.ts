/**
 * POST /api/v1/auth/login
 *
 * エンドユーザー（顧客）のログイン
 * - Authorization: Bearer <shop_api_key>  ← ショップのAPIキー
 * - Body: { email, password }
 * - Returns: { token, customer }
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { validateApiKey, apiError, apiSuccess, handleOptions, corsHeaders } from '@/lib/api/auth';
import { signCustomerToken } from '@/lib/api/customer-auth';

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return apiError('Server configuration error', 500);
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  if (!body.email?.trim()) {
    return apiError('email is required', 400);
  }
  if (!body.password) {
    return apiError('password is required', 400);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, name, email, phone, company, type, role, status, prefecture, business_type, tags, total_orders, total_spent, password_hash, created_at')
    .eq('organization_id', auth.organizationId)
    .eq('email', body.email.trim().toLowerCase())
    .single();

  // 存在しないか password_hash が未設定の場合も同じエラーを返す（ユーザー列挙防止）
  if (error || !customer || !customer.password_hash) {
    return apiError('Invalid email or password', 401);
  }

  // suspended ユーザーはログイン不可
  if (customer.status === 'suspended') {
    return apiError('Your account has been suspended', 403);
  }

  const passwordMatch = await bcrypt.compare(body.password, customer.password_hash);
  if (!passwordMatch) {
    return apiError('Invalid email or password', 401);
  }

  // 最終ログイン日時を更新（非同期・エラーを無視）
  supabase
    .from('customers')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', customer.id)
    .then(() => {});

  const token = await signCustomerToken({
    sub: customer.id,
    org: auth.organizationId!,
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
        status: customer.status,
        prefecture: customer.prefecture,
        businessType: customer.business_type,
        tags: customer.tags || [],
        totalOrders: customer.total_orders,
        totalSpent: customer.total_spent,
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

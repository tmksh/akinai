/**
 * POST /api/v1/auth/register
 *
 * エンドユーザー（顧客）の新規会員登録
 * - Authorization: Bearer <shop_api_key>  ← ショップのAPIキー
 * - Body: { name, email, password, role?, status?, prefecture?, businessType?, metadata? }
 * - Returns: { token, customer }
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { validateApiKey, apiError, apiSuccess, handleOptions, corsHeaders } from '@/lib/api/auth';
import { signCustomerToken } from '@/lib/api/customer-auth';
import { randomBytes } from 'crypto';

/** 紹介コードを生成する（例: REF-A3X9K2） */
function generateReferralCode(): string {
  return 'REF-' + randomBytes(3).toString('hex').toUpperCase();
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'personal' | 'buyer' | 'supplier';
  status?: 'pending' | 'active' | 'suspended';
  prefecture?: string;
  businessType?: string;
  company?: string;
  phone?: string;
  referralCode?: string;
  metadata?: Record<string, unknown>;
}

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

  let body: RegisterRequest;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  // バリデーション
  if (!body.name?.trim()) return apiError('name is required', 400);
  if (!body.email?.trim()) return apiError('email is required', 400);
  if (!body.password || body.password.length < 6) {
    return apiError('password must be at least 6 characters', 400);
  }
  if (body.role && !['personal', 'buyer', 'supplier'].includes(body.role)) {
    return apiError('role must be personal, buyer, or supplier', 400);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 既存顧客チェック（同一ショップ内）
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('organization_id', auth.organizationId)
    .eq('email', body.email.trim().toLowerCase())
    .maybeSingle();

  if (existing) {
    return apiError('A customer with this email already exists', 409);
  }

  // 機能フラグ: referral_code が有効なら自動生成
  const { data: orgData } = await supabase
    .from('organizations')
    .select('features')
    .eq('id', auth.organizationId)
    .single();
  const orgFeatures = (orgData?.features as Record<string, unknown>) || {};
  const isReferralEnabled = !!orgFeatures.referral_code;

  // 紹介コード重複回避（最大5回リトライ）
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

  const passwordHash = await bcrypt.hash(body.password, 12);
  const role = body.role ?? 'personal';

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      organization_id: auth.organizationId,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      password_hash: passwordHash,
      role,
      status: body.status ?? (role === 'personal' ? 'active' : 'pending'),
      type: role === 'personal' ? 'individual' : 'business',
      phone: body.phone ?? null,
      company: body.company ?? null,
      prefecture: body.prefecture ?? null,
      business_type: body.businessType ?? null,
      metadata: body.metadata ?? null,
      email_verified: false,
      referral_code: newReferralCode,
      referred_by_code: body.referralCode ?? null,
    })
    .select('id, name, email, phone, company, type, role, status, prefecture, business_type, tags, total_orders, total_spent, referral_code, created_at')
    .single();

  if (error || !customer) {
    console.error('Customer registration error:', error);
    return apiError('Failed to register customer', 500);
  }

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

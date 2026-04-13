/**
 * GET  /api/v1/customers/:id  — 顧客個別取得
 * PUT  /api/v1/customers/:id  — 顧客情報更新
 *
 * 認証方式（どちらか一方を受け付ける）:
 *   A. Authorization: Bearer <shop_api_key>   ← 管理者アクセス（任意の顧客を操作可）
 *   B. Authorization: Bearer <customer_jwt>   ← 顧客本人アクセス（自分のデータのみ）
 *
 * JWT トークンの場合は sub（customer_id）と URL の :id が一致するか検証する。
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { validateApiKey, apiError, apiSuccess, handleOptions, corsHeaders } from '@/lib/api/auth';
import { verifyCustomerToken } from '@/lib/api/customer-auth';

interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  notes?: string;
  password?: string;
}

type AuthContext =
  | { kind: 'apiKey'; organizationId: string }
  | { kind: 'customerJwt'; customerId: string; organizationId: string };

async function resolveAuth(request: NextRequest, targetId: string): Promise<
  { ok: true; ctx: AuthContext } | { ok: false; error: string; status: number }
> {
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return { ok: false, error: 'Authorization header is required', status: 401 };
  }

  // まず顧客 JWT として検証を試みる
  const jwtResult = await verifyCustomerToken(request);
  if (jwtResult.success) {
    if (jwtResult.payload.sub !== targetId) {
      return { ok: false, error: 'Forbidden', status: 403 };
    }
    return {
      ok: true,
      ctx: { kind: 'customerJwt', customerId: jwtResult.payload.sub, organizationId: jwtResult.payload.org },
    };
  }

  // 次にショップ APIキー として検証
  const apiKeyResult = await validateApiKey(request);
  if (apiKeyResult.success) {
    return {
      ok: true,
      ctx: { kind: 'apiKey', organizationId: apiKeyResult.organizationId! },
    };
  }

  return { ok: false, error: 'Invalid or expired token', status: 401 };
}

// GET /api/v1/customers/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await resolveAuth(request, id);
  if (!authResult.ok) {
    return apiError(authResult.error, authResult.status);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return apiError('Server configuration error', 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { organizationId } = authResult.ctx;

  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, name, email, phone, company, type, tags, total_orders, total_spent, created_at')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (error || !customer) {
    return apiError('Customer not found', 404);
  }

  const { data: addresses } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', id)
    .order('is_default', { ascending: false });

  const response = apiSuccess({
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    company: customer.company,
    type: customer.type,
    tags: customer.tags || [],
    totalOrders: customer.total_orders,
    totalSpent: customer.total_spent,
    addresses: (addresses || []).map((a) => ({
      id: a.id,
      postalCode: a.postal_code,
      prefecture: a.prefecture,
      city: a.city,
      line1: a.line1,
      line2: a.line2,
      phone: a.phone,
      isDefault: a.is_default,
    })),
    createdAt: customer.created_at,
  });

  Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

// PUT /api/v1/customers/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await resolveAuth(request, id);
  if (!authResult.ok) {
    return apiError(authResult.error, authResult.status);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return apiError('Server configuration error', 500);
  }

  let body: UpdateCustomerRequest;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { organizationId } = authResult.ctx;

  // 対象顧客の存在確認
  const { data: existing, error: fetchError } = await supabase
    .from('customers')
    .select('id')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single();

  if (fetchError || !existing) {
    return apiError('Customer not found', 404);
  }

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.phone !== undefined) updates.phone = body.phone || null;
  if (body.company !== undefined) updates.company = body.company || null;
  if (body.tags !== undefined) updates.tags = body.tags;
  if (body.notes !== undefined) updates.notes = body.notes || null;
  if (body.password) {
    updates.password_hash = await bcrypt.hash(body.password, 12);
  }

  if (Object.keys(updates).length === 0) {
    return apiError('No fields to update', 400);
  }

  const { data: updated, error: updateError } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select('id, name, email, phone, company, type, tags, total_orders, total_spent, created_at')
    .single();

  if (updateError || !updated) {
    return apiError('Failed to update customer', 500);
  }

  const response = apiSuccess({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    company: updated.company,
    type: updated.type,
    tags: updated.tags || [],
    totalOrders: updated.total_orders,
    totalSpent: updated.total_spent,
    createdAt: updated.created_at,
  });

  Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export async function OPTIONS() {
  return handleOptions();
}

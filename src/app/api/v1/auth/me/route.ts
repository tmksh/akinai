/**
 * GET /api/v1/auth/me
 *
 * ログイン中の顧客自身の情報を返す
 * - Authorization: Bearer <customer_jwt>  ← ログイン時に発行されたトークン
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { apiError, apiSuccess, handleOptions, corsHeaders } from '@/lib/api/auth';
import { verifyCustomerToken } from '@/lib/api/customer-auth';

export async function GET(request: NextRequest) {
  const verified = await verifyCustomerToken(request);
  if (!verified.success) {
    return apiError(verified.error, verified.status);
  }

  const { sub: customerId, org: organizationId } = verified.payload;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return apiError('Server configuration error', 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: customer, error } = await supabase
    .from('customers')
    .select('id, name, email, phone, company, type, role, status, prefecture, business_type, tags, metadata, custom_fields, total_orders, total_spent, created_at')
    .eq('id', customerId)
    .eq('organization_id', organizationId)
    .single();

  if (error || !customer) {
    return apiError('Customer not found', 404);
  }

  const { data: addresses } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false });

  const response = apiSuccess({
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
    metadata: customer.metadata,
    customFields: customer.custom_fields ?? {},
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

export async function OPTIONS() {
  return handleOptions();
}

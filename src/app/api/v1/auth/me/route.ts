/**
 * GET /api/v1/auth/me
 */
import { NextRequest } from 'next/server';
import {
  apiError,
  apiSuccess,
  handleOptions,
  getServiceSupabase,
  CACHE_PROFILES,
} from '@/lib/api/auth';
import { verifyCustomerToken } from '@/lib/api/customer-auth';

export async function GET(request: NextRequest) {
  const verified = await verifyCustomerToken(request);
  if (!verified.success) {
    return apiError(verified.error, verified.status);
  }

  const { sub: customerId, org: organizationId } = verified.payload;
  const supabase = getServiceSupabase();

  const [customerRes, addressesRes] = await Promise.all([
    supabase
      .from('customers')
      .select(
        'id, name, email, phone, company, type, role, status, prefecture, business_type, tags, metadata, custom_fields, total_orders, total_spent, created_at',
      )
      .eq('id', customerId)
      .eq('organization_id', organizationId)
      .single(),
    supabase
      .from('customer_addresses')
      .select('id, postal_code, prefecture, city, line1, line2, phone, is_default')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false }),
  ]);

  const { data: customer, error } = customerRes;
  if (error || !customer) {
    return apiError('Customer not found', 404);
  }

  return apiSuccess(
    {
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
      addresses: (addressesRes.data || []).map((a) => ({
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
    },
    undefined,
    undefined,
    CACHE_PROFILES.session,
  );
}

export async function OPTIONS() {
  return handleOptions();
}

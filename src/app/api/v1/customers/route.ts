import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  apiSuccessPaginated,
  handleOptions,
  corsHeaders,
  withApiLogging,
} from '@/lib/api/auth';

// 顧客作成リクエスト
interface CreateCustomerRequest {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  type?: 'individual' | 'business';
  tags?: string[];
  notes?: string;
  address?: {
    postalCode: string;
    prefecture: string;
    city: string;
    line1: string;
    line2?: string;
    phone?: string;
    isDefault?: boolean;
  };
}

// GET /api/v1/customers - 顧客一覧 / メールで検索
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return apiError('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false });

    // メールで完全一致検索
    if (email) {
      query = query.eq('email', email);
    }

    // 名前・メールであいまい検索
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const startIndex = (page - 1) * limit;
    query = query.range(startIndex, startIndex + limit - 1);

    const { data: customers, error: custError, count } = await query;

    if (custError) {
      console.error('Error fetching customers:', custError);
      return apiError('Failed to fetch customers', 500);
    }

    // 住所情報を一括取得
    const customerIds = (customers || []).map(c => c.id);
    let addressMap: Record<string, unknown[]> = {};

    if (customerIds.length > 0) {
      const { data: addresses } = await supabase
        .from('customer_addresses')
        .select('*')
        .in('customer_id', customerIds)
        .order('is_default', { ascending: false });

      if (addresses) {
        for (const addr of addresses) {
          if (!addressMap[addr.customer_id]) {
            addressMap[addr.customer_id] = [];
          }
          addressMap[addr.customer_id].push({
            id: addr.id,
            postalCode: addr.postal_code,
            prefecture: addr.prefecture,
            city: addr.city,
            line1: addr.line1,
            line2: addr.line2,
            phone: addr.phone,
            isDefault: addr.is_default,
          });
        }
      }
    }

    const result = (customers || []).map(c => ({
      id: c.id,
      type: c.type,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      tags: c.tags || [],
      totalOrders: c.total_orders,
      totalSpent: c.total_spent,
      addresses: addressMap[c.id] || [],
      createdAt: c.created_at,
    }));

    const response = apiSuccessPaginated(result, page, limit, count || 0, auth.rateLimit);
    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

// POST /api/v1/customers - 顧客作成
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return apiError('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: CreateCustomerRequest;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    // バリデーション
    if (!body.name || !body.name.trim()) {
      return apiError('name is required', 400);
    }
    if (!body.email || !body.email.trim()) {
      return apiError('email is required', 400);
    }

    // 既存顧客チェック（同一組織・同一メール）
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('organization_id', auth.organizationId)
      .eq('email', body.email.trim())
      .single();

    if (existing) {
      return apiError('A customer with this email already exists', 409);
    }

    // 顧客を作成
    const { data: customer, error: createError } = await supabase
      .from('customers')
      .insert({
        organization_id: auth.organizationId,
        name: body.name.trim(),
        email: body.email.trim(),
        phone: body.phone || null,
        company: body.company || null,
        type: body.type || 'individual',
        tags: body.tags || [],
        notes: body.notes || null,
      })
      .select()
      .single();

    if (createError || !customer) {
      console.error('Customer creation error:', createError);
      return apiError('Failed to create customer', 500);
    }

    // 住所が指定されていれば作成
    let address = null;
    if (body.address) {
      const { data: addr, error: addrError } = await supabase
        .from('customer_addresses')
        .insert({
          customer_id: customer.id,
          postal_code: body.address.postalCode,
          prefecture: body.address.prefecture,
          city: body.address.city,
          line1: body.address.line1,
          line2: body.address.line2 || null,
          phone: body.address.phone || null,
          is_default: body.address.isDefault !== false,
        })
        .select()
        .single();

      if (!addrError && addr) {
        address = {
          id: addr.id,
          postalCode: addr.postal_code,
          prefecture: addr.prefecture,
          city: addr.city,
          line1: addr.line1,
          line2: addr.line2,
          phone: addr.phone,
          isDefault: addr.is_default,
        };
      }
    }

    const response = apiSuccess(
      {
        id: customer.id,
        type: customer.type,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        tags: customer.tags || [],
        totalOrders: 0,
        totalSpent: 0,
        addresses: address ? [address] : [],
        createdAt: customer.created_at,
      },
      undefined,
      auth.rateLimit
    );
    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

// OPTIONS /api/v1/customers - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  apiSuccessPaginated,
  handleOptions,
  withApiLogging,
  getServiceSupabase,
  CACHE_PROFILES,
} from '@/lib/api/auth';
import { fetchSuppliers } from '@/lib/api/storefront-data';

type CustomerRoleKey = 'personal' | 'buyer' | 'supplier';

// 顧客作成リクエスト
interface CreateCustomerRequest {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  company?: string;
  type?: 'individual' | 'business';
  /** 後方互換: 単一ロール。roles が指定されている場合は無視される */
  role?: CustomerRoleKey;
  /** マルチロール指定（推奨）。先頭がプライマリロール */
  roles?: CustomerRoleKey[];
  status?: 'pending' | 'active' | 'suspended';
  metadata?: Record<string, unknown>;
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
    const supabase = getServiceSupabase();
    const orgId = auth.organizationId!;

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // サプライヤーマスタ一覧（検索なし）はキャッシュ済み共通取得
    // roles[] に 'supplier' を含む顧客も対象
    if (role === 'supplier' && !email && !search && status !== 'pending' && status !== 'suspended') {
      const allSuppliers = await fetchSuppliers(supabase, orgId);
      const startIndex = (page - 1) * limit;
      const slice = allSuppliers.slice(startIndex, startIndex + limit);
      return apiSuccessPaginated(
        slice,
        page,
        limit,
        allSuppliers.length,
        auth.rateLimit,
        CACHE_PROFILES.master,
      );
    }

    let query = supabase
      .from('customers')
      .select(
        'id, type, name, email, phone, company, role, roles, status, tags, total_orders, total_spent, custom_fields, created_at',
        { count: 'exact' },
      )
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (email) query = query.eq('email', email);
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }
    if (role && ['personal', 'buyer', 'supplier'].includes(role)) {
      // roles[] に含まれるか、または role（プライマリ）が一致する顧客を取得
      query = query.contains('roles', [role]);
    }
    if (status && ['pending', 'active', 'suspended'].includes(status)) {
      query = query.eq('status', status);
    }

    const startIndex = (page - 1) * limit;
    query = query.range(startIndex, startIndex + limit - 1);

    const { data: customers, error: custError, count } = await query;

    if (custError) {
      console.error('Error fetching customers:', custError);
      return apiError('Failed to fetch customers', 500);
    }

    const customerIds = (customers || []).map((c) => c.id);
    let addressMap: Record<string, unknown[]> = {};

    if (customerIds.length > 0) {
      const { data: addresses } = await supabase
        .from('customer_addresses')
        .select('id, customer_id, postal_code, prefecture, city, line1, line2, phone, is_default')
        .in('customer_id', customerIds)
        .order('is_default', { ascending: false });

      if (addresses) {
        for (const addr of addresses) {
          if (!addressMap[addr.customer_id]) addressMap[addr.customer_id] = [];
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

    const result = (customers || []).map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      role: c.role,
      roles: (c.roles as string[]) || [c.role],
      status: c.status,
      tags: c.tags || [],
      totalOrders: c.total_orders,
      totalSpent: c.total_spent,
      customFields: c.custom_fields ?? {},
      addresses: addressMap[c.id] || [],
      createdAt: c.created_at,
    }));

    const cacheProfile =
      !email && !search ? CACHE_PROFILES.master : CACHE_PROFILES.session;

    return apiSuccessPaginated(result, page, limit, count || 0, auth.rateLimit, cacheProfile);
  });
}

// POST /api/v1/customers - 顧客作成
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabase = getServiceSupabase();

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

    // roles/role の解決
    const validRolesList: CustomerRoleKey[] = ['personal', 'buyer', 'supplier'];
    const resolvedRoles: CustomerRoleKey[] = body.roles?.filter((r) => validRolesList.includes(r)) ??
      (body.role ? [body.role] : ['personal']);
    const primaryRole = resolvedRoles[0];

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
        role: primaryRole,
        roles: resolvedRoles,
        status: body.status || 'active',
        metadata: body.metadata || null,
        tags: body.tags || [],
        notes: body.notes || null,
        password_hash: body.password ? await bcrypt.hash(body.password, 12) : null,
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

    return apiSuccess(
      {
        id: customer.id,
        type: customer.type,
        role: customer.role,
        roles: (customer.roles as string[]) || [customer.role],
        status: customer.status,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        company: customer.company,
        tags: customer.tags || [],
        metadata: customer.metadata,
        totalOrders: 0,
        totalSpent: 0,
        addresses: address ? [address] : [],
        createdAt: customer.created_at,
      },
      undefined,
      auth.rateLimit,
    );
  });
}

// OPTIONS /api/v1/customers - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

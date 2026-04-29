/**
 * GET /api/v1/customers/:id/engaged-customers
 *
 * 指定サプライヤー（:id）とエンゲージメントのあるバイヤー一覧を返す。
 * "エンゲージメント" = 過去に注文した顧客 OR このサプライヤーへ問い合わせした顧客。
 *
 * Query params:
 *   page    number   default 1
 *   limit   number   default 20, max 100
 *   source  string   "orders" | "inquiries" | "all" (default "all")
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
} from '@/lib/api/auth';

export function OPTIONS() {
  return handleOptions();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request);
  if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

  const { id: supplierId } = await params;
  const { searchParams } = new URL(request.url);
  const page   = Math.max(1, Number(searchParams.get('page')  || 1));
  const limit  = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
  const source = searchParams.get('source') || 'all';
  const offset = (page - 1) * limit;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // サプライヤーの存在確認（同組織内）
  const { data: supplier } = await supabase
    .from('customers')
    .select('id')
    .eq('id', supplierId)
    .eq('organization_id', auth.organizationId!)
    .single();
  if (!supplier) return apiError('Customer not found', 404);

  const engagedIds = new Set<string>();

  // 注文実績のあるバイヤー
  if (source === 'all' || source === 'orders') {
    const { data: orderBuyers } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('organization_id', auth.organizationId!)
      .not('customer_id', 'is', null);
    (orderBuyers || []).forEach((o) => engagedIds.add(o.customer_id as string));
  }

  // このサプライヤーに問い合わせしたバイヤー
  if (source === 'all' || source === 'inquiries') {
    const { data: threads } = await supabase
      .from('inquiry_threads')
      .select('initiator_customer_id')
      .eq('organization_id', auth.organizationId!)
      .eq('recipient_customer_id', supplierId);
    (threads || []).forEach((t) => engagedIds.add(t.initiator_customer_id as string));
  }

  const ids = [...engagedIds];
  if (ids.length === 0) {
    return apiSuccess({ customers: [], total: 0, page, limit });
  }

  const { data, error, count } = await supabase
    .from('customers')
    .select('id, name, email, role, status, company, total_orders, total_spent, created_at', { count: 'exact' })
    .in('id', ids)
    .eq('organization_id', auth.organizationId!)
    .eq('status', 'active')
    .not('email', 'is', null)
    .order('total_orders', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return apiError('Failed to fetch engaged customers', 500);

  return apiSuccess({
    customers: data || [],
    total: count || 0,
    page,
    limit,
  });
}

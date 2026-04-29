/**
 * GET /api/v1/customers/:id/followers
 *
 * 指定サプライヤー（:id）のフォロワー一覧を返す。
 * "フォロワー" = 以下の両方を統合した顧客（ログイン済み）:
 *   1. supplier_favorites でこのサプライヤーを直接フォローしたバイヤー
 *   2. product_favorites でこのサプライヤーの商品をお気に入りしたバイヤー
 *
 * Query params:
 *   page    number  default 1
 *   limit   number  default 20, max 100
 *   source  string  "supplier" | "product" | "all" (default "all")
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

  const followerIds = new Set<string>();

  // ① サプライヤーを直接フォローしたバイヤー（supplier_favorites）
  if (source === 'all' || source === 'supplier') {
    const { data: supplierFavs } = await supabase
      .from('supplier_favorites')
      .select('customer_id')
      .eq('supplier_id', supplierId)
      .eq('organization_id', auth.organizationId!)
      .not('customer_id', 'is', null);
    (supplierFavs || []).forEach((f) => followerIds.add(f.customer_id as string));
  }

  // ② このサプライヤーの商品をお気に入りしたバイヤー（product_favorites.supplier_id で直接検索）
  //    product_favorites.supplier_id は登録時に自動設定される（migration 030以降）
  if (source === 'all' || source === 'product') {
    const { data: productFavs } = await supabase
      .from('product_favorites')
      .select('customer_id')
      .eq('supplier_id', supplierId)
      .eq('organization_id', auth.organizationId!)
      .not('customer_id', 'is', null);
    (productFavs || []).forEach((f) => followerIds.add(f.customer_id as string));
  }

  const ids = [...followerIds];
  if (ids.length === 0) {
    return apiSuccess({ followers: [], total: 0, page, limit });
  }

  const { data, error, count } = await supabase
    .from('customers')
    .select('id, name, email, role, status, company, created_at', { count: 'exact' })
    .in('id', ids)
    .eq('organization_id', auth.organizationId!)
    .eq('status', 'active')
    .not('email', 'is', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return apiError('Failed to fetch followers', 500);

  return apiSuccess({
    followers: data || [],
    total: count || 0,
    page,
    limit,
  });
}

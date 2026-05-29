/**
 * アナリティクス共通ヘルパー
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/** 商品またはリクエストからサプライヤーIDを解決する */
export async function resolveProductSupplierId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  organizationId: string,
  productId: string,
  explicitSupplierId?: string | null,
): Promise<string | null> {
  if (explicitSupplierId) return explicitSupplierId;

  const { data: product, error } = await supabase
    .from('products')
    .select('supplier_id')
    .eq('id', productId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    console.error('Failed to resolve product supplier_id:', error);
    return null;
  }

  return (product?.supplier_id as string | null) ?? null;
}

/** サプライヤーに紐づく商品ID一覧を取得 */
export async function getSupplierProductIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  organizationId: string,
  supplierId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('supplier_id', supplierId);

  if (error) {
    console.error('Failed to fetch supplier products:', error);
    return [];
  }

  return (data || []).map((row) => row.id as string);
}

/**
 * page_views / product_clicks 用の Supabase .or() フィルタ文字列。
 * supplier_id 直接一致、または当該サプライヤー商品へのイベントを含める。
 */
export function buildSupplierEventFilter(supplierId: string, productIds: string[]): string {
  if (productIds.length === 0) {
    return `supplier_id.eq.${supplierId}`;
  }
  return `supplier_id.eq.${supplierId},product_id.in.(${productIds.join(',')})`;
}

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

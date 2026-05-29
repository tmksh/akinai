/**
 * アナリティクス共通ヘルパー
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 商品の custom_fields から supplier_id を取り出す。
 *
 * まちもぐ等の連携先は、商品の所有サプライヤーを専用カラムではなく
 * custom_fields（[{ key: 'supplier_id', value: '<uuid>' }, ...]）に保存する。
 * 専用カラム products.supplier_id へ同期するためのヘルパー。
 */
export function extractSupplierIdFromCustomFields(raw: unknown): string | null {
  if (!Array.isArray(raw)) return null;
  for (const item of raw) {
    if (item && typeof item === 'object' && (item as { key?: unknown }).key === 'supplier_id') {
      const value = (item as { value?: unknown }).value;
      if (typeof value === 'string' && UUID_RE.test(value.trim())) {
        return value.trim();
      }
    }
  }
  return null;
}

/**
 * 商品の所有サプライヤーIDを解決する。
 *
 * 集計の基準は「商品マスタの supplier_id」。
 * 優先順位: products.supplier_id カラム → custom_fields の supplier_id → 明示指定値。
 * これにより、過去イベントも商品単位で正しいサプライヤーに集計される。
 */
export async function resolveProductSupplierId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  organizationId: string,
  productId: string,
  explicitSupplierId?: string | null,
): Promise<string | null> {
  const { data: product, error } = await supabase
    .from('products')
    .select('supplier_id, custom_fields')
    .eq('id', productId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    console.error('Failed to resolve product supplier_id:', error);
    return explicitSupplierId ?? null;
  }

  const columnValue = (product?.supplier_id as string | null) ?? null;
  if (columnValue) return columnValue;

  const fromCustomFields = extractSupplierIdFromCustomFields(product?.custom_fields);
  if (fromCustomFields) return fromCustomFields;

  return explicitSupplierId ?? null;
}

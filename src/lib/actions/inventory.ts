'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/database';

type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
type Product = Database['public']['Tables']['products']['Row'];
type StockMovement = Database['public']['Tables']['stock_movements']['Row'];

// 在庫サマリーの型
export interface InventorySummary {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  currentStock: number;
  reservedStock: number; // 予約済み（注文済みだが未発送）
  availableStock: number; // 利用可能 = currentStock - reservedStock
  lowStockThreshold: number;
  isLowStock: boolean;
}

// 在庫移動履歴の型（リレーション込み）
export interface StockMovementWithRelations extends StockMovement {
  product: Product | null;
  variant: ProductVariant | null;
}

// 在庫一覧を取得
export async function getInventorySummary(organizationId: string): Promise<{
  data: InventorySummary[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 商品とバリアントを取得
    const { data: products, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        organization_id,
        variants:product_variants(*)
      `)
      .eq('organization_id', organizationId)
      .order('name');

    if (productError) throw productError;

    // 予約済み在庫を計算（pending/confirmed/processing状態の注文）
    const { data: reservedItems, error: reservedError } = await supabase
      .from('order_items')
      .select(`
        variant_id,
        quantity,
        order:orders!inner(status, organization_id)
      `)
      .eq('order.organization_id', organizationId)
      .in('order.status', ['pending', 'confirmed', 'processing']);

    if (reservedError) throw reservedError;

    // バリアントごとの予約数を集計
    const reservedByVariant: Record<string, number> = {};
    (reservedItems || []).forEach((item: { variant_id: string | null; quantity: number }) => {
      if (item.variant_id) {
        reservedByVariant[item.variant_id] = (reservedByVariant[item.variant_id] || 0) + item.quantity;
      }
    });

    // サマリーを作成
    const summary: InventorySummary[] = [];
    
    (products || []).forEach((product: { id: string; name: string; variants: ProductVariant[] }) => {
      (product.variants || []).forEach((variant: ProductVariant) => {
        const reserved = reservedByVariant[variant.id] || 0;
        const available = Math.max(0, variant.stock - reserved);
        
        summary.push({
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          variantName: variant.name,
          sku: variant.sku,
          currentStock: variant.stock,
          reservedStock: reserved,
          availableStock: available,
          lowStockThreshold: variant.low_stock_threshold,
          isLowStock: available <= variant.low_stock_threshold,
        });
      });
    });

    return { data: summary, error: null };
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    return { data: null, error: '在庫情報の取得に失敗しました' };
  }
}

// 在庫調整（入庫・出庫）
export async function adjustStock(input: {
  organizationId: string;
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason?: string;
  reference?: string;
  lotNumber?: string;
  userId?: string;
  createdBy?: string;
}): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 現在の在庫を取得
    const { data: variant, error: variantError } = await supabase
      .from('product_variants')
      .select('stock')
      .eq('id', input.variantId)
      .single();

    if (variantError) throw variantError;
    if (!variant) throw new Error('バリアントが見つかりません');

    const previousStock = variant.stock;
    const quantityChange = input.type === 'out' ? -input.quantity : input.quantity;
    const newStock = previousStock + quantityChange;

    // 出庫の場合、在庫が足りるかチェック
    if (input.type === 'out' && newStock < 0) {
      return { success: false, error: '在庫が不足しています' };
    }

    // 在庫を更新
    const { error: updateError } = await supabase
      .from('product_variants')
      .update({ stock: newStock })
      .eq('id', input.variantId);

    if (updateError) throw updateError;

    // 在庫移動履歴を記録
    const { error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        organization_id: input.organizationId,
        product_id: input.productId,
        variant_id: input.variantId,
        type: input.type,
        quantity: input.type === 'out' ? -input.quantity : input.quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        reason: input.reason || null,
        reference: input.reference || null,
        lot_number: input.lotNumber || null,
        user_id: input.userId || null,
        created_by: input.createdBy || null,
        product_name: input.productName,
        variant_name: input.variantName,
        sku: input.sku,
      });

    if (movementError) throw movementError;

    revalidatePath('/products');
    revalidatePath('/products/inventory');
    revalidatePath('/products/movements');

    return { success: true, error: null };
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return { success: false, error: '在庫調整に失敗しました' };
  }
}

// 在庫移動履歴を取得
export async function getStockMovements(
  organizationId: string,
  options?: {
    variantId?: string;
    productId?: string;
    type?: 'in' | 'out' | 'adjustment' | 'transfer';
    limit?: number;
    offset?: number;
    searchQuery?: string;
  }
): Promise<{
  data: StockMovementWithRelations[] | null;
  total: number;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(id, name, organization_id),
        variant:product_variants(id, name, sku)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // フィルター適用
    if (options?.variantId) {
      query = query.eq('variant_id', options.variantId);
    }
    if (options?.productId) {
      query = query.eq('product_id', options.productId);
    }
    if (options?.type) {
      query = query.eq('type', options.type);
    }
    if (options?.searchQuery) {
      query = query.or(
        `product_name.ilike.%${options.searchQuery}%,variant_name.ilike.%${options.searchQuery}%,sku.ilike.%${options.searchQuery}%,reason.ilike.%${options.searchQuery}%,reference.ilike.%${options.searchQuery}%`
      );
    }

    // ページネーション
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) throw error;

    return {
      data: data as StockMovementWithRelations[],
      total: count || 0,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return { data: null, total: 0, error: '在庫履歴の取得に失敗しました' };
  }
}

// 在庫統計を取得
export async function getInventoryStats(organizationId: string): Promise<{
  data: {
    totalItems: number;
    totalStock: number;
    lowStockItems: number;
    outOfStockItems: number;
  } | null;
  error: string | null;
}> {
  const result = await getInventorySummary(organizationId);
  
  if (result.error || !result.data) {
    return { data: null, error: result.error };
  }

  const summary = result.data;
  
  return {
    data: {
      totalItems: summary.length,
      totalStock: summary.reduce((sum, item) => sum + item.currentStock, 0),
      lowStockItems: summary.filter(item => item.isLowStock && item.availableStock > 0).length,
      outOfStockItems: summary.filter(item => item.availableStock === 0).length,
    },
    error: null,
  };
}


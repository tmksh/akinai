'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/database';

// 型定義
type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderStatus = Order['status'];
type PaymentStatus = Order['payment_status'];

// 注文とリレーションを含んだ型
export interface OrderWithItems extends Order {
  items: OrderItem[];
}

// 注文アイテム入力型
export interface OrderItemInput {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

// 配送先住所型
export interface ShippingAddress {
  postalCode: string;
  prefecture: string;
  city: string;
  line1: string;
  line2?: string;
  phone?: string;
}

// 注文作成入力型
export interface CreateOrderInput {
  organizationId: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  items: OrderItemInput[];
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  paymentMethod?: string;
  notes?: string;
  // 在庫を引き当てるかどうか（デフォルトtrue）
  reserveStock?: boolean;
}

// 注文番号生成
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

// 注文を作成（在庫確認・引き当て含む）
export async function createOrder(input: CreateOrderInput): Promise<{
  data: OrderWithItems | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const reserveStock = input.reserveStock !== false; // デフォルトtrue

  try {
    // 1. 在庫確認
    if (reserveStock) {
      for (const item of input.items) {
        const { data: variant, error: variantError } = await supabase
          .from('product_variants')
          .select('stock, name')
          .eq('id', item.variantId)
          .single();

        if (variantError || !variant) {
          return { data: null, error: `商品バリアント ${item.variantName} が見つかりません` };
        }

        // 予約済み在庫を考慮した利用可能在庫を計算
        const { data: reservedData } = await supabase
          .from('order_items')
          .select('quantity, orders!inner(status)')
          .eq('variant_id', item.variantId)
          .in('orders.status', ['pending', 'confirmed', 'processing']);

        const reservedStock = reservedData?.reduce((sum, r) => sum + r.quantity, 0) || 0;
        const availableStock = variant.stock - reservedStock;

        if (availableStock < item.quantity) {
          return {
            data: null,
            error: `「${item.productName} - ${item.variantName}」の在庫が不足しています。利用可能: ${availableStock}個、注文数: ${item.quantity}個`,
          };
        }
      }
    }

    // 2. 金額計算
    const subtotal = input.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const shippingCost = subtotal >= 5500 ? 0 : 500; // 5,500円以上で送料無料
    const taxRate = 0.1;
    const tax = Math.floor(subtotal * taxRate);
    const total = subtotal + shippingCost + tax;

    // 3. 注文を作成
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        organization_id: input.organizationId,
        order_number: generateOrderNumber(),
        customer_id: input.customerId,
        customer_name: input.customerName,
        customer_email: input.customerEmail,
        subtotal,
        shipping_cost: shippingCost,
        tax,
        total,
        status: 'pending',
        payment_status: 'pending',
        payment_method: input.paymentMethod,
        shipping_address: input.shippingAddress as unknown as Database['public']['Tables']['orders']['Insert']['shipping_address'],
        billing_address: input.billingAddress as unknown as Database['public']['Tables']['orders']['Insert']['billing_address'],
        notes: input.notes,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 4. 注文明細を作成
    const orderItemsToInsert = input.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productName,
      variant_name: item.variantName,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
    }));

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert)
      .select();

    if (itemsError) {
      // 注文明細の作成に失敗した場合、注文を削除
      await supabase.from('orders').delete().eq('id', order.id);
      throw itemsError;
    }

    // 5. 在庫引き当て（stock_movementsに記録）
    if (reserveStock) {
      for (const item of input.items) {
        const { data: variant } = await supabase
          .from('product_variants')
          .select('stock')
          .eq('id', item.variantId)
          .single();

        if (variant) {
          await supabase.from('stock_movements').insert({
            organization_id: input.organizationId,
            product_id: item.productId,
            variant_id: item.variantId,
            type: 'out',
            quantity: -item.quantity, // 出庫なのでマイナス
            previous_stock: variant.stock,
            new_stock: variant.stock, // 実在庫は変えない（引き当てのみ）
            reason: '注文引き当て',
            reference: order.order_number,
            product_name: item.productName,
            variant_name: item.variantName,
            sku: item.sku,
          });
        }
      }
    }

    revalidatePath('/orders');
    revalidatePath('/inventory');
    revalidatePath('/inventory/movements');

    return {
      data: {
        ...order,
        items: items || [],
      },
      error: null,
    };
  } catch (err) {
    console.error('Failed to create order:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create order',
    };
  }
}

// 注文一覧を取得
export async function getOrders(organizationId: string): Promise<{
  data: OrderWithItems[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 注文を取得
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0) {
      return { data: [], error: null };
    }

    const orderIds = orders.map(o => o.id);

    // 注文明細を取得
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    if (itemsError) throw itemsError;

    // データを結合
    const ordersWithItems: OrderWithItems[] = orders.map(order => ({
      ...order,
      items: items?.filter(item => item.order_id === order.id) || [],
    }));

    return { data: ordersWithItems, error: null };
  } catch (err) {
    console.error('Failed to fetch orders:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch orders',
    };
  }
}

// 注文詳細を取得
export async function getOrder(orderId: string): Promise<{
  data: OrderWithItems | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 注文を取得
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // 注文明細を取得
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    return {
      data: {
        ...order,
        items: items || [],
      },
      error: null,
    };
  } catch (err) {
    console.error('Failed to fetch order:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch order',
    };
  }
}

// 注文ステータスを更新
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{
  data: Order | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const updateData: Record<string, unknown> = { status };

    // ステータスに応じて追加のフィールドを更新
    if (status === 'shipped') {
      updateData.shipped_at = new Date().toISOString();
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);

    return { data, error: null };
  } catch (err) {
    console.error('Failed to update order status:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update order status',
    };
  }
}

// 支払いステータスを更新
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus
): Promise<{
  data: Order | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);

    return { data, error: null };
  } catch (err) {
    console.error('Failed to update payment status:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update payment status',
    };
  }
}

// 追跡番号を更新
export async function updateTrackingNumber(
  orderId: string,
  trackingNumber: string
): Promise<{
  data: Order | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ tracking_number: trackingNumber })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);

    return { data, error: null };
  } catch (err) {
    console.error('Failed to update tracking number:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update tracking number',
    };
  }
}

// 注文メモを更新
export async function updateOrderNotes(
  orderId: string,
  notes: string
): Promise<{
  data: Order | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ notes })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);

    return { data, error: null };
  } catch (err) {
    console.error('Failed to update order notes:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update order notes',
    };
  }
}

// 注文を発送（実際に在庫を減らす）
export async function shipOrder(
  orderId: string,
  trackingNumber?: string,
  userId?: string,
  userName?: string
): Promise<{
  data: Order | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 1. 注文と注文明細を取得
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { data: null, error: '注文が見つかりません' };
    }

    // すでに発送済みの場合はエラー
    if (order.status === 'shipped' || order.status === 'delivered') {
      return { data: null, error: 'この注文はすでに発送済みです' };
    }

    // キャンセル済みの場合はエラー
    if (order.status === 'cancelled' || order.status === 'refunded') {
      return { data: null, error: 'キャンセル済みまたは返金済みの注文は発送できません' };
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    // 2. 各商品の在庫を実際に減らす
    for (const item of items || []) {
      if (!item.variant_id) continue;

      // 現在の在庫を取得
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('stock')
        .eq('id', item.variant_id)
        .single();

      if (variantError || !variant) {
        console.error(`Variant ${item.variant_id} not found`);
        continue;
      }

      const previousStock = variant.stock;
      const newStock = previousStock - item.quantity;

      // 在庫がマイナスにならないか確認
      if (newStock < 0) {
        return {
          data: null,
          error: `「${item.product_name} - ${item.variant_name}」の在庫が不足しています（現在庫: ${previousStock}個）`,
        };
      }

      // 在庫を更新
      const { error: updateError } = await supabase
        .from('product_variants')
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', item.variant_id);

      if (updateError) throw updateError;

      // stock_movementsに出庫記録
      await supabase.from('stock_movements').insert({
        organization_id: order.organization_id,
        product_id: item.product_id || '',
        variant_id: item.variant_id,
        type: 'out',
        quantity: -item.quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        reason: '注文発送',
        reference: order.order_number,
        user_id: userId,
        created_by: userName || '管理者',
        product_name: item.product_name,
        variant_name: item.variant_name,
        sku: item.sku,
      });
    }

    // 3. 注文ステータスを更新
    const updateData: Record<string, unknown> = {
      status: 'shipped',
      shipped_at: new Date().toISOString(),
    };

    if (trackingNumber) {
      updateData.tracking_number = trackingNumber;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/inventory');
    revalidatePath('/inventory/movements');

    return { data, error: null };
  } catch (err) {
    console.error('Failed to ship order:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to ship order',
    };
  }
}

// 注文をキャンセル（在庫を戻す）
export async function cancelOrder(
  orderId: string,
  userId?: string,
  userName?: string
): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 1. 注文と注文明細を取得
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: '注文が見つかりません' };
    }

    // すでにキャンセル済みの場合
    if (order.status === 'cancelled') {
      return { success: false, error: 'この注文はすでにキャンセル済みです' };
    }

    // 発送済みの場合はキャンセル不可（返品処理が必要）
    if (order.status === 'shipped' || order.status === 'delivered') {
      return { success: false, error: '発送済みの注文はキャンセルできません。返品処理を行ってください。' };
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    // 2. 未発送の場合は引き当て解除（在庫は実際には減っていないので戻す必要なし）
    // ただし、stock_movementsにキャンセル記録を残す
    for (const item of items || []) {
      if (!item.variant_id) continue;

      const { data: variant } = await supabase
        .from('product_variants')
        .select('stock')
        .eq('id', item.variant_id)
        .single();

      if (variant) {
        await supabase.from('stock_movements').insert({
          organization_id: order.organization_id,
          product_id: item.product_id || '',
          variant_id: item.variant_id,
          type: 'adjustment',
          quantity: item.quantity, // プラス（引き当て解除）
          previous_stock: variant.stock,
          new_stock: variant.stock, // 実在庫は変わらない
          reason: '注文キャンセル（引き当て解除）',
          reference: order.order_number,
          user_id: userId,
          created_by: userName || '管理者',
          product_name: item.product_name,
          variant_name: item.variant_name,
          sku: item.sku,
        });
      }
    }

    // 3. 注文ステータスを更新
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId);

    if (error) throw error;

    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/inventory');
    revalidatePath('/inventory/movements');

    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to cancel order:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to cancel order',
    };
  }
}

// 返品処理（発送済み注文のキャンセル、在庫を戻す）
export async function refundOrder(
  orderId: string,
  returnStock: boolean = true,
  userId?: string,
  userName?: string
): Promise<{
  data: Order | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 1. 注文と注文明細を取得
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { data: null, error: '注文が見つかりません' };
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    // 2. 在庫を戻す（returnStockがtrueの場合のみ）
    if (returnStock) {
      for (const item of items || []) {
        if (!item.variant_id) continue;

        const { data: variant, error: variantError } = await supabase
          .from('product_variants')
          .select('stock')
          .eq('id', item.variant_id)
          .single();

        if (variantError || !variant) continue;

        const previousStock = variant.stock;
        const newStock = previousStock + item.quantity;

        // 在庫を更新
        await supabase
          .from('product_variants')
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', item.variant_id);

        // stock_movementsに入庫記録
        await supabase.from('stock_movements').insert({
          organization_id: order.organization_id,
          product_id: item.product_id || '',
          variant_id: item.variant_id,
          type: 'in',
          quantity: item.quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reason: '返品入庫',
          reference: order.order_number,
          user_id: userId,
          created_by: userName || '管理者',
          product_name: item.product_name,
          variant_name: item.variant_name,
          sku: item.sku,
        });
      }
    }

    // 3. 注文ステータスを更新
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'refunded',
        payment_status: 'refunded',
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/orders');
    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/inventory');
    revalidatePath('/inventory/movements');

    return { data, error: null };
  } catch (err) {
    console.error('Failed to refund order:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to refund order',
    };
  }
}

// 注文を確認（承認）
export async function confirmOrder(orderId: string): Promise<{
  data: Order | null;
  error: string | null;
}> {
  return updateOrderStatus(orderId, 'confirmed');
}

// 注文を処理開始
export async function startProcessingOrder(orderId: string): Promise<{
  data: Order | null;
  error: string | null;
}> {
  return updateOrderStatus(orderId, 'processing');
}

// 配達完了
export async function markAsDelivered(orderId: string): Promise<{
  data: Order | null;
  error: string | null;
}> {
  return updateOrderStatus(orderId, 'delivered');
}

// 予約済み在庫を計算（未発送の注文に含まれる在庫数）
export async function getReservedStock(
  organizationId: string,
  variantId?: string
): Promise<{
  data: Map<string, number> | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('order_items')
      .select('variant_id, quantity, orders!inner(status, organization_id)')
      .eq('orders.organization_id', organizationId)
      .in('orders.status', ['pending', 'confirmed', 'processing']);

    if (variantId) {
      query = query.eq('variant_id', variantId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const reservedMap = new Map<string, number>();

    for (const item of data || []) {
      if (!item.variant_id) continue;
      const current = reservedMap.get(item.variant_id) || 0;
      reservedMap.set(item.variant_id, current + item.quantity);
    }

    return { data: reservedMap, error: null };
  } catch (err) {
    console.error('Failed to get reserved stock:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to get reserved stock',
    };
  }
}

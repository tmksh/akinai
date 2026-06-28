'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import {
  getOrSetCached,
  orgCacheKey,
  invalidateOrgCache,
  MEMORY_TTL,
} from '@/lib/api/memory-cache';
import Stripe from 'stripe';
import { getStripeConfig } from '@/lib/stripe-client';
import { sendOrderEmails } from '@/lib/order-emails';

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
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

import { generateOrderNumber } from '@/lib/generate-order-number';

// 注文を作成（在庫確認・引き当て含む）
export async function createOrder(input: CreateOrderInput): Promise<{
  data: OrderWithItems | null;
  error: string | null;
}> {
  const supabase = getAdminClient();
  const reserveStock = input.reserveStock !== false; // デフォルトtrue

  try {
    // 1. 在庫確認（全アイテムを並列チェック）
    if (reserveStock) {
      const variantIds = input.items.map(item => item.variantId);

      // バリアント情報と予約在庫を並列取得
      const [variantsRes, reservedRes] = await Promise.all([
        supabase
          .from('product_variants')
          .select('id, stock, name')
          .in('id', variantIds),
        supabase
          .from('order_items')
          .select('variant_id, quantity, orders!inner(status)')
          .in('variant_id', variantIds)
          .in('orders.status', ['pending', 'confirmed', 'processing']),
      ]);

      const variantMap = new Map((variantsRes.data || []).map(v => [v.id, v]));
      const reservedMap = new Map<string, number>();
      for (const r of reservedRes.data || []) {
        if (!r.variant_id) continue;
        reservedMap.set(r.variant_id, (reservedMap.get(r.variant_id) || 0) + r.quantity);
      }

      for (const item of input.items) {
        const variant = variantMap.get(item.variantId);
        if (!variant) {
          return { data: null, error: `商品バリアント ${item.variantName} が見つかりません` };
        }

        const reservedStock = reservedMap.get(item.variantId) || 0;
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
        order_number: await generateOrderNumber(supabase),
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

    invalidateOrgCache(input.organizationId, 'orders');
    invalidateOrgCache(input.organizationId, 'dashboard');
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
export async function getOrders(
  organizationId: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  data: OrderWithItems[] | null;
  totalCount: number;
  error: string | null;
}> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  return getOrSetCached(
    orgCacheKey(organizationId, 'orders', `l${limit}o${offset}`),
    MEMORY_TTL.adminList,
    async () => {
      const supabase = await createClient();
      try {
        const { data: orders, error: ordersError, count } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (id, quantity, product_name, variant_name, unit_price, total_price, sku)
          `, { count: 'exact' })
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (ordersError) throw ordersError;
        if (!orders || orders.length === 0) {
          return { data: [], totalCount: count ?? 0, error: null };
        }

        const ordersWithItems: OrderWithItems[] = orders.map(order => {
          const { order_items, ...rest } = order;
          return {
            ...rest,
            items: (order_items as OrderItem[]) || [],
          };
        });

        return { data: ordersWithItems, totalCount: count ?? 0, error: null };
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        return {
          data: null,
          totalCount: 0,
          error: err instanceof Error ? err.message : 'Failed to fetch orders',
        };
      }
    },
  );
}

// 注文詳細を取得
export async function getOrder(orderId: string): Promise<{
  data: OrderWithItems | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 注文と明細をJOINで1クエリ取得（バリエーション画像・商品画像・添付ファイルも取得）
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          variant_data:product_variants!variant_id(image_url),
          product_data:products!product_id(product_images(url, sort_order))
        ),
        order_attachments(id, name, file_name, file_size, content_type, url, created_at)
      `)
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    const { order_items, ...rest } = order;
    return {
      data: {
        ...rest,
        items: (order_items as OrderItem[]) || [],
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
  const supabase = getAdminClient();

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

    invalidateOrgCache(data.organization_id, 'orders');
    invalidateOrgCache(data.organization_id, 'dashboard');
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
  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    invalidateOrgCache(data.organization_id, 'orders');
    invalidateOrgCache(data.organization_id, 'dashboard');
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
  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ tracking_number: trackingNumber })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    invalidateOrgCache(data.organization_id, 'orders');
    invalidateOrgCache(data.organization_id, 'dashboard');
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
  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ notes })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    invalidateOrgCache(data.organization_id, 'orders');
    invalidateOrgCache(data.organization_id, 'dashboard');
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
  const supabase = getAdminClient();

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

    invalidateOrgCache(order.organization_id, 'orders');
    invalidateOrgCache(order.organization_id, 'dashboard');
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
  const supabase = getAdminClient();

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

    invalidateOrgCache(order.organization_id, 'orders');
    invalidateOrgCache(order.organization_id, 'dashboard');
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

// Stripe 返金対象の PaymentIntent ID を解決する。
// 優先順位:
//   1. orders.stripe_payment_intent_id（通常のカード/単発決済）
//   2. サブスク決済: notes 内の invoice ID (in_xxx) → その invoice の payment_intent
//      （継続課金で複数 invoice がある場合に、その注文に対応した課金を確実に返金するため）
//   3. フォールバック: notes 内の subscription ID (sub_xxx) → 最新 invoice の payment_intent
//      （初回注文など invoice ID が notes に無い場合の救済）
async function resolveStripeRefundPaymentIntentId(
  stripe: Stripe,
  order: Pick<Order, 'stripe_payment_intent_id' | 'payment_method' | 'notes'>,
  stripeAccountId: string
): Promise<string | null> {
  if (order.stripe_payment_intent_id) {
    return order.stripe_payment_intent_id;
  }

  if (order.payment_method !== 'subscription' || !order.notes) {
    return null;
  }

  // 2. notes に記録された invoice (in_xxx) を直接引く
  const invoiceMatch = order.notes.match(/in_[A-Za-z0-9]+/);
  if (invoiceMatch) {
    try {
      const invoice = (await stripe.invoices.retrieve(
        invoiceMatch[0],
        { expand: ['payment_intent'] },
        { stripeAccount: stripeAccountId }
      )) as Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | string | null };
      const pi = invoice.payment_intent;
      const piId = typeof pi === 'string' ? pi : pi?.id ?? null;
      if (piId) return piId;
    } catch (err) {
      console.warn('[resolveStripeRefundPaymentIntentId] Failed to retrieve invoice:', err);
    }
  }

  // 3. フォールバック: サブスクの最新 invoice
  const subMatch = order.notes.match(/sub_[A-Za-z0-9]+/);
  if (subMatch) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        subMatch[0],
        { expand: ['latest_invoice.payment_intent'] },
        { stripeAccount: stripeAccountId }
      );
      const invoice = subscription.latest_invoice as Stripe.Invoice & {
        payment_intent?: Stripe.PaymentIntent | null;
      };
      return (invoice?.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;
    } catch (err) {
      console.warn(
        '[resolveStripeRefundPaymentIntentId] Failed to retrieve subscription invoice:',
        err
      );
    }
  }

  return null;
}

// 注文が Stripe 経由の決済かどうか（返金漏れ防止のガード判定に使う）
function looksLikeStripePayment(
  order: Pick<Order, 'stripe_payment_intent_id' | 'payment_method'>
): boolean {
  return !!order.stripe_payment_intent_id || order.payment_method === 'subscription';
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
  const supabase = getAdminClient();

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

    // 2. Stripe 返金処理（在庫を戻す前に実行する。返金できない場合は状態を一切変えず中断する）
    if (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_TEST_SECRET_KEY) {
      const { data: org } = await supabase
        .from('organizations')
        .select('stripe_account_id, stripe_test_mode, stripe_test_account_id')
        .eq('id', order.organization_id)
        .single();

      let stripe: Stripe | null = null;
      let stripeAccountId: string | null = null;
      if (org) {
        try {
          const config = getStripeConfig(org);
          stripe = config.stripe;
          stripeAccountId = config.accountId;
        } catch {
          stripe = null;
        }
      }

      if (stripe && stripeAccountId) {

        const paymentIntentId = await resolveStripeRefundPaymentIntentId(
          stripe,
          order,
          stripeAccountId
        );

        if (paymentIntentId) {
          try {
            await stripe.refunds.create(
              { payment_intent: paymentIntentId },
              { stripeAccount: stripeAccountId }
            );
            console.log(`[refundOrder] Stripe refund created for order ${orderId}`);
          } catch (stripeErr) {
            // Stripe 側で既に返金済みの場合はエラーとせずDBの状態だけ更新する
            const isAlreadyRefunded =
              stripeErr instanceof Error &&
              (stripeErr.message.includes('already been refunded') ||
               (stripeErr as { code?: string }).code === 'charge_already_refunded');
            if (isAlreadyRefunded) {
              console.log(`[refundOrder] Charge already refunded in Stripe, updating DB status only: ${orderId}`);
            } else {
              console.error('[refundOrder] Stripe refund failed:', stripeErr);
              const msg = stripeErr instanceof Error ? stripeErr.message : 'Stripe返金に失敗しました';
              return { data: null, error: `Stripe返金エラー: ${msg}` };
            }
          }
        } else if (order.payment_status === 'paid' && looksLikeStripePayment(order)) {
          // 支払い済みなのに返金先 PaymentIntent を特定できない場合、
          // DB だけ「返金済み」にすると Stripe に資金が残ったまま齟齬が生じる。
          // 在庫もまだ戻していないこの時点で中断し、手動対応を促す。
          console.error(
            `[refundOrder] Paid order but could not resolve PaymentIntent, aborting: ${orderId}`
          );
          return {
            data: null,
            error:
              '返金対象の決済（PaymentIntent）を特定できませんでした。注文ステータスは変更していません。Stripeダッシュボードで決済状況を確認し、手動で返金してください。',
          };
        }

        if (order.payment_method === 'subscription' && order.notes) {
          const match = order.notes.match(/sub_[A-Za-z0-9]+/);
          const subId = match ? match[0] : null;
          if (subId) {
            try {
              await stripe.subscriptions.cancel(
                subId,
                { stripeAccount: stripeAccountId }
              );
              console.log(`[refundOrder] Stripe subscription canceled: ${subId}`);
            } catch (err) {
              // キャンセル失敗はログのみ（すでにキャンセル済みの場合もある）
              console.warn('[refundOrder] Failed to cancel subscription:', err);
            }

            // 顧客の subscription.status を canceled・plan を free に更新
            if (order.customer_id) {
              const { data: customerData } = await supabase
                .from('customers')
                .select('custom_fields')
                .eq('id', order.customer_id)
                .single();

              if (customerData) {
                const currentCf = (customerData.custom_fields as Record<string, unknown>) || {};
                const currentSub = (currentCf.subscription as Record<string, unknown>) || {};
                await supabase
                  .from('customers')
                  .update({
                    custom_fields: {
                      ...currentCf,
                      subscription: {
                        ...currentSub,
                        status: 'canceled',
                        cancelAtPeriodEnd: false,
                        updatedAt: new Date().toISOString(),
                      },
                      plan: 'free',
                    },
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', order.customer_id);

                console.log(`[refundOrder] Customer subscription status reset to free: ${order.customer_id}`);
              }
            }
          }
        }
      } else if (order.payment_status === 'paid' && looksLikeStripePayment(order)) {
        console.error(
          `[refundOrder] Paid Stripe order but no connected account, aborting: ${orderId}`
        );
        return {
          data: null,
          error:
            'Stripe連携アカウントが見つからないため自動返金できませんでした。注文ステータスは変更していません。',
        };
      }
    }

    // 3. 在庫を戻す（returnStockがtrueの場合のみ。Stripe返金成功後に実行する）
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

    // 4. 注文ステータスを更新
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

    invalidateOrgCache(order.organization_id, 'orders');
    invalidateOrgCache(order.organization_id, 'dashboard');
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

// Stripe側のみ返金を再実行（DBステータスは変更しない）
// 管理画面で返金済みになっているがStripe上で返金が漏れた場合に使用
export async function retryStripeRefund(orderId: string): Promise<{
  error: string | null;
}> {
  const supabase = getAdminClient();

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { error: '注文が見つかりません' };
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_account_id, stripe_test_mode, stripe_test_account_id')
      .eq('id', order.organization_id)
      .single();

    let stripe: Stripe;
    let accountId: string;
    try {
      const config = getStripeConfig(org ?? {});
      stripe = config.stripe;
      if (!config.accountId) throw new Error('no account');
      accountId = config.accountId;
    } catch {
      return { error: 'StripeアカウントIDが設定されていません' };
    }

    const paymentIntentId = await resolveStripeRefundPaymentIntentId(
      stripe,
      order,
      accountId
    );

    if (!paymentIntentId) {
      return { error: 'PaymentIntent IDが見つかりません。Stripeダッシュボードから手動で返金してください。' };
    }

    await stripe.refunds.create(
      { payment_intent: paymentIntentId },
      { stripeAccount: accountId }
    );

    return { error: null };
  } catch (err) {
    const isAlreadyRefunded =
      err instanceof Error &&
      (err.message.includes('already been refunded') ||
        (err as { code?: string }).code === 'charge_already_refunded');
    if (isAlreadyRefunded) {
      return { error: 'この決済はStripeで既に返金済みです。' };
    }
    console.error('[retryStripeRefund] failed:', err);
    return {
      error: err instanceof Error ? err.message : 'Stripe返金に失敗しました',
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

/** 注文確認・通知メールを再送信する */
export async function resendOrderEmails(orderId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'ログインが必要です' };
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, organization_id')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: '注文が見つかりません' };
  }

  const admin = getAdminClient();
  await sendOrderEmails(admin, order.id, order.organization_id);
  return { success: true, error: null };
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

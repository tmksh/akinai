'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/database';

// 型定義
type Quote = Database['public']['Tables']['quotes']['Row'];
type QuoteItem = Database['public']['Tables']['quote_items']['Row'];
type QuoteStatus = Quote['status'];

// 見積とリレーションを含んだ型
export interface QuoteWithItems extends Quote {
  items: QuoteItem[];
}

// 見積一覧を取得
export async function getQuotes(organizationId: string): Promise<{
  data: QuoteWithItems[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 見積を取得
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (quotesError) throw quotesError;
    if (!quotes || quotes.length === 0) {
      return { data: [], error: null };
    }

    const quoteIds = quotes.map(q => q.id);

    // 見積明細を取得
    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .in('quote_id', quoteIds);

    if (itemsError) throw itemsError;

    // データを結合
    const quotesWithItems: QuoteWithItems[] = quotes.map(quote => ({
      ...quote,
      items: items?.filter(item => item.quote_id === quote.id) || [],
    }));

    return { data: quotesWithItems, error: null };
  } catch (err) {
    console.error('Failed to fetch quotes:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch quotes',
    };
  }
}

// 見積詳細を取得
export async function getQuote(quoteId: string): Promise<{
  data: QuoteWithItems | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 見積を取得
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError) throw quoteError;

    // 見積明細を取得
    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId);

    if (itemsError) throw itemsError;

    return {
      data: {
        ...quote,
        items: items || [],
      },
      error: null,
    };
  } catch (err) {
    console.error('Failed to fetch quote:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch quote',
    };
  }
}

// 見積作成用の入力型
interface CreateQuoteInput {
  organizationId: string;
  customerId?: string | null;
  customerName: string;
  customerCompany?: string | null;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  subtotal: number;
  discount?: number;
  tax: number;
  total: number;
  validUntil: string;
  notes?: string;
  terms?: string;
  status?: QuoteStatus;
  items: {
    productId?: string | null;
    variantId?: string | null;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    notes?: string;
  }[];
}

// 見積番号を生成
async function generateQuoteNumber(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;

  // 今年の最新の見積番号を取得
  const { data } = await supabase
    .from('quotes')
    .select('quote_number')
    .like('quote_number', `${prefix}%`)
    .order('quote_number', { ascending: false })
    .limit(1);

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastNumber = parseInt(data[0].quote_number.replace(prefix, ''), 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

// 見積を作成
export async function createQuote(input: CreateQuoteInput): Promise<{
  data: QuoteWithItems | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 見積番号を生成
    const quoteNumber = await generateQuoteNumber(supabase);

    // 見積を作成
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        organization_id: input.organizationId,
        quote_number: quoteNumber,
        customer_id: input.customerId,
        customer_name: input.customerName,
        customer_company: input.customerCompany,
        subtotal: input.subtotal,
        discount: input.discount || 0,
        tax: input.tax,
        total: input.total,
        valid_until: input.validUntil,
        notes: input.notes,
        terms: input.terms,
        status: input.status || 'draft',
      })
      .select()
      .single();

    if (quoteError) throw quoteError;

    // 見積明細を作成
    const itemsToInsert = input.items.map(item => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const discountAmount = itemSubtotal * ((item.discount || 0) / 100);
      const totalPrice = itemSubtotal - discountAmount;

      return {
        quote_id: quote.id,
        product_id: item.productId,
        variant_id: item.variantId,
        product_name: item.productName,
        variant_name: item.variantName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount || 0,
        total_price: totalPrice,
        notes: item.notes,
      };
    });

    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) throw itemsError;

    revalidatePath('/quotes');

    return {
      data: {
        ...quote,
        items: items || [],
      },
      error: null,
    };
  } catch (err) {
    console.error('Failed to create quote:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create quote',
    };
  }
}

// 見積更新用の入力型
interface UpdateQuoteInput {
  id: string;
  customerId?: string | null;
  customerName?: string;
  customerCompany?: string | null;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  validUntil?: string;
  notes?: string | null;
  terms?: string | null;
  items?: {
    id?: string;
    productId?: string | null;
    variantId?: string | null;
    productName: string;
    variantName: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    notes?: string;
  }[];
}

// 見積を更新
export async function updateQuote(input: UpdateQuoteInput): Promise<{
  data: QuoteWithItems | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 見積を更新
    const updateData: Record<string, unknown> = {};
    if (input.customerId !== undefined) updateData.customer_id = input.customerId;
    if (input.customerName !== undefined) updateData.customer_name = input.customerName;
    if (input.customerCompany !== undefined) updateData.customer_company = input.customerCompany;
    if (input.subtotal !== undefined) updateData.subtotal = input.subtotal;
    if (input.discount !== undefined) updateData.discount = input.discount;
    if (input.tax !== undefined) updateData.tax = input.tax;
    if (input.total !== undefined) updateData.total = input.total;
    if (input.validUntil !== undefined) updateData.valid_until = input.validUntil;
    if (input.notes !== undefined) updateData.notes = input.notes;
    if (input.terms !== undefined) updateData.terms = input.terms;

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single();

    if (quoteError) throw quoteError;

    // 見積明細を更新（全削除→再作成）
    if (input.items) {
      // 既存の明細を削除
      const { error: deleteError } = await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', input.id);

      if (deleteError) throw deleteError;

      // 新しい明細を作成
      const itemsToInsert = input.items.map(item => {
        const itemSubtotal = item.unitPrice * item.quantity;
        const discountAmount = itemSubtotal * ((item.discount || 0) / 100);
        const totalPrice = itemSubtotal - discountAmount;

        return {
          quote_id: input.id,
          product_id: item.productId,
          variant_id: item.variantId,
          product_name: item.productName,
          variant_name: item.variantName,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount || 0,
          total_price: totalPrice,
          notes: item.notes,
        };
      });

      const { error: insertError } = await supabase
        .from('quote_items')
        .insert(itemsToInsert);

      if (insertError) throw insertError;
    }

    // 更新後のデータを取得
    const result = await getQuote(input.id);
    
    revalidatePath('/quotes');
    revalidatePath(`/quotes/${input.id}`);

    return result;
  } catch (err) {
    console.error('Failed to update quote:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update quote',
    };
  }
}

// 見積ステータスを更新
export async function updateQuoteStatus(
  quoteId: string,
  status: QuoteStatus
): Promise<{
  data: Quote | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('quotes')
      .update({ status })
      .eq('id', quoteId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/quotes');
    revalidatePath(`/quotes/${quoteId}`);

    return { data, error: null };
  } catch (err) {
    console.error('Failed to update quote status:', err);
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update quote status',
    };
  }
}

// 見積を削除
export async function deleteQuote(quoteId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 見積明細は CASCADE で自動削除される
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quoteId);

    if (error) throw error;

    revalidatePath('/quotes');

    return { success: true, error: null };
  } catch (err) {
    console.error('Failed to delete quote:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete quote',
    };
  }
}

// 見積を送信（ステータスをsentに変更 + メール送信など）
export async function sendQuote(quoteId: string): Promise<{
  data: Quote | null;
  error: string | null;
}> {
  // ステータスを送信済みに変更
  const result = await updateQuoteStatus(quoteId, 'sent');
  
  // TODO: メール送信処理を追加
  
  return result;
}

// 見積から注文を作成
export async function convertQuoteToOrder(quoteId: string): Promise<{
  orderId: string | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 見積を取得
    const { data: quote, error: quoteError } = await getQuote(quoteId);
    if (quoteError || !quote) {
      throw new Error(quoteError || 'Quote not found');
    }

    // 注文番号を生成
    const year = new Date().getFullYear();
    const orderPrefix = `ORD-${year}-`;
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('order_number')
      .like('order_number', `${orderPrefix}%`)
      .order('order_number', { ascending: false })
      .limit(1);

    let nextOrderNumber = 1;
    if (lastOrder && lastOrder.length > 0) {
      const lastNum = parseInt(lastOrder[0].order_number.replace(orderPrefix, ''), 10);
      if (!isNaN(lastNum)) {
        nextOrderNumber = lastNum + 1;
      }
    }
    const orderNumber = `${orderPrefix}${String(nextOrderNumber).padStart(4, '0')}`;

    // 注文を作成
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        organization_id: quote.organization_id,
        order_number: orderNumber,
        customer_id: quote.customer_id,
        customer_name: quote.customer_name,
        customer_email: '', // 見積には email がないため
        subtotal: quote.subtotal,
        tax: quote.tax,
        total: quote.total,
        status: 'pending',
        payment_status: 'pending',
        shipping_address: {},
        notes: `見積 ${quote.quote_number} から変換`,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 注文明細を作成
    const orderItems = quote.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      variant_id: item.variant_id,
      product_name: item.product_name,
      variant_name: item.variant_name,
      sku: '',
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (orderItemsError) throw orderItemsError;

    // 見積のステータスと注文IDを更新
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'ordered',
        order_id: order.id,
      })
      .eq('id', quoteId);

    if (updateError) throw updateError;

    revalidatePath('/quotes');
    revalidatePath('/orders');

    return { orderId: order.id, error: null };
  } catch (err) {
    console.error('Failed to convert quote to order:', err);
    return {
      orderId: null,
      error: err instanceof Error ? err.message : 'Failed to convert quote to order',
    };
  }
}






import { NextRequest } from 'next/server';
import { 
  validateApiKey, 
  apiError, 
  apiSuccess,
  handleOptions,
  corsHeaders,
} from '@/lib/api/auth';
import { createClient } from '@/lib/supabase/server';

// 注文アイテムの型
interface OrderItem {
  productId: string;
  variantId: string;
  quantity: number;
}

// 配送先の型
interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2?: string;
}

// 注文リクエストの型
interface CreateOrderRequest {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  paymentMethod: 'credit_card' | 'bank_transfer' | 'cod';
  customerId?: string;
  couponCode?: string;
  note?: string;
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

// POST /api/v1/orders - 注文作成
export async function POST(request: NextRequest) {
  // API認証
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status);
  }

  let body: CreateOrderRequest;
  
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  // バリデーション
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return apiError('items is required and must be a non-empty array', 400);
  }

  if (!body.shippingAddress) {
    return apiError('shippingAddress is required', 400);
  }

  const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'postalCode', 'prefecture', 'city', 'address1'];
  for (const field of requiredFields) {
    if (!body.shippingAddress[field as keyof ShippingAddress]) {
      return apiError(`shippingAddress.${field} is required`, 400);
    }
  }

  if (!body.paymentMethod || !['credit_card', 'bank_transfer', 'cod'].includes(body.paymentMethod)) {
    return apiError('paymentMethod must be one of: credit_card, bank_transfer, cod', 400);
  }

  const supabase = await createClient();

  try {
    // 1. 注文アイテムの検証と在庫確認
    const orderItems = [];
    let subtotal = 0;

    for (const item of body.items) {
      if (!item.variantId || !item.quantity || item.quantity < 1) {
        return apiError('Each item must have variantId and quantity >= 1', 400);
      }

      // 商品バリアントを取得
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select(`
          id,
          name,
          sku,
          price,
          stock,
          product_id,
          products(id, name, organization_id)
        `)
        .eq('id', item.variantId)
        .single();

      if (variantError || !variant) {
        return apiError(`Variant ${item.variantId} not found`, 400);
      }

      // 組織が一致するか確認
      // Supabaseのリレーションクエリはオブジェクトを返す
      const product = variant.products as unknown as { id: string; name: string; organization_id: string } | null;
      if (!product || product.organization_id !== auth.organizationId) {
        return apiError(`Variant ${item.variantId} not found`, 400);
      }

      // 予約済み在庫を考慮した利用可能在庫を計算
      const { data: reservedData } = await supabase
        .from('order_items')
        .select('quantity, orders!inner(status, organization_id)')
        .eq('variant_id', item.variantId)
        .eq('orders.organization_id', auth.organizationId)
        .in('orders.status', ['pending', 'confirmed', 'processing']);

      const reservedStock = reservedData?.reduce((sum, r) => sum + r.quantity, 0) || 0;
      const availableStock = variant.stock - reservedStock;

      if (availableStock < item.quantity) {
        return apiError(
          `Insufficient stock for "${product.name} - ${variant.name}". Available: ${availableStock}, Requested: ${item.quantity}`,
          400
        );
      }

      const itemTotal = variant.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: item.productId || product.id,
        variantId: item.variantId,
        productName: product.name,
        variantName: variant.name,
        sku: variant.sku,
        quantity: item.quantity,
        unitPrice: variant.price,
        totalPrice: itemTotal,
      });
    }

    // 2. 金額計算
    const shippingFee = subtotal >= 5500 ? 0 : 500;
    const codFee = body.paymentMethod === 'cod' ? 330 : 0;

    // クーポン処理
    let discount = 0;
    if (body.couponCode === 'WELCOME10') {
      discount = Math.floor(subtotal * 0.1);
    }

    const taxRate = 0.1;
    const tax = Math.floor((subtotal - discount) * taxRate);
    const total = subtotal + shippingFee + codFee + tax - discount;

    // 3. 顧客名の構築
    const customerName = `${body.shippingAddress.lastName} ${body.shippingAddress.firstName}`;

    // 4. 注文を作成
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        organization_id: auth.organizationId,
        order_number: generateOrderNumber(),
        customer_id: body.customerId || null,
        customer_name: customerName,
        customer_email: body.shippingAddress.email,
        subtotal,
        shipping_cost: shippingFee,
        tax,
        total,
        status: body.paymentMethod === 'bank_transfer' ? 'pending' : 'pending',
        payment_status: body.paymentMethod === 'bank_transfer' ? 'pending' : 'pending',
        payment_method: body.paymentMethod,
        shipping_address: {
          postalCode: body.shippingAddress.postalCode,
          prefecture: body.shippingAddress.prefecture,
          city: body.shippingAddress.city,
          line1: body.shippingAddress.address1,
          line2: body.shippingAddress.address2 || null,
          phone: body.shippingAddress.phone,
        },
        billing_address: body.billingAddress ? {
          postalCode: body.billingAddress.postalCode,
          prefecture: body.billingAddress.prefecture,
          city: body.billingAddress.city,
          line1: body.billingAddress.address1,
          line2: body.billingAddress.address2 || null,
          phone: body.billingAddress.phone,
        } : null,
        notes: body.note,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return apiError('Failed to create order', 500);
    }

    // 5. 注文明細を作成
    const orderItemsToInsert = orderItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productName,
      variant_name: item.variantName,
      sku: item.sku,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) {
      // 注文明細の作成に失敗した場合、注文を削除
      await supabase.from('orders').delete().eq('id', order.id);
      console.error('Order items creation error:', itemsError);
      return apiError('Failed to create order items', 500);
    }

    // 6. 在庫引き当て記録（stock_movementsに記録）
    for (const item of orderItems) {
      const { data: variant } = await supabase
        .from('product_variants')
        .select('stock')
        .eq('id', item.variantId)
        .single();

      if (variant) {
        await supabase.from('stock_movements').insert({
          organization_id: auth.organizationId,
          product_id: item.productId,
          variant_id: item.variantId,
          type: 'out' as const,
          quantity: -item.quantity,
          previous_stock: variant.stock,
          new_stock: variant.stock, // 引き当てなので実在庫は変わらない
          reason: '注文引き当て（API経由）',
          reference: order.order_number,
          product_name: item.productName,
          variant_name: item.variantName,
          sku: item.sku,
        });
      }
    }

    // 7. レスポンス
    const responseData: {
      order: {
        id: string;
        orderNumber: string;
        status: string;
        items: typeof orderItems;
        subtotal: number;
        shippingFee: number;
        codFee: number;
        tax: number;
        discount: number;
        total: number;
        currency: string;
        shippingAddress: ShippingAddress;
        paymentMethod: string;
        paymentStatus: string;
        couponCode: string | null;
        note: string | null;
        createdAt: string;
      };
      paymentInstructions?: string;
      nextSteps: string[];
    } = {
      order: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        items: orderItems,
        subtotal,
        shippingFee,
        codFee,
        tax,
        discount,
        total,
        currency: 'JPY',
        shippingAddress: body.shippingAddress,
        paymentMethod: body.paymentMethod,
        paymentStatus: order.payment_status,
        couponCode: body.couponCode || null,
        note: body.note || null,
        createdAt: order.created_at,
      },
      nextSteps: [],
    };

    // 支払い方法に応じた案内
    switch (body.paymentMethod) {
      case 'credit_card':
        responseData.nextSteps = [
          '決済処理が完了しました',
          '注文確認メールをお送りしました',
          '商品の発送準備を開始します',
        ];
        break;
      case 'bank_transfer':
        responseData.paymentInstructions = `
下記口座にお振込みください：
銀行名: サンプル銀行
支店名: 本店
口座種別: 普通
口座番号: 1234567
口座名義: カ）サンプルストア

※お振込み期限: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')}
※振込手数料はお客様負担となります
        `.trim();
        responseData.nextSteps = [
          '注文を受け付けました',
          'お振込みを確認次第、発送準備を開始します',
        ];
        break;
      case 'cod':
        responseData.nextSteps = [
          '注文を受け付けました',
          '商品の発送準備を開始します',
          '商品到着時に配送業者へお支払いください',
        ];
        break;
    }

    const response = apiSuccess(responseData);
    
    // CORSヘッダーを追加
    Object.entries(corsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;

  } catch (error) {
    console.error('Order creation failed:', error);
    return apiError('Internal server error', 500);
  }
}

// GET /api/v1/orders - 注文一覧取得
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status);
  }

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  try {
    let query = supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `, { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, count, error } = await query;

    if (error) {
      console.error('Failed to fetch orders:', error);
      return apiError('Failed to fetch orders', 500);
    }

    const response = apiSuccess({
      orders: orders || [],
      total: count || 0,
      limit,
      offset,
    });

    Object.entries(corsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    console.error('Orders fetch failed:', error);
    return apiError('Internal server error', 500);
  }
}

// OPTIONS /api/v1/orders - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

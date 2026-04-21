import { NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { triggerOrderEmails, sendOrderEmails } from '@/lib/order-emails';
import { 
  validateApiKey, 
  apiError, 
  apiSuccess,
  handleOptions,
  corsHeaders,
} from '@/lib/api/auth';

function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createSupabaseClient(supabaseUrl, supabaseServiceKey);
}

// 注文アイテムの型
interface OrderItem {
  productId: string;
  variantId: string;
  quantity: number;
  customFields?: Record<string, string>; // カスタムフィールド（お名前、記念日など）
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
  paymentMethod: 'credit_card' | 'bank_transfer' | 'cod' | 'none';
  customerId?: string;
  couponCode?: string;
  agentCode?: string;
  note?: string;
  successUrl?: string;
  cancelUrl?: string;
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

  if (!body.paymentMethod || !['credit_card', 'bank_transfer', 'cod', 'none'].includes(body.paymentMethod)) {
    return apiError('paymentMethod must be one of: credit_card, bank_transfer, cod, none', 400);
  }

  const supabase = createClient();

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
        customFields: item.customFields || undefined,
      });
    }

    // 2. 金額計算
    const shippingFee = 0;
    const codFee = body.paymentMethod === 'cod' ? 330 : 0;

    // クーポン処理
    let discount = 0;
    if (body.couponCode === 'WELCOME10') {
      discount = Math.floor(subtotal * 0.1);
    }

    const taxRate = 0.1;
    const tax = Math.floor((subtotal - discount) * taxRate);
    const total = subtotal + shippingFee + codFee + tax - discount;

    // 3. 代理店コードの検証
    let agentId: string | null = null;
    let agentCommissionRate: number | null = null;
    let agentCommissionAmount: number | null = null;
    if (body.agentCode) {
      const { data: agent } = await supabase
        .from('agents')
        .select('id, commission_rate, status')
        .eq('organization_id', auth.organizationId)
        .eq('code', body.agentCode.toUpperCase())
        .single();

      if (agent && agent.status === 'active') {
        agentId = agent.id;
        agentCommissionRate = Number(agent.commission_rate);
        agentCommissionAmount = Math.floor(subtotal * agentCommissionRate / 100);
      }
    }

    // 4. 顧客名の構築
    const customerName = `${body.shippingAddress.lastName} ${body.shippingAddress.firstName}`;

    // 5. 注文を作成
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
        agent_id: agentId,
        agent_code: body.agentCode?.toUpperCase() || null,
        agent_commission_rate: agentCommissionRate,
        agent_commission_amount: agentCommissionAmount,
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

    // 6. 注文明細を作成
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
      custom_fields: item.customFields || null,
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

    // 7. 代理店の累計売上・コミッションを更新
    if (agentId && agentCommissionAmount !== null) {
      // エラーは無視（注文は成立済み）
      await supabase.rpc('increment_agent_totals', {
        p_agent_id: agentId,
        p_sales: subtotal,
        p_commission: agentCommissionAmount,
      });
    }

    // 8. 在庫引き当て記録（stock_movementsに記録）
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

    // 9. レスポンス
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
        agentCode: string | null;
        agentCommissionAmount: number | null;
        note: string | null;
        createdAt: string;
      };
      checkoutUrl?: string | null;
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
        agentCode: body.agentCode?.toUpperCase() || null,
        agentCommissionAmount,
        note: body.note || null,
        createdAt: order.created_at,
      },
      checkoutUrl: null,
      nextSteps: [],
    };

    // 支払い方法に応じた案内
    switch (body.paymentMethod) {
      case 'credit_card': {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        if (stripeSecretKey) {
          // 組織の Stripe Connect アカウントを取得
          const { data: orgRow } = await supabase
            .from('organizations')
            .select('stripe_account_id, settings')
            .eq('id', auth.organizationId)
            .single();

          const stripeAccountId = orgRow?.stripe_account_id as string | null;
          const orgSettings = (orgRow?.settings as Record<string, unknown>) || {};
          const stripeLinkDisabled = orgSettings.stripe_link_disabled === true;

          if (stripeAccountId) {
            try {
              const stripe = new Stripe(stripeSecretKey);

              const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = orderItems.map(item => ({
                price_data: {
                  currency: 'jpy',
                  product_data: {
                    name: `${item.productName}（${item.variantName}）`,
                  },
                  unit_amount: item.unitPrice,
                },
                quantity: item.quantity,
              }));

              if (shippingFee > 0) {
                lineItems.push({
                  price_data: { currency: 'jpy', product_data: { name: '送料' }, unit_amount: shippingFee },
                  quantity: 1,
                });
              }

              const session = await stripe.checkout.sessions.create(
                {
                  payment_method_types: ['card'],
                  line_items: lineItems,
                  mode: 'payment',
                  success_url: body.successUrl || `${appUrl}/shop/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
                  cancel_url: body.cancelUrl || `${appUrl}/shop/checkout/confirm`,
                  customer_email: body.shippingAddress.email,
                  metadata: { order_id: order.id, organization_id: auth.organizationId ?? '' },
                  payment_intent_data: {
                    metadata: { order_id: order.id, organization_id: auth.organizationId ?? '' },
                  },
                  // Stripe Link の「情報を保存」UIを非表示にする設定
                  ...(stripeLinkDisabled && {
                    consent_collection: {
                      payment_method_reuse_agreement: { position: 'hidden' },
                    },
                  }),
                },
                { stripeAccount: stripeAccountId }
              );

              await supabase
                .from('orders')
                .update({ stripe_checkout_session_id: session.id })
                .eq('id', order.id);

              responseData.checkoutUrl = session.url;
            } catch (e) {
              console.error('Stripe Checkout Session error:', e);
            }
          }
        }

        responseData.nextSteps = responseData.checkoutUrl
          ? ['以下のURLへリダイレクトして決済を完了してください']
          : ['決済URLの発行に失敗しました。管理画面からStripe Connect設定を確認してください'];
        break;
      }
      case 'bank_transfer': {
        const accountTypeLabel: Record<string, string> = {
          ordinary: '普通',
          current: '当座',
          savings: '貯蓄',
        };
        const { data: orgRow } = await supabase
          .from('organizations')
          .select('settings')
          .eq('id', auth.organizationId)
          .single();
        const settings = (orgRow?.settings as Record<string, unknown>) || {};
        const bank = settings.bank_transfer as {
          bankName?: string;
          branchName?: string;
          accountType?: string;
          accountNumber?: string;
          accountHolder?: string;
          transferDeadlineDays?: number;
        } | undefined;
        const days = bank?.transferDeadlineDays ?? 7;
        const deadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP');

        if (bank?.bankName && bank?.accountNumber && bank?.accountHolder) {
          responseData.paymentInstructions = `
下記口座にお振込みください：
銀行名: ${bank.bankName}
支店名: ${bank.branchName || '―'}
口座種別: ${accountTypeLabel[bank.accountType || 'ordinary'] || bank.accountType || '普通'}
口座番号: ${bank.accountNumber}
口座名義: ${bank.accountHolder}

※お振込み期限: ${deadline}
※振込手数料はお客様負担となります
          `.trim();
        } else {
          responseData.paymentInstructions = '振込先は注文確認メールでご案内します。';
        }
        responseData.nextSteps = [
          '注文を受け付けました',
          'お振込みを確認次第、発送準備を開始します',
        ];
        break;
      }
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
    
    // クレカ以外（銀行振込・代引き）は注文作成時点でメール送信
    // akinai サーバー上で直接 sendOrderEmails を呼ぶ（自己HTTP呼び出しを避けるため）
    if (body.paymentMethod !== 'credit_card') {      await sendOrderEmails(supabase, order.id, auth.organizationId ?? null);
    } else {
      console.log('[Order Email] Skipping email for credit_card (handled by Stripe webhook)');
    }

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

  const supabase = createClient();
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

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  corsHeaders,
  withApiLogging,
} from '@/lib/api/auth';

// チェックアウトリクエストの型
interface CheckoutItem {
  variantId: string;
  quantity: number;
}

interface CheckoutRequest {
  items: CheckoutItem[];
  shippingAddress: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    postalCode: string;
    prefecture: string;
    city: string;
    address1: string;
    address2?: string;
  };
  customerId?: string;
  couponCode?: string;
  note?: string;
  /** 'payment_intent' (デフォルト) or 'checkout_session' */
  mode?: 'payment_intent' | 'checkout_session';
  /** checkout_session 用の成功/キャンセルURL */
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

/**
 * POST /api/v1/checkout
 *
 * カート内容から決済を開始する。
 * mode=payment_intent  → Stripe PaymentIntent を作成し client_secret を返す
 * mode=checkout_session → Stripe Checkout Session を作成し url を返す
 */
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    // --- 環境変数チェック ---
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return apiError('Server configuration error', 500);
    }
    if (!stripeSecretKey) {
      return apiError('Payment service is not configured', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- リクエスト解析 ---
    let body: CheckoutRequest;
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
      if (!body.shippingAddress[field as keyof typeof body.shippingAddress]) {
        return apiError(`shippingAddress.${field} is required`, 400);
      }
    }

    const mode = body.mode || 'payment_intent';

    if (mode === 'checkout_session') {
      if (!body.successUrl) return apiError('successUrl is required for checkout_session mode', 400);
      if (!body.cancelUrl) return apiError('cancelUrl is required for checkout_session mode', 400);
    }

    // --- 組織の Stripe Connect アカウントを取得 ---
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_account_id, stripe_onboarding_complete, settings')
      .eq('id', auth.organizationId)
      .single();

    if (orgError || !org) {
      return apiError('Organization not found', 404);
    }
    if (!org.stripe_account_id || !org.stripe_onboarding_complete) {
      return apiError('Payment is not set up for this store. Please contact the store owner.', 400);
    }

    // --- 商品・バリアント検証 & 金額計算（サーバーサイドで確定） ---
    const variantIds = body.items.map(i => i.variantId);

    const { data: variants, error: variantError } = await supabase
      .from('product_variants')
      .select(`
        id, name, sku, price, stock, compare_at_price, product_id,
        products!inner(id, name, organization_id, status)
      `)
      .in('id', variantIds);

    if (variantError || !variants) {
      return apiError('Failed to validate items', 500);
    }

    const variantMap = new Map(variants.map(v => [v.id, v]));

    const orderItems: {
      productId: string;
      variantId: string;
      productName: string;
      variantName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[] = [];
    let subtotal = 0;

    for (const item of body.items) {
      if (!item.variantId || !item.quantity || item.quantity < 1) {
        return apiError('Each item must have variantId and quantity >= 1', 400);
      }

      const variant = variantMap.get(item.variantId) as Record<string, unknown> | undefined;
      if (!variant) {
        return apiError(`Variant ${item.variantId} not found`, 400);
      }

      const product = variant.products as Record<string, unknown>;
      if (!product || product.organization_id !== auth.organizationId) {
        return apiError(`Variant ${item.variantId} not found`, 400);
      }
      if (product.status !== 'published') {
        return apiError(`Product "${product.name}" is not available`, 400);
      }

      const stock = Number(variant.stock) || 0;
      if (stock < item.quantity) {
        return apiError(
          `Insufficient stock for "${product.name} - ${variant.name}". Available: ${stock}, Requested: ${item.quantity}`,
          400
        );
      }

      const price = Number(variant.price) || 0;
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product.id as string,
        variantId: variant.id as string,
        productName: product.name as string,
        variantName: variant.name as string,
        sku: variant.sku as string,
        quantity: item.quantity,
        unitPrice: price,
        totalPrice: itemTotal,
      });
    }

    // 送料計算
    const settings = (org.settings || {}) as Record<string, unknown>;
    const shippingSettings = (settings.shipping || {}) as Record<string, unknown>;
    const freeShippingThreshold = Number(shippingSettings.free_shipping_threshold) || 5500;
    const defaultShippingFee = Number(shippingSettings.default_shipping_fee) || 500;
    const shippingFee = subtotal >= freeShippingThreshold ? 0 : defaultShippingFee;

    // 税計算
    const taxRate = 0.1;
    const tax = Math.floor(subtotal * taxRate);
    const total = subtotal + shippingFee + tax;

    // --- 注文レコードを「未決済」で作成 ---
    const customerName = `${body.shippingAddress.lastName} ${body.shippingAddress.firstName}`;
    const orderNumber = generateOrderNumber();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        organization_id: auth.organizationId,
        order_number: orderNumber,
        customer_id: body.customerId || null,
        customer_name: customerName,
        customer_email: body.shippingAddress.email,
        subtotal,
        shipping_cost: shippingFee,
        tax,
        total,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'credit_card',
        shipping_address: {
          postalCode: body.shippingAddress.postalCode,
          prefecture: body.shippingAddress.prefecture,
          city: body.shippingAddress.city,
          line1: body.shippingAddress.address1,
          line2: body.shippingAddress.address2 || null,
          phone: body.shippingAddress.phone,
        },
        notes: body.note,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Order creation error:', orderError);
      return apiError('Failed to create order', 500);
    }

    // 注文明細を作成
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(
        orderItems.map(item => ({
          order_id: order.id,
          product_id: item.productId,
          variant_id: item.variantId,
          product_name: item.productName,
          variant_name: item.variantName,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
        }))
      );

    if (itemsError) {
      await supabase.from('orders').delete().eq('id', order.id);
      console.error('Order items creation error:', itemsError);
      return apiError('Failed to create order items', 500);
    }

    // --- Stripe で決済を作成 ---
    const stripe = new Stripe(stripeSecretKey);

    try {
      if (mode === 'checkout_session') {
        // --- Checkout Session モード ---
        const session = await stripe.checkout.sessions.create(
          {
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: orderItems.map(item => ({
              price_data: {
                currency: 'jpy',
                product_data: {
                  name: `${item.productName} - ${item.variantName}`,
                },
                unit_amount: item.unitPrice,
              },
              quantity: item.quantity,
            })),
            ...(shippingFee > 0
              ? {
                  shipping_options: [
                    {
                      shipping_rate_data: {
                        type: 'fixed_amount' as const,
                        fixed_amount: { amount: shippingFee, currency: 'jpy' },
                        display_name: '配送料',
                      },
                    },
                  ],
                }
              : {}),
            metadata: {
              order_id: order.id,
              order_number: orderNumber,
              organization_id: auth.organizationId as string,
            },
            success_url: body.successUrl!,
            cancel_url: body.cancelUrl!,
          },
          { stripeAccount: org.stripe_account_id }
        );

        // checkout session id を注文に保存
        await supabase
          .from('orders')
          .update({ notes: `${order.notes || ''}\n[stripe_session_id:${session.id}]`.trim() })
          .eq('id', order.id);

        const response = apiSuccess(
          {
            mode: 'checkout_session',
            checkoutUrl: session.url,
            sessionId: session.id,
            order: {
              id: order.id,
              orderNumber,
            },
          },
          undefined,
          auth.rateLimit
        );
        Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
        return response;
      } else {
        // --- PaymentIntent モード（デフォルト） ---
        const paymentIntent = await stripe.paymentIntents.create(
          {
            amount: total,
            currency: 'jpy',
            metadata: {
              order_id: order.id,
              order_number: orderNumber,
              organization_id: auth.organizationId as string,
            },
          },
          { stripeAccount: org.stripe_account_id }
        );

        // payment intent id を注文に保存
        await supabase
          .from('orders')
          .update({ notes: `${order.notes || ''}\n[stripe_payment_intent:${paymentIntent.id}]`.trim() })
          .eq('id', order.id);

        const response = apiSuccess(
          {
            mode: 'payment_intent',
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null,
            stripeAccount: org.stripe_account_id,
            order: {
              id: order.id,
              orderNumber,
              subtotal,
              shippingFee,
              tax,
              total,
              currency: 'JPY',
            },
          },
          undefined,
          auth.rateLimit
        );
        Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
        return response;
      }
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      // Stripe が失敗した場合は注文をキャンセル
      await supabase.from('orders').update({ status: 'cancelled', payment_status: 'failed' }).eq('id', order.id);
      return apiError('Payment processing failed. Please try again.', 500);
    }
  });
}

// OPTIONS /api/v1/checkout - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

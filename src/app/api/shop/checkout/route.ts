import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { triggerOrderEmails } from '@/lib/order-emails';

/**
 * POST /api/shop/checkout
 *
 * 公開ECショップからの注文作成 + Stripe Checkout URL発行
 * 認証不要（公開エンドポイント）
 */

function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${y}${m}${d}-${rand}`;
}

interface CartItem {
  productId: string;
  variantId: string;
  name: string;
  variantName?: string;
  sku?: string;
  price: number;
  quantity: number;
}

interface ShippingInfo {
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  line1: string;
  line2?: string;
}

interface CheckoutRequest {
  items: CartItem[];
  shipping: ShippingInfo;
  paymentMethod: 'credit_card' | 'bank_transfer' | 'cod';
  successUrl?: string;
  cancelUrl?: string;
}

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  let body: CheckoutRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.items?.length) {
    return NextResponse.json({ error: 'カートが空です' }, { status: 400 });
  }
  if (!body.shipping) {
    return NextResponse.json({ error: '配送先情報が必要です' }, { status: 400 });
  }
  if (!['credit_card', 'bank_transfer', 'cod'].includes(body.paymentMethod)) {
    return NextResponse.json({ error: '支払い方法が不正です' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // リクエストのホスト名からショップの組織を特定
  const host = request.headers.get('host') || '';
  const hostname = host.replace(/:\d+$/, ''); // ポート番号を除去

  let org = null;

  // 1. ホスト名でfrontend_urlが一致する組織を検索
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, stripe_account_id, settings, frontend_url');

  if (orgs) {
    org = orgs.find(o => {
      if (!o.frontend_url) return false;
      try {
        const url = new URL(o.frontend_url as string);
        return url.hostname === hostname;
      } catch {
        return false;
      }
    }) || null;
  }

  // 2. 環境変数でフォールバック
  if (!org) {
    const envOrgId = process.env.NEXT_PUBLIC_ORGANIZATION_ID;
    if (envOrgId && orgs) {
      org = orgs.find(o => o.id === envOrgId) || null;
    }
  }

  // 3. 最終フォールバック（先頭の組織）
  if (!org && orgs && orgs.length > 0) {
    org = orgs[0];
  }

  if (!org) {
    return NextResponse.json({ error: 'ショップ情報の取得に失敗しました' }, { status: 500 });
  }

  // 金額計算
  const subtotal = body.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 5000 ? 0 : 550;
  const codFee = body.paymentMethod === 'cod' ? 330 : 0;
  const taxRate = 0.1;
  const tax = Math.floor(subtotal * taxRate);
  const total = subtotal + shippingFee + codFee + tax;

  // 注文をDBに作成
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      organization_id: org.id,
      order_number: generateOrderNumber(),
      customer_name: body.shipping.name,
      customer_email: body.shipping.email,
      subtotal,
      shipping_cost: shippingFee,
      tax,
      total,
      status: 'pending',
      payment_status: 'pending',
      payment_method: body.paymentMethod,
      shipping_address: {
        postalCode: body.shipping.postalCode,
        prefecture: body.shipping.prefecture,
        city: body.shipping.city,
        line1: body.shipping.line1,
        line2: body.shipping.line2 || null,
        phone: body.shipping.phone,
      },
    })
    .select()
    .single();

  if (orderError || !order) {
    console.error('Order creation error:', orderError);
    return NextResponse.json({ error: '注文の作成に失敗しました' }, { status: 500 });
  }

  // 注文明細を作成
  const orderItems = body.items.map(item => ({
    order_id: order.id,
    product_id: item.productId,
    variant_id: item.variantId,
    product_name: item.name,
    variant_name: item.variantName || '',
    sku: item.sku || '',
    quantity: item.quantity,
    unit_price: item.price,
    total_price: item.price * item.quantity,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id);
    return NextResponse.json({ error: '注文明細の作成に失敗しました' }, { status: 500 });
  }

  // クレジットカードの場合は Stripe Checkout Session を作成
  if (body.paymentMethod === 'credit_card') {
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe設定がありません' }, { status: 500 });
    }

    const stripeAccountId = org.stripe_account_id as string | null;
    if (!stripeAccountId) {
      return NextResponse.json(
        { error: 'このショップはまだクレジットカード決済に対応していません' },
        { status: 400 }
      );
    }

    try {
      const stripe = new Stripe(stripeSecretKey);

      const successUrl = body.successUrl || `${appUrl}/shop/checkout/complete?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = body.cancelUrl || `${appUrl}/shop/checkout/confirm`;

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = body.items.map(item => ({
        price_data: {
          currency: 'jpy',
          product_data: {
            name: item.variantName ? `${item.name}（${item.variantName}）` : item.name,
          },
          unit_amount: item.price,
        },
        quantity: item.quantity,
      }));

      // 送料を追加
      if (shippingFee > 0) {
        lineItems.push({
          price_data: {
            currency: 'jpy',
            product_data: { name: '送料' },
            unit_amount: shippingFee,
          },
          quantity: 1,
        });
      }

      // 代引手数料を追加（cod の場合は来ないが念のため）
      if (codFee > 0) {
        lineItems.push({
          price_data: {
            currency: 'jpy',
            product_data: { name: '代引手数料' },
            unit_amount: codFee,
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create(
        {
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: successUrl,
          cancel_url: cancelUrl,
          customer_email: body.shipping.email,
          metadata: {
            order_id: order.id,
            organization_id: org.id,
          },
          payment_intent_data: {
            metadata: {
              order_id: order.id,
              organization_id: org.id,
            },
          },
        },
        { stripeAccount: stripeAccountId }
      );

      // checkout_session_id を注文に保存
      await supabase
        .from('orders')
        .update({ stripe_checkout_session_id: session.id })
        .eq('id', order.id);

      return NextResponse.json({
        orderId: order.id,
        orderNumber: order.order_number,
        checkoutUrl: session.url,
      });
    } catch (err) {
      console.error('Stripe Checkout Session creation error:', err);
      // セッション作成失敗時は注文を削除
      await supabase.from('order_items').delete().eq('order_id', order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      return NextResponse.json({ error: '決済ページの作成に失敗しました' }, { status: 500 });
    }
  }

  // 銀行振込・代引きの場合はそのまま完了
  const settings = (org.settings as Record<string, unknown>) || {};
  const bank = settings.bank_transfer as {
    bankName?: string; branchName?: string; accountType?: string;
    accountNumber?: string; accountHolder?: string; transferDeadlineDays?: number;
  } | undefined;

  const paymentInstructions = body.paymentMethod === 'bank_transfer' && bank?.bankName
    ? `銀行名: ${bank.bankName} / 支店: ${bank.branchName || '-'} / 口座番号: ${bank.accountNumber} / 名義: ${bank.accountHolder}`
    : null;

  // 銀行振込・代引きは注文作成時点でメール送信（Stripeイベントがないため）
  // akinai 側の内部エンドポイント経由で送信することで、RESEND_API_KEY を一元管理する
  await triggerOrderEmails(order.id, org.id as string);

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.order_number,
    checkoutUrl: null,
    paymentInstructions,
  });
}

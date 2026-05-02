/**
 * /api/v1/customer/service-checkout
 *
 * エンドユーザー（顧客）向け単発払いサービスの Checkout Session 作成。
 * - Authorization: Bearer <customer_jwt>
 *
 * POST: { serviceId, successUrl?, cancelUrl? }
 *   1. orders テーブルに「pending」で注文を事前作成
 *   2. Stripe Checkout Session（mode: 'payment'）を作成
 *   3. { url, sessionId, orderId } を返す
 *
 * 決済完了後は既存の checkout.session.completed webhook が
 * 注文を「paid/confirmed」に更新し、確認メールを送信する。
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { verifyCustomerToken } from '@/lib/api/customer-auth';
import { corsHeaders, handleOptions } from '@/lib/api/auth';
import { readOneTimeServicesSettings } from '@/lib/customer-one-time-services';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function jsonError(message: string, status: number) {
  const res = NextResponse.json({ error: message }, { status });
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function jsonSuccess<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status });
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

export async function POST(request: NextRequest) {
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) return jsonError('Stripe is not configured', 500);

  let body: { serviceId?: string; successUrl?: string; cancelUrl?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }
  if (!body.serviceId) return jsonError('serviceId is required', 400);

  const supabase = getAdminSupabase();

  const { data: org } = await supabase
    .from('organizations')
    .select('id, settings, stripe_account_id, frontend_url')
    .eq('id', verify.payload.org)
    .single();

  if (!org) return jsonError('Organization not found', 404);
  if (!org.stripe_account_id) return jsonError('Stripe is not connected', 400);

  const servicesSettings = readOneTimeServicesSettings(
    org.settings as Record<string, unknown> | null
  );
  if (!servicesSettings.enabled) return jsonError('One-time services are disabled', 400);

  const service = servicesSettings.services.find((s) => s.id === body.serviceId);
  if (!service) return jsonError('Service not found', 404);
  if (!service.isActive) return jsonError('Service is not available', 400);

  const { data: customer } = await supabase
    .from('customers')
    .select('id, email, name')
    .eq('id', verify.payload.sub)
    .eq('organization_id', verify.payload.org)
    .single();

  if (!customer) return jsonError('Customer not found', 404);

  // 注文を事前作成（pending）
  const orderNumber = generateOrderNumber();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      organization_id: verify.payload.org,
      order_number: orderNumber,
      customer_id: customer.id,
      customer_name: customer.name || '',
      customer_email: customer.email || '',
      subtotal: service.amount,
      shipping_cost: 0,
      tax: 0,
      total: service.amount,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'credit_card',
      notes: `単発サービス: ${service.name}`,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('Failed to create service order:', orderError);
    return jsonError('Failed to create order', 500);
  }

  // order_items にサービスを1行追加
  await supabase.from('order_items').insert({
    order_id: order.id,
    product_id: null,
    variant_id: null,
    product_name: service.name,
    variant_name: null,
    sku: null,
    quantity: 1,
    unit_price: service.amount,
    total_price: service.amount,
  });

  const stripe = new Stripe(stripeSecretKey);
  const baseUrl =
    body.successUrl || body.cancelUrl
      ? null
      : org.frontend_url || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const successUrl = body.successUrl || `${baseUrl}/mypage?service=success`;
  const cancelUrl = body.cancelUrl || `${baseUrl}/mypage?service=canceled`;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{ price: service.stripePriceId, quantity: 1 }],
        customer_email: customer.email || undefined,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          order_id: order.id,
          organization_id: verify.payload.org,
          customer_id: customer.id,
          service_id: service.id,
        },
        payment_intent_data: {
          metadata: {
            order_id: order.id,
            organization_id: verify.payload.org,
          },
        },
      },
      { stripeAccount: org.stripe_account_id }
    );
  } catch (err) {
    console.error('Failed to create checkout session:', err);
    // Checkout 作成失敗時は作成した注文を削除
    await supabase.from('orders').delete().eq('id', order.id);
    return jsonError('Failed to create checkout session', 500);
  }

  return jsonSuccess({ url: session.url, sessionId: session.id, orderId: order.id });
}

export async function OPTIONS() {
  return handleOptions();
}

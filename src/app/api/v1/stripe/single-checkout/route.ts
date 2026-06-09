/**
 * /api/v1/stripe/single-checkout
 *
 * 外部サイト（自社サイトなど）から AKINAI_API_KEY で呼び出す
 * 単発払いサービスの Checkout Session 発行エンドポイント。
 *
 * POST: {
 *   serviceId:  string           // 単発サービスID
 *   customerId: string           // Akinai 顧客ID
 *   successUrl: string
 *   cancelUrl:  string
 *   metadata?:  Record<string, string>  // 任意（Stripe metadata に追記される）
 * }
 * → { url, sessionId, orderId }
 *
 * 決済完了後は checkout.session.completed webhook が
 * 注文を paid/confirmed に更新し、確認メールを送信する。
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { validateApiKey, corsHeaders, handleOptions } from '@/lib/api/auth';
import { readOneTimeServicesSettings } from '@/lib/customer-one-time-services';
import { getStripeConfig } from '@/lib/stripe-client';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function jsonError(message: string, status: number) {
  const res = NextResponse.json({ error: message }, { status });
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function jsonSuccess<T>(data: T) {
  const res = NextResponse.json(data, { status: 200 });
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

import { generateOrderNumber } from '@/lib/generate-order-number';

/** metadata の値をすべて文字列に変換（Stripe の制約） */
function sanitizeMetadata(
  raw: Record<string, unknown> | undefined
): Record<string, string> {
  if (!raw) return {};
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => [k, String(v)])
  );
}

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) return jsonError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  const organizationId = auth.organizationId!;

  let body: {
    serviceId?: string;
    customerId?: string;
    successUrl?: string;
    cancelUrl?: string;
    metadata?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  if (!body.serviceId) return jsonError('serviceId is required', 400);
  if (!body.customerId) return jsonError('customerId is required', 400);
  if (!body.successUrl) return jsonError('successUrl is required', 400);
  if (!body.cancelUrl) return jsonError('cancelUrl is required', 400);

  const supabase = getAdminSupabase();

  // 組織情報を取得
  const { data: org } = await supabase
    .from('organizations')
    .select('id, settings, stripe_account_id, stripe_test_mode, stripe_test_account_id')
    .eq('id', organizationId)
    .single();

  if (!org) return jsonError('Organization not found', 404);

  let stripeConfig;
  try {
    stripeConfig = getStripeConfig(org);
  } catch {
    return jsonError('Stripe is not configured', 500);
  }
  const { stripe, accountId } = stripeConfig;
  if (!accountId) return jsonError('Stripe is not connected', 400);

  // 単発サービス設定を確認
  const servicesSettings = readOneTimeServicesSettings(
    org.settings as Record<string, unknown> | null
  );
  if (!servicesSettings.enabled) return jsonError('One-time services are disabled', 400);

  const service = servicesSettings.services.find((s) => s.id === body.serviceId);
  if (!service) return jsonError('Service not found', 404);
  if (!service.isActive) return jsonError('Service is not available', 400);

  // 顧客が同一テナントに属するか検証
  const { data: customer } = await supabase
    .from('customers')
    .select('id, email, name')
    .eq('id', body.customerId)
    .eq('organization_id', organizationId)
    .single();

  if (!customer) return jsonError('Customer not found', 404);

  // 注文を事前作成（pending）
  const orderNumber = await generateOrderNumber(supabase);
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      organization_id: organizationId,
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
      shipping_address: {},
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
    variant_name: '',
    sku: '',
    quantity: 1,
    unit_price: service.amount,
    total_price: service.amount,
  });

  // Stripe Checkout Session を作成
  const extraMetadata = sanitizeMetadata(body.metadata);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{ price: service.stripePriceId, quantity: 1 }],
        customer_email: customer.email || undefined,
        success_url: body.successUrl,
        cancel_url: body.cancelUrl,
        metadata: {
          order_id: order.id,
          organization_id: organizationId,
          customer_id: customer.id,
          service_id: service.id,
          ...extraMetadata,
        },
        payment_intent_data: {
          metadata: {
            order_id: order.id,
            organization_id: organizationId,
          },
        },
      },
      { stripeAccount: accountId }
    );
  } catch (err) {
    console.error('Failed to create checkout session:', err);
    await supabase.from('orders').delete().eq('id', order.id);
    return jsonError('Failed to create checkout session', 500);
  }

  return jsonSuccess({ url: session.url, sessionId: session.id, orderId: order.id });
}

export async function OPTIONS() {
  return handleOptions();
}

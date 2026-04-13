import { NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  withApiLogging,
  handleOptions,
  corsHeaders,
} from '@/lib/api/auth';

function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;
type OrderStatus = typeof VALID_STATUSES[number];

const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
type PaymentStatus = typeof VALID_PAYMENT_STATUSES[number];

/** PUT /api/v1/orders/:id/status — 注文ステータス更新 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await validateApiKey(request);
  return withApiLogging(request, auth, async () => {
    if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

    let body: { status?: string; paymentStatus?: string; trackingNumber?: string; note?: string };
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    if (!body.status && !body.paymentStatus && !body.trackingNumber) {
      return apiError('status, paymentStatus, or trackingNumber is required', 400);
    }

    if (body.status && !VALID_STATUSES.includes(body.status as OrderStatus)) {
      return apiError(`status must be one of: ${VALID_STATUSES.join(', ')}`, 400);
    }

    if (body.paymentStatus && !VALID_PAYMENT_STATUSES.includes(body.paymentStatus as PaymentStatus)) {
      return apiError(`paymentStatus must be one of: ${VALID_PAYMENT_STATUSES.join(', ')}`, 400);
    }

    const supabase = createClient();

    // 注文の存在確認
    const { data: existing } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .eq('id', id)
      .eq('organization_id', auth.organizationId!)
      .single();

    if (!existing) return apiError('Order not found', 404);

    // 更新データ構築
    const updates: Record<string, unknown> = {};
    if (body.status) updates.status = body.status;
    if (body.paymentStatus) updates.payment_status = body.paymentStatus;
    if (body.trackingNumber !== undefined) updates.tracking_number = body.trackingNumber;
    if (body.note !== undefined) updates.notes = body.note;

    // shipped になったら shipped_at を記録
    if (body.status === 'shipped') updates.shipped_at = new Date().toISOString();
    if (body.status === 'delivered') updates.delivered_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', auth.organizationId!)
      .select(`*, items:order_items(*)`)
      .single();

    if (error) return apiError('Failed to update order status', 500);

    const response = apiSuccess({ order: updated });
    Object.entries(corsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  });
}

export async function OPTIONS() {
  return handleOptions();
}

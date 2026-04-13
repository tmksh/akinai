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

/** GET /api/v1/orders/:id — 注文詳細 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await validateApiKey(request);
  return withApiLogging(request, auth, async () => {
    if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

    const supabase = createClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*)
      `)
      .eq('id', id)
      .eq('organization_id', auth.organizationId!)
      .single();

    if (error || !order) return apiError('Order not found', 404);

    const response = apiSuccess({ order });
    Object.entries(corsHeaders()).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  });
}

export async function OPTIONS() {
  return handleOptions();
}

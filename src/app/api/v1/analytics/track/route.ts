import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  corsHeaders,
  withApiLogging,
} from '@/lib/api/auth';

export function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/analytics/track
 * 商品ページの閲覧・クリックを記録
 *
 * Body:
 *   type        "view" | "click"     イベント種別
 *   productId   string               商品ID
 *   supplierId  string (任意)        サプライヤー顧客ID（自動解決も可）
 *   customerId  string (任意)        ログイン顧客ID
 *   sessionId   string (任意)        セッションID（非ログイン）
 *   clickType   "detail"|"buy"|"inquiry"  (click時のみ)
 *   referrer    string (任意)
 */
export async function POST(request: NextRequest) {
  return withApiLogging(request, 'POST /api/v1/analytics/track', async () => {
    const auth = await validateApiKey(request);
    if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

    const body = await request.json().catch(() => null);
    if (!body) return apiError('Invalid JSON body', 400);

    const { type, productId, supplierId, customerId, sessionId, clickType, referrer } = body as {
      type?: string;
      productId?: string;
      supplierId?: string;
      customerId?: string;
      sessionId?: string;
      clickType?: string;
      referrer?: string;
    };

    if (!type || !['view', 'click'].includes(type)) {
      return apiError('type must be "view" or "click"', 400);
    }
    if (!productId) return apiError('productId is required', 400);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // アナリティクス機能フラグ確認
    const { data: org } = await supabase
      .from('organizations')
      .select('features')
      .eq('id', auth.organizationId!)
      .single();

    const features = (org?.features as Record<string, boolean>) || {};
    if (!features.analytics) {
      // 無効の場合は 204 で無視（エラーにしない）
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    // supplierIdが未指定の場合は商品から取得
    let resolvedSupplierId = supplierId;
    if (!resolvedSupplierId) {
      const { data: product } = await supabase
        .from('products')
        .select('supplier_id')
        .eq('id', productId)
        .eq('organization_id', auth.organizationId!)
        .single();
      resolvedSupplierId = product?.supplier_id || undefined;
    }

    if (type === 'view') {
      await supabase.from('page_views').insert({
        organization_id: auth.organizationId!,
        product_id: productId,
        supplier_id: resolvedSupplierId || null,
        customer_id: customerId || null,
        session_id: sessionId || null,
        referrer: referrer || null,
      });
    } else {
      await supabase.from('product_clicks').insert({
        organization_id: auth.organizationId!,
        product_id: productId,
        supplier_id: resolvedSupplierId || null,
        customer_id: customerId || null,
        session_id: sessionId || null,
        click_type: clickType || 'detail',
      });
    }

    return apiSuccess({ tracked: true }, 'Tracked', 201);
  });
}

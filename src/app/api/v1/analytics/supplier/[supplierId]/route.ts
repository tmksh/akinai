import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  withApiLogging,
} from '@/lib/api/auth';

export function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/analytics/supplier/:supplierId
 * 直近6ヶ月の月別閲覧数・クリック数・商品ランキング
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  const { supplierId } = await params;
  const auth = await validateApiKey(request);

  return withApiLogging(request, auth, async () => {
    if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // アナリティクス機能フラグ確認
    const { data: org } = await supabase
      .from('organizations')
      .select('features, plan')
      .eq('id', auth.organizationId!)
      .single();

    const features = (org?.features as Record<string, boolean>) || {};
    if (!features.analytics) {
      return apiError('Analytics feature is not enabled for this organization. Please upgrade your plan.', 403);
    }

    // サプライヤー確認
    const { data: supplier } = await supabase
      .from('customers')
      .select('id, name, role')
      .eq('id', supplierId)
      .eq('organization_id', auth.organizationId!)
      .single();

    if (!supplier) return apiError('Supplier not found', 404);

    // 直近6ヶ月の範囲
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // 月別閲覧数
    const { data: viewsRaw } = await supabase
      .from('page_views')
      .select('viewed_at')
      .eq('organization_id', auth.organizationId!)
      .eq('supplier_id', supplierId)
      .gte('viewed_at', sixMonthsAgo.toISOString());

    // 月別クリック数
    const { data: clicksRaw } = await supabase
      .from('product_clicks')
      .select('clicked_at')
      .eq('organization_id', auth.organizationId!)
      .eq('supplier_id', supplierId)
      .gte('clicked_at', sixMonthsAgo.toISOString());

    // 商品別閲覧数ランキング
    const { data: productViewsRaw } = await supabase
      .from('page_views')
      .select('product_id, products!inner(id, name, slug)')
      .eq('organization_id', auth.organizationId!)
      .eq('supplier_id', supplierId)
      .gte('viewed_at', sixMonthsAgo.toISOString())
      .not('product_id', 'is', null);

    // 月別集計
    const monthlyData = buildMonthlyData(
      viewsRaw?.map(v => v.viewed_at) || [],
      clicksRaw?.map(c => c.clicked_at) || [],
      sixMonthsAgo,
      now
    );

    // 商品ランキング集計
    const productRankMap = new Map<string, { name: string; slug: string; views: number }>();
    for (const pv of productViewsRaw || []) {
      const pid = pv.product_id as string;
      const product = (pv as { products: { id: string; name: string; slug: string } }).products;
      if (!pid || !product) continue;
      const existing = productRankMap.get(pid);
      if (existing) {
        existing.views++;
      } else {
        productRankMap.set(pid, { name: product.name, slug: product.slug, views: 1 });
      }
    }

    const productRanking = Array.from(productRankMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // 合計
    const totalViews = (viewsRaw || []).length;
    const totalClicks = (clicksRaw || []).length;

    return apiSuccess({
      supplierId,
      supplierName: supplier.name,
      period: {
        from: sixMonthsAgo.toISOString().slice(0, 7),
        to: now.toISOString().slice(0, 7),
      },
      summary: {
        totalViews,
        totalClicks,
        ctr: totalViews > 0 ? Math.round((totalClicks / totalViews) * 1000) / 10 : 0,
      },
      monthly: monthlyData,
      productRanking,
    });
  });
}

/** ビュー・クリックを月別にまとめる */
function buildMonthlyData(
  viewTimestamps: string[],
  clickTimestamps: string[],
  from: Date,
  to: Date
) {
  const months: { month: string; views: number; clicks: number }[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);

  while (cursor <= to) {
    months.push({
      month: cursor.toISOString().slice(0, 7),
      views: 0,
      clicks: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  for (const ts of viewTimestamps) {
    const m = ts.slice(0, 7);
    const entry = months.find(e => e.month === m);
    if (entry) entry.views++;
  }
  for (const ts of clickTimestamps) {
    const m = ts.slice(0, 7);
    const entry = months.find(e => e.month === m);
    if (entry) entry.clicks++;
  }

  return months;
}

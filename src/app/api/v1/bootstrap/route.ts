import { NextRequest } from 'next/server';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  withApiLogging,
  getServiceSupabase,
  CACHE_PROFILES,
} from '@/lib/api/auth';
import {
  fetchContentTypes,
  fetchFlatCategories,
  fetchShippingSummary,
  fetchPublishedProducts,
  fetchSuppliers,
} from '@/lib/api/storefront-data';

/**
 * GET /api/v1/bootstrap
 *
 * 初回表示に必要なマスタ・カタログを 1 リクエストで返す。
 * 認証は 1 回のみ。内部データは並列取得 + サーバー側メモリキャッシュ。
 *
 * クエリ:
 *   include  カンマ区切り（既定: categories,contentTypes,shipping,products,suppliers）
 *   productLimit  products の件数（既定 20、最大 100）
 *   featured      true のときおすすめ商品のみ
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const { searchParams } = new URL(request.url);
    const includeParam =
      searchParams.get('include') ||
      'categories,contentTypes,shipping,products,suppliers';
    const include = new Set(
      includeParam.split(',').map((s) => s.trim()).filter(Boolean),
    );
    const productLimit = Math.min(parseInt(searchParams.get('productLimit') || '20', 10), 100);
    const featured = searchParams.get('featured') === 'true';

    const supabase = getServiceSupabase();
    const orgId = auth.organizationId!;

    const tasks: Record<string, Promise<unknown>> = {};

    if (include.has('categories')) {
      tasks.categories = fetchFlatCategories(supabase, orgId);
    }
    if (include.has('contentTypes')) {
      tasks.contentTypes = fetchContentTypes(supabase, orgId);
    }
    if (include.has('shipping')) {
      tasks.shipping = fetchShippingSummary(supabase, orgId);
    }
    if (include.has('products')) {
      tasks.products = fetchPublishedProducts(supabase, orgId, {
        limit: productLimit,
        featured,
      });
    }
    if (include.has('suppliers')) {
      tasks.suppliers = fetchSuppliers(supabase, orgId);
    }

    const keys = Object.keys(tasks);
    const values = await Promise.all(keys.map((k) => tasks[k]));

    const data: Record<string, unknown> = {};
    keys.forEach((k, i) => {
      data[k] = values[i];
    });

    return apiSuccess(data, { included: keys }, auth.rateLimit, CACHE_PROFILES.bootstrap);
  });
}

export async function OPTIONS() {
  return handleOptions();
}

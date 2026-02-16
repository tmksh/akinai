import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  corsHeaders,
  withApiLogging,
} from '@/lib/api/auth';

// カテゴリー型定義（レスポンス用）
interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  productCount: number;
  children: CategoryResponse[];
}

// DBレコード型
interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parent_id: string | null;
  sort_order: number;
}

// フラット形式のカテゴリーをツリー構造に変換
function buildTree(
  categories: CategoryRow[],
  productCounts: Record<string, number>,
  parentId: string | null = null
): CategoryResponse[] {
  return categories
    .filter(c => c.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      parentId: c.parent_id,
      sortOrder: c.sort_order,
      productCount: productCounts[c.id] || 0,
      children: buildTree(categories, productCounts, c.id),
    }));
}

// GET /api/v1/categories - カテゴリー一覧
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return apiError('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // クエリパラメータ
    const { searchParams } = new URL(request.url);
    const flat = searchParams.get('flat') === 'true';
    const parentId = searchParams.get('parent');

    // カテゴリを取得
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, slug, description, image, parent_id, sort_order')
      .eq('organization_id', auth.organizationId)
      .order('sort_order', { ascending: true });

    if (catError) {
      console.error('Error fetching categories:', catError);
      return apiError('Failed to fetch categories', 500);
    }

    const rows: CategoryRow[] = categories || [];

    // 各カテゴリの商品数を取得
    const categoryIds = rows.map(c => c.id);
    let productCounts: Record<string, number> = {};

    if (categoryIds.length > 0) {
      const { data: pcData } = await supabase
        .from('product_categories')
        .select('category_id')
        .in('category_id', categoryIds);

      if (pcData) {
        productCounts = pcData.reduce((acc: Record<string, number>, pc) => {
          acc[pc.category_id] = (acc[pc.category_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    let result;

    if (flat) {
      // フラット形式で返す
      result = rows.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: c.image,
        parentId: c.parent_id,
        sortOrder: c.sort_order,
        productCount: productCounts[c.id] || 0,
      }));
    } else if (parentId) {
      // 特定の親カテゴリーの子カテゴリーを返す
      const parent = rows.find(c => c.id === parentId);
      if (!parent) {
        return apiError('Parent category not found', 404);
      }
      result = rows
        .filter(c => c.parent_id === parentId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          image: c.image,
          parentId: c.parent_id,
          sortOrder: c.sort_order,
          productCount: productCounts[c.id] || 0,
        }));
    } else {
      // ツリー形式で返す（デフォルト）
      result = buildTree(rows, productCounts, null);
    }

    const response = apiSuccess(result, undefined, auth.rateLimit);
    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

// OPTIONS /api/v1/categories - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

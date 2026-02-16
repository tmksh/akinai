import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccessPaginated,
  handleOptions,
  corsHeaders,
  withApiLogging,
} from '@/lib/api/auth';

// GET /api/v1/contents - コンテンツ一覧
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const sort = searchParams.get('sort') || 'published_at';
    const order = searchParams.get('order') || 'desc';

    // コンテンツを取得
    let query = supabase
      .from('contents')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .eq('status', 'published')
      .not('published_at', 'is', null);

    // タイプフィルター
    if (type) {
      query = query.eq('type', type);
    }

    // タグフィルター
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    // 検索
    if (search) {
      query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    // ソート
    const ascending = order === 'asc';
    query = query.order(sort, { ascending });

    // ページネーション
    const startIndex = (page - 1) * limit;
    query = query.range(startIndex, startIndex + limit - 1);

    const { data: contents, error: contentsError, count } = await query;

    if (contentsError) {
      console.error('Error fetching contents:', contentsError);
      return apiError('Failed to fetch contents', 500);
    }

    if (!contents || contents.length === 0) {
      const response = apiSuccessPaginated([], page, limit, 0, auth.rateLimit);
      Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    }

    // カテゴリフィルタリング（content_category_relations 経由）
    let filteredContents = contents;
    if (category) {
      const contentIds = contents.map(c => c.id);
      const { data: relations } = await supabase
        .from('content_category_relations')
        .select('content_id, category_id, content_categories!inner(id, slug)')
        .in('content_id', contentIds);

      if (relations) {
        const matchingContentIds = new Set(
          relations
            .filter(r => {
              const cat = r.content_categories as unknown as Record<string, unknown> | null;
              return cat && (cat.id === category || cat.slug === category);
            })
            .map(r => r.content_id)
        );
        filteredContents = contents.filter(c => matchingContentIds.has(c.id));
      }
    }

    // 著者情報を取得
    const authorIds = [...new Set(filteredContents.map(c => c.author_id).filter(Boolean))];
    let authorMap: Record<string, { name: string; avatar: string | null }> = {};

    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      if (authors) {
        authorMap = Object.fromEntries(
          authors.map(a => [a.id, { name: a.full_name || '不明', avatar: a.avatar_url }])
        );
      }
    }

    // カテゴリ情報を取得
    const contentIds = filteredContents.map(c => c.id);
    let contentCategoryMap: Record<string, { id: string; name: string; slug: string }[]> = {};

    if (contentIds.length > 0) {
      const { data: catRelations } = await supabase
        .from('content_category_relations')
        .select('content_id, content_categories(id, name, slug)')
        .in('content_id', contentIds);

      if (catRelations) {
        for (const rel of catRelations) {
          if (!contentCategoryMap[rel.content_id]) {
            contentCategoryMap[rel.content_id] = [];
          }
          const cat = rel.content_categories as unknown as Record<string, unknown> | null;
          if (cat) {
            contentCategoryMap[rel.content_id].push({
              id: cat.id as string,
              name: cat.name as string,
              slug: cat.slug as string,
            });
          }
        }
      }
    }

    // 公開用にデータを整形
    const publicContents = filteredContents.map(c => ({
      id: c.id,
      type: c.type,
      title: c.title,
      slug: c.slug,
      excerpt: c.excerpt,
      featuredImage: c.featured_image,
      categories: contentCategoryMap[c.id] || [],
      author: c.author_id ? authorMap[c.author_id] || null : null,
      tags: c.tags || [],
      customFields: c.custom_fields || [],
      publishedAt: c.published_at,
    }));

    const response = apiSuccessPaginated(publicContents, page, limit, count || 0, auth.rateLimit);
    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

// OPTIONS /api/v1/contents - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

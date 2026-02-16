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

// GET /api/v1/contents/[id] - コンテンツ詳細
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    // IDまたはslugで検索
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase
      .from('contents')
      .select('*')
      .eq('organization_id', auth.organizationId);

    if (isUUID) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: content, error: contentError } = await query.single();

    if (contentError || !content) {
      return apiError('Content not found', 404);
    }

    // 非公開コンテンツは返さない
    if (content.status !== 'published') {
      return apiError('Content not found', 404);
    }

    // 著者情報を取得
    let author: { name: string; avatar: string | null } | null = null;
    if (content.author_id) {
      const { data: authorData } = await supabase
        .from('users')
        .select('full_name, avatar_url')
        .eq('id', content.author_id)
        .single();

      if (authorData) {
        author = {
          name: authorData.full_name || '不明',
          avatar: authorData.avatar_url,
        };
      }
    }

    // カテゴリ情報を取得
    const { data: catRelations } = await supabase
      .from('content_category_relations')
      .select('content_categories(id, name, slug)')
      .eq('content_id', content.id);

    const categories = (catRelations || [])
      .map(rel => {
        const cat = rel.content_categories as unknown as Record<string, unknown> | null;
        return cat ? { id: cat.id as string, name: cat.name as string, slug: cat.slug as string } : null;
      })
      .filter(Boolean);

    // 関連商品情報を取得
    let relatedProducts: { id: string; name: string; slug: string }[] = [];
    if (content.related_product_ids && content.related_product_ids.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, slug')
        .in('id', content.related_product_ids)
        .eq('status', 'published');

      relatedProducts = (products || []).map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
      }));
    }

    // 公開用にデータを整形
    const publicContent = {
      id: content.id,
      type: content.type,
      title: content.title,
      slug: content.slug,
      excerpt: content.excerpt,
      blocks: content.blocks || [],
      featuredImage: content.featured_image,
      categories,
      author,
      tags: content.tags || [],
      customFields: content.custom_fields || [],
      relatedProducts,
      seo: {
        title: content.seo_title || content.title,
        description: content.seo_description || content.excerpt || '',
      },
      publishedAt: content.published_at,
    };

    const response = apiSuccess(publicContent, undefined, auth.rateLimit);
    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

// OPTIONS /api/v1/contents/[id] - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

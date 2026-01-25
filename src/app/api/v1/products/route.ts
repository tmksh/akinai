import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  validateApiKey, 
  apiError, 
  apiSuccessPaginated,
  handleOptions,
  corsHeaders,
} from '@/lib/api/auth';

// GET /api/v1/products - 商品一覧
export async function GET(request: NextRequest) {
  // API認証
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status);
  }

  // Supabase接続
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
  const status = searchParams.get('status') || 'published';
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'created_at';
  const order = searchParams.get('order') || 'desc';

  // クエリを構築
  let query = supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      description,
      price,
      compare_at_price,
      status,
      created_at,
      updated_at,
      product_variants (
        id,
        name,
        sku,
        price,
        current_stock
      ),
      product_images (
        id,
        url,
        alt,
        position
      )
    `, { count: 'exact' })
    .eq('organization_id', auth.organizationId);

  // ステータスフィルター
  if (status !== 'all') {
    query = query.eq('status', status);
  }

  // カテゴリーフィルター
  if (category) {
    query = query.contains('category_ids', [category]);
  }

  // 検索
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // ソート
  const ascending = order === 'asc';
  query = query.order(sort, { ascending });

  // ページネーション
  const startIndex = (page - 1) * limit;
  query = query.range(startIndex, startIndex + limit - 1);

  const { data: products, error, count } = await query;

  if (error) {
    console.error('Error fetching products:', error);
    return apiError('Failed to fetch products', 500);
  }

  // 公開用にデータを整形
  const publicProducts = (products || []).map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compare_at_price,
    currency: 'JPY',
    images: (p.product_images || [])
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
      .map((img: { id: string; url: string; alt: string | null }) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
      })),
    variants: (p.product_variants || []).map((v: { id: string; name: string; price: number; current_stock: number }) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      available: v.current_stock > 0,
    })),
    status: p.status,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  const response = apiSuccessPaginated(publicProducts, page, limit, count || 0);
  
  // CORSヘッダーを追加
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// OPTIONS /api/v1/products - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

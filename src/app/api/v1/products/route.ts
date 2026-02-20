import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  apiSuccessPaginated,
  handleOptions,
  corsHeaders,
  withApiLogging,
} from '@/lib/api/auth';

// 統一フィールド型
interface UnifiedField {
  key: string;
  label: string;
  value: string;
  type: string;
  system: boolean;
  options?: string[];
}

// 商品データを統一フィールド形式に変換
function buildFields(
  product: Record<string, unknown>,
  variants: Record<string, unknown>[],
  customFields: { key: string; label: string; value: string; type: string; options?: string[] }[]
): UnifiedField[] {
  const fields: UnifiedField[] = [];

  // --- システム固定フィールド ---
  fields.push({ key: 'name',              label: '商品名',           value: (product.name as string) || '',               type: 'text',     system: true });
  fields.push({ key: 'slug',              label: 'スラッグ',         value: (product.slug as string) || '',               type: 'text',     system: true });
  fields.push({ key: 'short_description', label: '短い説明',         value: (product.short_description as string) || '',  type: 'text',     system: true });
  fields.push({ key: 'description',       label: '詳細説明',         value: (product.description as string) || '',        type: 'textarea', system: true });
  fields.push({ key: 'status',            label: 'ステータス',       value: (product.status as string) || 'draft',        type: 'select',   system: true, options: ['draft', 'published', 'archived'] });
  fields.push({ key: 'featured',          label: 'おすすめ',         value: String(product.featured ?? false),            type: 'boolean',  system: true });
  fields.push({ key: 'seo_title',         label: 'SEOタイトル',      value: (product.seo_title as string) || '',          type: 'text',     system: true });
  fields.push({ key: 'seo_description',   label: 'メタディスクリプション', value: (product.seo_description as string) || '', type: 'textarea', system: true });
  fields.push({ key: 'tags',              label: 'タグ',             value: JSON.stringify(product.tags || []),           type: 'list',     system: true });

  // 価格（最低・最高）
  const prices = variants.map(v => Number(v.price) || 0);
  if (prices.length > 0) {
    fields.push({ key: 'min_price', label: '最低価格', value: String(Math.min(...prices)), type: 'number', system: true });
    fields.push({ key: 'max_price', label: '最高価格', value: String(Math.max(...prices)), type: 'number', system: true });
  }

  // 在庫合計
  const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  fields.push({ key: 'total_stock', label: '在庫合計', value: String(totalStock), type: 'number', system: true });

  // --- カスタムフィールド ---
  for (const cf of customFields) {
    fields.push({
      key: cf.key,
      label: cf.label,
      value: cf.value,
      type: cf.type,
      system: false,
      ...(cf.options && { options: cf.options }),
    });
  }

  return fields;
}

// GET /api/v1/products - 商品一覧
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
    const status = searchParams.get('status') || 'published';
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';

    // --- 商品を取得 ---
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId);

    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const ascending = order === 'asc';
    query = query.order(sort, { ascending });

    const startIndex = (page - 1) * limit;
    query = query.range(startIndex, startIndex + limit - 1);

    const { data: products, error: productsError, count } = await query;

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return apiError('Failed to fetch products', 500);
    }

    if (!products || products.length === 0) {
      const response = apiSuccessPaginated([], page, limit, 0, auth.rateLimit);
      Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    }

    const productIds = products.map(p => p.id);

    // --- 関連データを一括取得 ---
    const [variantsRes, imagesRes, pcRes] = await Promise.all([
      supabase.from('product_variants').select('*').in('product_id', productIds),
      supabase.from('product_images').select('*').in('product_id', productIds).order('sort_order', { ascending: true }),
      supabase.from('product_categories').select('product_id, category_id').in('product_id', productIds),
    ]);

    const variants = variantsRes.data || [];
    const images = imagesRes.data || [];
    const productCategories = pcRes.data || [];

    // カテゴリ詳細
    const categoryIds = [...new Set(productCategories.map(pc => pc.category_id))];
    let categories: Record<string, unknown>[] = [];
    if (categoryIds.length > 0) {
      const { data } = await supabase.from('categories').select('*').in('id', categoryIds);
      categories = data || [];
    }

    // カテゴリフィルター
    let filteredProducts = products;
    if (category) {
      const targetCat = categories.find((c: Record<string, unknown>) => c.slug === category || c.id === category);
      if (targetCat) {
        const idsInCategory = productCategories
          .filter(pc => pc.category_id === (targetCat as Record<string, unknown>).id)
          .map(pc => pc.product_id);
        filteredProducts = products.filter(p => idsInCategory.includes(p.id));
      }
    }

    // --- レスポンスを構築 ---
    const publicProducts = filteredProducts.map(product => {
      const pVariants = variants.filter(v => v.product_id === product.id);
      const pImages = images.filter(i => i.product_id === product.id);
      const pCatIds = productCategories.filter(pc => pc.product_id === product.id).map(pc => pc.category_id);
      const pCats = categories.filter((c: Record<string, unknown>) => pCatIds.includes(c.id as string));
      const customFields = (product.custom_fields as { key: string; label: string; value: string; type: string; options?: string[] }[]) || [];

      return {
        id: product.id,
        fields: buildFields(product, pVariants, customFields),
        variants: pVariants.map(v => {
          const opts = (v.options || {}) as Record<string, unknown>;
          return {
            id: v.id,
            name: v.name,
            sku: v.sku,
            price: v.price,
            compareAtPrice: v.compare_at_price,
            stock: v.stock,
            available: v.stock > 0,
            imageUrl: (opts.imageUrl as string) || null,
            options: opts,
          };
        }),
        images: pImages.map(img => ({
          id: img.id,
          url: img.url,
          alt: img.alt,
        })),
        categories: pCats.map((c: Record<string, unknown>) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        })),
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      };
    });

    const response = apiSuccessPaginated(publicProducts, page, limit, count || 0, auth.rateLimit);
    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

// POST /api/v1/products - 商品を作成（バリエーション・画像含む）
export async function POST(request: NextRequest) {
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    const name = body.name as string | undefined;
    const slug = body.slug as string | undefined;
    if (!name || !slug) {
      return apiError('name and slug are required', 400);
    }

    const variants = (body.variants as {
      name: string; sku: string; price: number;
      compareAtPrice?: number; stock?: number; options?: Record<string, string>;
    }[]) || [];

    if (variants.length === 0) {
      return apiError('At least one variant is required', 400);
    }

    for (const v of variants) {
      if (!v.name || !v.sku || v.price == null) {
        return apiError('Each variant requires name, sku, and price', 400);
      }
    }

    // slug の重複チェック
    const { data: existingSlug } = await supabase
      .from('products')
      .select('id')
      .eq('organization_id', auth.organizationId)
      .eq('slug', slug)
      .maybeSingle();

    if (existingSlug) {
      return apiError(`Slug "${slug}" already exists`, 409);
    }

    const status = (['draft', 'published', 'archived'].includes(body.status as string))
      ? body.status as string
      : 'draft';

    // 商品を作成
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        organization_id: auth.organizationId,
        name,
        slug,
        description: (body.description as string) || null,
        short_description: (body.shortDescription as string) || null,
        status,
        tags: (body.tags as string[]) || [],
        seo_title: (body.seoTitle as string) || null,
        seo_description: (body.seoDescription as string) || null,
        featured: (body.featured as boolean) || false,
        custom_fields: (body.customFields as unknown[]) || [],
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (productError) {
      console.error('Error creating product:', productError);
      return apiError(`Failed to create product: ${productError.message}`, 500);
    }

    // バリエーションを作成
    const { data: insertedVariants, error: variantsError } = await supabase
      .from('product_variants')
      .insert(
        variants.map(v => ({
          product_id: product.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          compare_at_price: v.compareAtPrice || null,
          stock: v.stock ?? 0,
          options: v.options || {},
        }))
      )
      .select();

    if (variantsError) {
      console.error('Error creating variants:', variantsError);
      await supabase.from('products').delete().eq('id', product.id);
      return apiError(`Failed to create variants: ${variantsError.message}`, 500);
    }

    // 画像を登録
    const images = (body.images as { url: string; alt?: string }[]) || [];
    let insertedImages: Record<string, unknown>[] = [];
    if (images.length > 0) {
      const { data: imgData, error: imgError } = await supabase
        .from('product_images')
        .insert(
          images.map((img, idx) => ({
            product_id: product.id,
            url: img.url,
            alt: img.alt || name,
            sort_order: idx,
          }))
        )
        .select();

      if (imgError) {
        console.error('Error creating images:', imgError);
      } else {
        insertedImages = imgData || [];
      }
    }

    // カテゴリを関連付け
    const categoryIds = (body.categoryIds as string[]) || [];
    if (categoryIds.length > 0) {
      const { error: catError } = await supabase
        .from('product_categories')
        .insert(
          categoryIds.map(catId => ({
            product_id: product.id,
            category_id: catId,
          }))
        );

      if (catError) {
        console.error('Error linking categories:', catError);
      }
    }

    const response = apiSuccess({
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      variants: (insertedVariants || []).map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        options: v.options,
      })),
      images: insertedImages.map(img => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
      })),
      createdAt: product.created_at,
    }, undefined, auth.rateLimit);

    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

// OPTIONS /api/v1/products - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

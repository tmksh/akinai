import { NextRequest } from 'next/server';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  apiSuccessPaginated,
  handleOptions,
  withApiLogging,
  getServiceSupabase,
  CACHE_PROFILES,
} from '@/lib/api/auth';
import {
  normalizeCustomFields,
  formatPublicProduct,
  extractCategoriesFromProductCategories,
  PRODUCT_LIST_SELECT,
} from '@/lib/api/product-format';
import { extractSupplierIdFromCustomFields } from '@/lib/analytics';
import { buildProductImageRows, validateProductImageUrls } from '@/lib/api/product-images';

// GET /api/v1/products - 商品一覧
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabase = getServiceSupabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'published';
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';

    let query = supabase
      .from('products')
      .select(PRODUCT_LIST_SELECT, { count: 'exact' })
      .eq('organization_id', auth.organizationId);

    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const ascending = order === 'asc';
    query = query
      .order(sort, { ascending })
      .order('sort_order', { ascending: true, referencedTable: 'product_images' });

    const startIndex = (page - 1) * limit;
    query = query.range(startIndex, startIndex + limit - 1);

    const { data: products, error: productsError, count } = await query;

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return apiError('Failed to fetch products', 500);
    }

    if (!products || products.length === 0) {
      return apiSuccessPaginated([], page, limit, 0, auth.rateLimit, CACHE_PROFILES.catalog);
    }

    type ProductRow = Record<string, unknown> & {
      product_variants?: Record<string, unknown>[];
      product_images?: Record<string, unknown>[];
      product_categories?: Array<{
        category_id?: string;
        categories?: { id: string; name: string; slug: string } | null;
      }>;
    };

    let filteredProducts = products as unknown as ProductRow[];
    if (category) {
      filteredProducts = filteredProducts.filter((product) => {
        const cats = extractCategoriesFromProductCategories(product.product_categories || []);
        return cats.some((c) => c.slug === category || c.id === category);
      });
    }

    const publicProducts = filteredProducts.map((product) => {
      const { product_variants = [], product_images = [], product_categories = [], ...base } = product;
      return formatPublicProduct(
        base,
        product_variants,
        product_images,
        extractCategoriesFromProductCategories(product_categories),
      );
    });

    return apiSuccessPaginated(
      publicProducts,
      page,
      limit,
      count || 0,
      auth.rateLimit,
      CACHE_PROFILES.catalog,
    );
  });
}

// POST /api/v1/products - 商品を作成（バリエーション・画像含む）
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabase = getServiceSupabase();

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

    // ⑥ 商品審査フローチェック
    const { data: orgData } = await supabase
      .from('organizations')
      .select('features')
      .eq('id', auth.organizationId)
      .single();
    const orgFeatures = (orgData?.features as Record<string, unknown>) || {};
    const isApprovalEnabled = !!orgFeatures.product_approval_flow;

    // 審査フローが有効で status=published の場合は審査中に差し替え
    const finalStatus = isApprovalEnabled && status === 'published' ? 'draft' : status;
    const approvalStatus = isApprovalEnabled ? 'pending' : null;

    // 商品を作成
    const normalizedCustomFields = normalizeCustomFields(body.customFields);
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        organization_id: auth.organizationId,
        name,
        slug,
        description: (body.description as string) || null,
        short_description: (body.shortDescription as string) || null,
        status: finalStatus,
        tags: (body.tags as string[]) || [],
        seo_title: (body.seoTitle as string) || null,
        seo_description: (body.seoDescription as string) || null,
        featured: (body.featured as boolean) || false,
        custom_fields: normalizedCustomFields,
        // custom_fields に supplier_id があれば専用カラムへ同期（アナリティクス集計の基準）
        supplier_id: extractSupplierIdFromCustomFields(normalizedCustomFields),
        approval_status: approvalStatus,
        published_at: finalStatus === 'published' ? new Date().toISOString() : null,
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
          stock: v.stock ?? 1,
          options: v.options || {},
        }))
      )
      .select();

    if (variantsError) {
      console.error('Error creating variants:', variantsError);
      await supabase.from('products').delete().eq('id', product.id);
      return apiError(`Failed to create variants: ${variantsError.message}`, 500);
    }

    // 画像を登録（http/https URL をサーバー側で最適化して Storage に保存）
    const images = (body.images as { url: string; alt?: string }[]) || [];
    let insertedImages: Record<string, unknown>[] = [];
    if (images.length > 0) {
      const imageValidationError = validateProductImageUrls(images);
      if (imageValidationError) {
        await supabase.from('products').delete().eq('id', product.id);
        return apiError(imageValidationError, 400);
      }

      const processedRows = await buildProductImageRows(supabase, product.id, images, name);

      const { data: imgData, error: imgError } = await supabase
        .from('product_images')
        .insert(processedRows)
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
      approvalStatus: product.approval_status ?? null,
      customFields: normalizeCustomFields(product.custom_fields),
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
        thumbnailUrl: img.thumbnail_url ?? null,
        alt: img.alt,
      })),
      createdAt: product.created_at,
    }, undefined, auth.rateLimit);

    return response;
  });
}

// OPTIONS /api/v1/products - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

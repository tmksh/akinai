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
  normalizeCustomFields,
  formatPublicProduct,
  extractCategoriesFromProductCategories,
} from '@/lib/api/product-format';
import { extractSupplierIdFromCustomFields } from '@/lib/analytics';
import { buildProductImageRows, validateProductImageUrls } from '@/lib/api/product-images';
import { triggerWebhook } from '@/lib/webhooks/sender';
import { WEBHOOK_EVENTS, type ProductEventData } from '@/lib/webhooks/events';

const PRODUCT_DETAIL_SELECT = `
  id, name, slug, short_description, description, status, featured,
  seo_title, seo_description, tags, custom_fields, created_at, updated_at,
  product_variants (
    id, name, sku, price, compare_at_price, stock, options, image_url
  ),
  product_images (
    id, url, thumbnail_url, alt, sort_order
  ),
  product_categories (
    category_id,
    categories ( id, name, slug )
  )
`;

// GET /api/v1/products/[id] - 商品詳細
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status);
  }

  return withApiLogging(request, auth, async () => {
    const supabase = getServiceSupabase();
    const { id } = await params;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase
      .from('products')
      .select(PRODUCT_DETAIL_SELECT)
      .eq('organization_id', auth.organizationId)
      .order('sort_order', { ascending: true, referencedTable: 'product_images' });

    query = isUUID ? query.eq('id', id) : query.eq('slug', id);

    const { data: product, error: productError } = await query.single();

    if (productError || !product) {
      return apiError('Product not found', 404);
    }

    const detailParams = new URL(request.url).searchParams;
    const allowAll = detailParams.get('status') === 'all';
    if (!allowAll && product.status !== 'published') {
      return apiError('Product not found', 404);
    }

    // cache=no で登録直後の強整合取得（Read-After-Write）を保証
    const cacheProfile =
      detailParams.get('cache') === 'no' ? CACHE_PROFILES.realtime : CACHE_PROFILES.catalog;

    const {
      product_variants = [],
      product_images = [],
      product_categories = [],
      ...base
    } = product as unknown as Record<string, unknown> & {
      product_variants?: Record<string, unknown>[];
      product_images?: Record<string, unknown>[];
      product_categories?: Array<{
        category_id?: string;
        categories?: { id: string; name: string; slug: string } | null;
      }>;
    };

    return apiSuccess(
      formatPublicProduct(
        base,
        product_variants,
        product_images,
        extractCategoriesFromProductCategories(product_categories),
        { includeThumbnail: false },
      ),
      undefined,
      auth.rateLimit,
      cacheProfile,
    );
  });
}

// PUT /api/v1/products/[id] - 商品を更新（バリエーション置換対応）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabase = getServiceSupabase();
    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    // ID または slug で商品を検索
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = supabase
      .from('products')
      .select('id')
      .eq('organization_id', auth.organizationId);
    if (isUUID) query = query.eq('id', id);
    else query = query.eq('slug', id);

    const { data: existing, error: findErr } = await query.single();
    if (findErr || !existing) {
      return apiError('Product not found', 404);
    }

    const productId = existing.id;

    // 商品フィールドを更新
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.shortDescription !== undefined) updateData.short_description = body.shortDescription;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'published') updateData.published_at = new Date().toISOString();
    }
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.customFields !== undefined) {
      const normalizedCustomFields = normalizeCustomFields(body.customFields);
      updateData.custom_fields = normalizedCustomFields;
      // custom_fields に supplier_id があれば専用カラムへ同期（アナリティクス集計の基準）
      updateData.supplier_id = extractSupplierIdFromCustomFields(normalizedCustomFields);
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateErr } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId);
      if (updateErr) {
        return apiError(`Failed to update product: ${updateErr.message}`, 500);
      }
    }

    // バリエーションを置換
    const variants = body.variants as {
      name: string; sku: string; price: number;
      compareAtPrice?: number; stock?: number; options?: Record<string, string>;
    }[] | undefined;

    let insertedVariants: Record<string, unknown>[] = [];
    if (variants && variants.length > 0) {
      await supabase.from('product_variants').delete().eq('product_id', productId);

      const { data: varData, error: varErr } = await supabase
        .from('product_variants')
        .insert(
          variants.map(v => ({
            product_id: productId,
            name: v.name,
            sku: v.sku,
            price: v.price,
            compare_at_price: v.compareAtPrice || null,
            stock: v.stock ?? 0,
            options: v.options || {},
          }))
        )
        .select();

      if (varErr) {
        return apiError(`Failed to update variants: ${varErr.message}`, 500);
      }
      insertedVariants = varData || [];
    }

    // 画像を置換（指定された場合のみ。POST と同様に URL 取り込み・最適化を行う）
    const images = body.images as { url: string; alt?: string }[] | undefined;
    if (images) {
      if (images.length > 0) {
        const imageValidationError = validateProductImageUrls(images);
        if (imageValidationError) {
          return apiError(imageValidationError, 400);
        }
      }

      await supabase.from('product_images').delete().eq('product_id', productId);
      if (images.length > 0) {
        const processedRows = await buildProductImageRows(supabase, productId, images);
        const { error: imgError } = await supabase.from('product_images').insert(processedRows);
        if (imgError) {
          console.error('Error updating images:', imgError);
          return apiError(`Failed to update images: ${imgError.message}`, 500);
        }
      }
    }

    // Webhook 発火（商品更新 / 公開）。配信は sender 側でバックグラウンド実行・失敗は握りつぶす
    const { data: updatedProduct } = await supabase
      .from('products')
      .select('id, name, slug, status, product_variants ( id, name, sku, price, stock )')
      .eq('id', productId)
      .single();

    if (updatedProduct) {
      const variantRows =
        (updatedProduct.product_variants as Record<string, unknown>[] | null) || [];
      const productEventData: ProductEventData = {
        product_id: String(updatedProduct.id),
        name: String(updatedProduct.name),
        slug: String(updatedProduct.slug),
        status: String(updatedProduct.status),
        variants: variantRows.map((v) => ({
          variant_id: String(v.id),
          name: String(v.name),
          sku: String(v.sku),
          price: Number(v.price),
          stock: Number(v.stock),
        })),
      };
      await triggerWebhook(auth.organizationId!, WEBHOOK_EVENTS.PRODUCT_UPDATED, productEventData);
      if (body.status === 'published') {
        await triggerWebhook(auth.organizationId!, WEBHOOK_EVENTS.PRODUCT_PUBLISHED, productEventData);
      }
    }

    return apiSuccess({
      id: productId,
      updated: true,
      variants: insertedVariants.length,
    }, undefined, auth.rateLimit);
  });
}

// DELETE /api/v1/products/[id] - 商品削除（関連データを含む）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabase = getServiceSupabase();
    const { id } = await params;

    // UUID またはスラッグで検索（Webhook ペイロード用に基本情報も取得）
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let query = supabase
      .from('products')
      .select('id, name, slug, status, product_variants ( id, name, sku, price, stock )')
      .eq('organization_id', auth.organizationId);
    if (isUUID) query = query.eq('id', id);
    else query = query.eq('slug', id);

    const { data: existing, error: findErr } = await query.single();
    if (findErr || !existing) {
      return apiError('Product not found', 404);
    }

    const productId = existing.id;
    const deletedVariantRows =
      (existing.product_variants as Record<string, unknown>[] | null) || [];

    // 関連データを先に削除（FK 制約回避）
    await Promise.all([
      supabase.from('product_variants').delete().eq('product_id', productId),
      supabase.from('product_images').delete().eq('product_id', productId),
      supabase.from('product_categories').delete().eq('product_id', productId),
    ]);

    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('organization_id', auth.organizationId);

    if (deleteError) {
      return apiError(`Failed to delete product: ${deleteError.message}`, 500);
    }

    // Webhook 発火（商品削除）
    await triggerWebhook<ProductEventData>(auth.organizationId!, WEBHOOK_EVENTS.PRODUCT_DELETED, {
      product_id: String(existing.id),
      name: String(existing.name),
      slug: String(existing.slug),
      status: String(existing.status),
      variants: deletedVariantRows.map((v) => ({
        variant_id: String(v.id),
        name: String(v.name),
        sku: String(v.sku),
        price: Number(v.price),
        stock: Number(v.stock),
      })),
    });

    return apiSuccess({ id: productId, deleted: true }, undefined, auth.rateLimit);
  });
}

// OPTIONS /api/v1/products/[id] - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

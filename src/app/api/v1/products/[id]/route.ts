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
      .from('products')
      .select('*')
      .eq('organization_id', auth.organizationId);

    if (isUUID) {
      query = query.eq('id', id);
    } else {
      query = query.eq('slug', id);
    }

    const { data: product, error: productError } = await query.single();

    if (productError || !product) {
      return apiError('Product not found', 404);
    }

    // 非公開商品は返さない（status=all パラメータがない限り）
    const allowAll = new URL(request.url).searchParams.get('status') === 'all';
    if (!allowAll && product.status !== 'published') {
      return apiError('Product not found', 404);
    }

    // --- 関連データを一括取得 ---
    const [variantsRes, imagesRes, pcRes] = await Promise.all([
      supabase.from('product_variants').select('*').eq('product_id', product.id),
      supabase.from('product_images').select('*').eq('product_id', product.id).order('sort_order', { ascending: true }),
      supabase.from('product_categories').select('category_id').eq('product_id', product.id),
    ]);

    const variants = variantsRes.data || [];
    const images = imagesRes.data || [];
    const productCategories = pcRes.data || [];

    // カテゴリ詳細
    const categoryIds = productCategories.map(pc => pc.category_id);
    let categories: Record<string, unknown>[] = [];
    if (categoryIds.length > 0) {
      const { data } = await supabase.from('categories').select('*').in('id', categoryIds);
      categories = data || [];
    }

    // カスタムフィールド
    const customFields = (product.custom_fields as { key: string; label: string; value: string; type: string; options?: string[] }[]) || [];

    // --- レスポンス構築 ---
    const publicProduct = {
      id: product.id,
      fields: buildFields(product, variants, customFields),
      variants: variants.map(v => {
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
      images: images.map(img => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
      })),
      categories: categories.map((c: Record<string, unknown>) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      })),
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    };

    const response = apiSuccess(publicProduct, undefined, auth.rateLimit);
    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

// OPTIONS /api/v1/products/[id] - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

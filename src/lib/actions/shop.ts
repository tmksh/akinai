'use server';

import { cache } from 'react';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

async function getRequestHostname(): Promise<string> {
  try {
    const headersList = await headers();
    const shopHostname = headersList.get('x-shop-hostname');
    const host = shopHostname || headersList.get('host') || '';
    return host.replace(/:\d+$/, '');
  } catch {
    return '';
  }
}

/**
 * リクエストのホスト名からショップの組織IDを解決する
 * 優先順位: shop_subdomain一致 → slug一致 → frontend_url一致 → 環境変数 → 先頭レコード
 * 同一リクエスト内は cache() で dedupe、全件スキャンは避けてインデックス付きクエリを使用
 */
async function resolveOrganizationIdImpl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hostname: string,
): Promise<string | null> {
  if (hostname) {
    const { data: bySubdomain } = await supabase
      .from('organizations')
      .select('id')
      .eq('shop_subdomain', hostname)
      .maybeSingle();
    if (bySubdomain) return bySubdomain.id;

    const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || 'akinai-dx.com';
    if (hostname.endsWith(`.${adminDomain}`)) {
      const subdomain = hostname.replace(`.${adminDomain}`, '');
      const { data: bySlug } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', subdomain)
        .maybeSingle();
      if (bySlug) return bySlug.id;
    }

    const { data: orgsWithUrl } = await supabase
      .from('organizations')
      .select('id, frontend_url')
      .not('frontend_url', 'is', null);
    const byFrontendUrl = orgsWithUrl?.find(o => {
      if (!o.frontend_url) return false;
      try {
        return new URL(o.frontend_url as string).hostname === hostname;
      } catch {
        return false;
      }
    });
    if (byFrontendUrl) return byFrontendUrl.id;
  }

  const envOrgId = process.env.NEXT_PUBLIC_ORGANIZATION_ID;
  if (envOrgId) {
    const { data: byEnv } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', envOrgId)
      .maybeSingle();
    if (byEnv) return byEnv.id;
  }

  const { data: fallback } = await supabase
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return fallback?.id ?? null;
}

const resolveOrganizationIdCached = cache(async () => {
  const supabase = await createClient();
  const hostname = await getRequestHostname();
  return resolveOrganizationIdImpl(supabase, hostname);
});

async function resolveOrganizationId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const hostname = await getRequestHostname();
  return resolveOrganizationIdImpl(supabase, hostname);
}

/** レイアウト等の Server Component から組織IDを取得（リクエスト内 dedupe） */
export async function getShopOrganizationId(): Promise<string | null> {
  return resolveOrganizationIdCached();
}
import type { Database } from '@/types/database';

// 型定義
type Product = Database['public']['Tables']['products']['Row'];
type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
type ProductImage = Database['public']['Tables']['product_images']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Content = Database['public']['Tables']['contents']['Row'];

// カスタムフィールド型
export interface ShopCustomField {
  key: string;
  label: string;
  value: string;
  type: string;
  options?: string[];
}

// ショップ用商品型（公開情報のみ）
export interface ShopProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  featured: boolean;
  images: {
    url: string;
    alt: string | null;
  }[];
  variants: {
    id: string;
    name: string;
    sku: string;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    options: Record<string, string>;
    imageUrl: string | null;
  }[];
  categories: {
    id: string;
    name: string;
    slug: string;
  }[];
  customFields: ShopCustomField[];
  minPrice: number;
  maxPrice: number;
  totalStock: number;
  hasDiscount: boolean;
  organizationId: string | null;
  supplierId: string | null;
}

// ショップ用カテゴリ型
export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  productCount: number;
}

// ショップ用コンテンツ型
export interface ShopContent {
  id: string;
  title: string;
  slug: string;
  type: string;
  excerpt: string | null;
  featuredImage: string | null;
  publishedAt: string | null;
  createdAt: string;
}

// 公開商品一覧を取得（ショップ用）
// organizationIdを指定しない場合は、最初の公開組織の商品を取得（デモ用）
export async function getShopProducts(options?: {
  organizationId?: string;
  categorySlug?: string;
  featured?: boolean;
  limit?: number;
  sortBy?: 'popular' | 'new' | 'price-low' | 'price-high';
}): Promise<{
  data: ShopProduct[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    let organizationId = options?.organizationId;

    // 組織IDが指定されていない場合、ドメイン/環境変数/先頭の順で解決
    if (!organizationId) {
      organizationId = await resolveOrganizationId(supabase) ?? undefined;
      if (!organizationId) return { data: [], error: null };
    }

    // 公開中の商品を取得（一覧表示に必要なカラムのみ）
    let productQuery = supabase
      .from('products')
      .select('id, name, slug, description, short_description, featured, custom_fields, organization_id, supplier_id, published_at, created_at')
      .eq('organization_id', organizationId)
      .eq('status', 'published');

    if (options?.featured) {
      productQuery = productQuery.eq('featured', true);
    }

    // ソート
    switch (options?.sortBy) {
      case 'new':
        productQuery = productQuery.order('published_at', { ascending: false, nullsFirst: false });
        break;
      case 'popular':
      default:
        productQuery = productQuery.order('featured', { ascending: false }).order('created_at', { ascending: false });
        break;
    }

    if (options?.limit) {
      productQuery = productQuery.limit(options.limit);
    }

    const { data: products, error: productsError } = await productQuery;

    if (productsError) throw productsError;
    if (!products || products.length === 0) {
      return { data: [], error: null };
    }

    const productIds = products.map(p => p.id);

    // バリエーションを取得
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('id, product_id, name, sku, price, compare_at_price, stock, options, image_url')
      .in('product_id', productIds);

    if (variantsError) throw variantsError;

    // 画像を取得
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('id, product_id, url, alt, sort_order')
      .in('product_id', productIds)
      .order('sort_order', { ascending: true });

    if (imagesError) throw imagesError;

    // カテゴリ関連を取得
    const { data: productCategories, error: pcError } = await supabase
      .from('product_categories')
      .select('product_id, category_id')
      .in('product_id', productIds);

    if (pcError) throw pcError;

    // カテゴリ詳細を取得
    const categoryIds = [...new Set(productCategories?.map(pc => pc.category_id) || [])];
    type CategorySummary = Pick<Category, 'id' | 'name' | 'slug' | 'description' | 'image'>;
    let categories: CategorySummary[] = [];
    if (categoryIds.length > 0) {
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug, description, image')
        .in('id', categoryIds);
      if (catError) throw catError;
      categories = (catData || []) as CategorySummary[];
    }

    // カテゴリフィルター
    let filteredProducts = products;
    if (options?.categorySlug && options.categorySlug !== 'all') {
      const targetCategory = categories.find(c => c.slug === options.categorySlug);
      if (targetCategory) {
        const productIdsInCategory = productCategories
          ?.filter(pc => pc.category_id === targetCategory.id)
          .map(pc => pc.product_id) || [];
        filteredProducts = products.filter(p => productIdsInCategory.includes(p.id));
      }
    }

    // データを結合してショップ用に整形
    let shopProducts: ShopProduct[] = filteredProducts.map(product => {
      const productVariants = variants?.filter(v => v.product_id === product.id) || [];
      const productImages = images?.filter(i => i.product_id === product.id) || [];
      const productCategoryIds = productCategories
        ?.filter(pc => pc.product_id === product.id)
        .map(pc => pc.category_id) || [];
      const productCats = categories.filter(c => productCategoryIds.includes(c.id));

      const prices = productVariants.map(v => v.price);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const totalStock = productVariants.reduce((sum, v) => sum + v.stock, 0);
      const hasDiscount = productVariants.some(v => v.compare_at_price && v.compare_at_price > v.price);

      // カスタムフィールドを整形
      const rawCustomFields = (product.custom_fields as unknown as ShopCustomField[]) || [];

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDescription: product.short_description,
        featured: product.featured,
        images: productImages.map(img => ({
          url: img.url,
          alt: img.alt,
        })),
        variants: productVariants.map(v => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compare_at_price,
          stock: v.stock,
          options: (v.options as Record<string, string>) || {},
          imageUrl: v.image_url ?? null,
        })),
        categories: productCats.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        })),
        customFields: rawCustomFields,
        minPrice,
        maxPrice,
        totalStock,
        hasDiscount,
        organizationId: product.organization_id ?? null,
        supplierId: (product as Record<string, unknown>).supplier_id as string ?? null,
      };
    });

    // 価格でソート（バリエーション取得後）
    if (options?.sortBy === 'price-low') {
      shopProducts = shopProducts.sort((a, b) => a.minPrice - b.minPrice);
    } else if (options?.sortBy === 'price-high') {
      shopProducts = shopProducts.sort((a, b) => b.minPrice - a.minPrice);
    }

    return { data: shopProducts, error: null };
  } catch (error) {
    console.error('Error fetching shop products:', error);
    return { data: null, error: 'Failed to fetch products' };
  }
}

// 単一商品を取得（ショップ用）
export async function getShopProduct(productIdOrSlug: string): Promise<{
  data: ShopProduct | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // IDまたはスラッグで検索
    let query = supabase
      .from('products')
      .select('*')
      .eq('status', 'published');

    // UUIDかスラッグかを判定
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productIdOrSlug);
    
    if (isUUID) {
      query = query.eq('id', productIdOrSlug);
    } else {
      query = query.eq('slug', productIdOrSlug);
    }

    const { data: product, error: productError } = await query.single();

    if (productError) {
      if (productError.code === 'PGRST116') {
        return { data: null, error: '商品が見つかりません' };
      }
      throw productError;
    }

    // バリエーションを取得
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id);

    if (variantsError) throw variantsError;

    // 画像を取得
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', product.id)
      .order('sort_order', { ascending: true });

    if (imagesError) throw imagesError;

    // カテゴリ関連を取得
    const { data: productCategories, error: pcError } = await supabase
      .from('product_categories')
      .select('category_id')
      .eq('product_id', product.id);

    if (pcError) throw pcError;

    const categoryIds = productCategories?.map(pc => pc.category_id) || [];
    type CategorySummary = Pick<Category, 'id' | 'name' | 'slug' | 'description' | 'image'>;
    let categories: CategorySummary[] = [];
    if (categoryIds.length > 0) {
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name, slug, description, image')
        .in('id', categoryIds);
      if (catError) throw catError;
      categories = (catData || []) as CategorySummary[];
    }

    const prices = variants?.map(v => v.price) || [];
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const totalStock = variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
    const hasDiscount = variants?.some(v => v.compare_at_price && v.compare_at_price > v.price) || false;

    // カスタムフィールドを整形
    const rawCustomFields = (product.custom_fields as unknown as ShopCustomField[]) || [];

    const shopProduct: ShopProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.short_description,
      featured: product.featured,
      images: (images || []).map(img => ({
        url: img.url,
        alt: img.alt,
      })),
      variants: (variants || []).map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compare_at_price,
        stock: v.stock,
        options: (v.options as Record<string, string>) || {},
        imageUrl: v.image_url ?? null,
      })),
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      })),
      customFields: rawCustomFields,
      minPrice,
      maxPrice,
      totalStock,
      hasDiscount,
      organizationId: product.organization_id ?? null,
      supplierId: (product as Record<string, unknown>).supplier_id as string ?? null,
    };

    return { data: shopProduct, error: null };
  } catch (error) {
    console.error('Error fetching shop product:', error);
    return { data: null, error: 'Failed to fetch product' };
  }
}

// カテゴリ一覧を取得（ショップ用）
export async function getShopCategories(organizationId?: string): Promise<{
  data: ShopCategory[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    let orgId = organizationId;

    if (!orgId) {
      orgId = await resolveOrganizationId(supabase) ?? undefined;
      if (!orgId) return { data: [], error: null };
    }

    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name, slug, description, image, sort_order')
      .eq('organization_id', orgId)
      .order('sort_order', { ascending: true });

    if (catError) throw catError;

    // 各カテゴリの公開商品数を取得
    const categoriesWithCount = await Promise.all(
      (categories || []).map(async (category) => {
        const { data: productIds } = await supabase
          .from('product_categories')
          .select('product_id')
          .eq('category_id', category.id);

        let productCount = 0;
        if (productIds && productIds.length > 0) {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published')
            .in('id', productIds.map(p => p.product_id));
          productCount = count || 0;
        }

        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          image: category.image,
          productCount,
        };
      })
    );

    return { data: categoriesWithCount, error: null };
  } catch (error) {
    console.error('Error fetching shop categories:', error);
    return { data: null, error: 'Failed to fetch categories' };
  }
}

// コンテンツ一覧を取得（ショップ用・ニュース等）
export async function getShopContents(options?: {
  organizationId?: string;
  type?: 'article' | 'news' | 'page' | 'feature';
  limit?: number;
}): Promise<{
  data: ShopContent[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    let organizationId = options?.organizationId;

    if (!organizationId) {
      organizationId = await resolveOrganizationId(supabase) ?? undefined;
      if (!organizationId) return { data: [], error: null };
    }

    let query = supabase
      .from('contents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false });

    if (options?.type) {
      query = query.eq('type', options.type);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data: contents, error: contentsError } = await query;

    if (contentsError) throw contentsError;

    const shopContents: ShopContent[] = (contents || []).map(content => ({
      id: content.id,
      title: content.title,
      slug: content.slug,
      type: content.type,
      excerpt: content.excerpt,
      featuredImage: content.featured_image,
      publishedAt: content.published_at,
      createdAt: content.created_at,
    }));

    return { data: shopContents, error: null };
  } catch (error) {
    console.error('Error fetching shop contents:', error);
    return { data: null, error: 'Failed to fetch contents' };
  }
}

// 単一コンテンツを取得（ショップ用）
export async function getShopContent(contentIdOrSlug: string): Promise<{
  data: (ShopContent & { blocks: unknown[] }) | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('contents')
      .select('*')
      .eq('status', 'published');

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contentIdOrSlug);
    
    if (isUUID) {
      query = query.eq('id', contentIdOrSlug);
    } else {
      query = query.eq('slug', contentIdOrSlug);
    }

    const { data: content, error: contentError } = await query.single();

    if (contentError) {
      if (contentError.code === 'PGRST116') {
        return { data: null, error: 'コンテンツが見つかりません' };
      }
      throw contentError;
    }

    return {
      data: {
        id: content.id,
        title: content.title,
        slug: content.slug,
        type: content.type,
        excerpt: content.excerpt,
        featuredImage: content.featured_image,
        publishedAt: content.published_at,
        createdAt: content.created_at,
        blocks: (content.blocks as unknown[]) || [],
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching shop content:', error);
    return { data: null, error: 'Failed to fetch content' };
  }
}

// ─── アナリティクス計測 ─────────────────────────────────────────────────────

/** 商品ページ閲覧を記録（features.analytics が有効な組織のみ） */
export async function trackProductView(
  productId: string,
  organizationId: string,
  options?: { supplierId?: string; sessionId?: string; customerId?: string; referrer?: string }
): Promise<void> {
  try {
    const supabase = await createClient();

    // analytics フラグ確認
    const { data: org } = await supabase
      .from('organizations')
      .select('features')
      .eq('id', organizationId)
      .single();

    const features = (org?.features as Record<string, boolean>) || {};
    if (!features.analytics) return;

    let supplierId = options?.supplierId || null;
    if (!supplierId) {
      const { data: product } = await supabase
        .from('products')
        .select('supplier_id')
        .eq('id', productId)
        .eq('organization_id', organizationId)
        .single();
      supplierId = (product?.supplier_id as string | null) ?? null;
    }

    await supabase.from('page_views').insert({
      organization_id: organizationId,
      product_id: productId,
      supplier_id: supplierId,
      session_id: options?.sessionId || null,
      customer_id: options?.customerId || null,
      referrer: options?.referrer || null,
    });
  } catch {
    // 計測失敗はサイレントに無視
  }
}

// ─── ショップ お気に入り操作 ────────────────────────────────────────────────

/**
 * 商品をお気に入り登録する（メルマガ受信者リストへの追加）
 * - customerId があればログイン顧客として登録（メルマガ送信対象になる）
 * - sessionId のみの場合は非ログイン扱い（メルマガ対象外）
 */
export async function addShopFavorite(
  productId: string,
  options?: { customerId?: string | null; sessionId?: string | null }
): Promise<void> {
  try {
    const supabase = await createClient();
    const organizationId = await resolveOrganizationId(supabase);
    if (!organizationId) return;

    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('organization_id', organizationId)
      .single();
    if (!product) return;

    const customerId = options?.customerId || null;
    const sessionId = options?.sessionId || null;
    if (!customerId && !sessionId) return;

    await supabase
      .from('product_favorites')
      .upsert(
        {
          organization_id: organizationId,
          product_id: productId,
          customer_id: customerId,
          session_id: sessionId,
        },
        {
          onConflict: customerId ? 'product_id,customer_id' : 'product_id,session_id',
          ignoreDuplicates: true,
        }
      );
  } catch {
    // サイレント失敗（UI をブロックしない）
  }
}

/**
 * 商品のお気に入りを解除する
 */
export async function removeShopFavorite(
  productId: string,
  options?: { customerId?: string | null; sessionId?: string | null }
): Promise<void> {
  try {
    const supabase = await createClient();
    const organizationId = await resolveOrganizationId(supabase);
    if (!organizationId) return;

    const customerId = options?.customerId || null;
    const sessionId = options?.sessionId || null;
    if (!customerId && !sessionId) return;

    let query = supabase
      .from('product_favorites')
      .delete()
      .eq('organization_id', organizationId)
      .eq('product_id', productId);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    } else {
      query = query.eq('session_id', sessionId!);
    }

    await query;
  } catch {
    // サイレント失敗
  }
}

/** 商品クリック（カートに追加・詳細確認など）を記録 */
export async function trackProductClick(
  productId: string,
  organizationId: string,
  options?: { supplierId?: string; sessionId?: string; customerId?: string; clickType?: string }
): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: org } = await supabase
      .from('organizations')
      .select('features')
      .eq('id', organizationId)
      .single();

    const features = (org?.features as Record<string, boolean>) || {};
    if (!features.analytics) return;

    let supplierId = options?.supplierId || null;
    if (!supplierId) {
      const { data: product } = await supabase
        .from('products')
        .select('supplier_id')
        .eq('id', productId)
        .eq('organization_id', organizationId)
        .single();
      supplierId = (product?.supplier_id as string | null) ?? null;
    }

    await supabase.from('product_clicks').insert({
      organization_id: organizationId,
      product_id: productId,
      supplier_id: supplierId,
      session_id: options?.sessionId || null,
      customer_id: options?.customerId || null,
      click_type: options?.clickType || 'detail',
    });
  } catch {
    // 計測失敗はサイレントに無視
  }
}

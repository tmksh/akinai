'use server';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

// 型定義
type Product = Database['public']['Tables']['products']['Row'];
type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
type ProductImage = Database['public']['Tables']['product_images']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Content = Database['public']['Tables']['contents']['Row'];

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
  }[];
  categories: {
    id: string;
    name: string;
    slug: string;
  }[];
  minPrice: number;
  maxPrice: number;
  totalStock: number;
  hasDiscount: boolean;
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

    // 組織IDが指定されていない場合、最初の組織を取得（デモ用）
    if (!organizationId) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);
      
      if (!orgs || orgs.length === 0) {
        return { data: [], error: null };
      }
      organizationId = orgs[0].id;
    }

    // 公開中の商品を取得
    let productQuery = supabase
      .from('products')
      .select('*')
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
      .select('*')
      .in('product_id', productIds);

    if (variantsError) throw variantsError;

    // 画像を取得
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('*')
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
    let categories: Category[] = [];
    if (categoryIds.length > 0) {
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .in('id', categoryIds);
      if (catError) throw catError;
      categories = catData || [];
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
        })),
        categories: productCats.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        })),
        minPrice,
        maxPrice,
        totalStock,
        hasDiscount,
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
    let categories: Category[] = [];
    if (categoryIds.length > 0) {
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .in('id', categoryIds);
      if (catError) throw catError;
      categories = catData || [];
    }

    const prices = variants?.map(v => v.price) || [];
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const totalStock = variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
    const hasDiscount = variants?.some(v => v.compare_at_price && v.compare_at_price > v.price) || false;

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
      })),
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
      })),
      minPrice,
      maxPrice,
      totalStock,
      hasDiscount,
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
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);
      
      if (!orgs || orgs.length === 0) {
        return { data: [], error: null };
      }
      orgId = orgs[0].id;
    }

    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
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
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);
      
      if (!orgs || orgs.length === 0) {
        return { data: [], error: null };
      }
      organizationId = orgs[0].id;
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




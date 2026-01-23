'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/database';

// 型定義
type Product = Database['public']['Tables']['products']['Row'];
type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
type ProductImage = Database['public']['Tables']['product_images']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];

// 商品とリレーションを含んだ型
export interface ProductWithRelations extends Product {
  variants: ProductVariant[];
  images: ProductImage[];
  categories: Category[];
}

// 商品一覧を取得
export async function getProducts(organizationId: string): Promise<{
  data: ProductWithRelations[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 商品を取得
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

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

    // データを結合
    const productsWithRelations: ProductWithRelations[] = products.map(product => ({
      ...product,
      variants: variants?.filter(v => v.product_id === product.id) || [],
      images: images?.filter(i => i.product_id === product.id) || [],
      categories: productCategories
        ?.filter(pc => pc.product_id === product.id)
        .map(pc => categories.find(c => c.id === pc.category_id))
        .filter((c): c is Category => c !== undefined) || [],
    }));

    return { data: productsWithRelations, error: null };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { data: null, error: 'Failed to fetch products' };
  }
}

// カテゴリ一覧を取得
export async function getCategories(organizationId: string): Promise<{
  data: Category[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { data: null, error: 'Failed to fetch categories' };
  }
}

// カテゴリごとの商品数を取得
export async function getCategoriesWithProductCount(organizationId: string): Promise<{
  data: (Category & { productCount: number })[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // カテゴリ一覧を取得
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true });

    if (catError) throw catError;

    // 各カテゴリの商品数を取得
    const categoriesWithCount = await Promise.all(
      (categories || []).map(async (category) => {
        const { count } = await supabase
          .from('product_categories')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id);
        
        return {
          ...category,
          productCount: count || 0,
        };
      })
    );

    return { data: categoriesWithCount, error: null };
  } catch (error) {
    console.error('Error fetching categories with count:', error);
    return { data: null, error: 'Failed to fetch categories' };
  }
}

// カテゴリを作成
export async function createCategory(input: {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  image?: string;
}): Promise<{
  data: Category | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 既存のカテゴリ数を取得してsort_orderを決定
    const { count } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', input.organizationId);

    const { data, error } = await supabase
      .from('categories')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        parent_id: input.parentId || null,
        image: input.image || null,
        sort_order: count || 0,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/products');
    revalidatePath('/products/categories');
    return { data, error: null };
  } catch (error: unknown) {
    console.error('Error creating category:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return { data: null, error: 'このスラッグは既に使用されています' };
    }
    return { data: null, error: 'カテゴリの作成に失敗しました' };
  }
}

// カテゴリを更新
export async function updateCategory(
  categoryId: string,
  input: {
    name?: string;
    slug?: string;
    description?: string;
    parentId?: string | null;
    image?: string | null;
    sortOrder?: number;
  }
): Promise<{
  data: Category | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.parentId !== undefined) updateData.parent_id = input.parentId;
    if (input.image !== undefined) updateData.image = input.image;
    if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;

    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/products');
    revalidatePath('/products/categories');
    return { data, error: null };
  } catch (error: unknown) {
    console.error('Error updating category:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return { data: null, error: 'このスラッグは既に使用されています' };
    }
    return { data: null, error: 'カテゴリの更新に失敗しました' };
  }
}

// カテゴリを削除
export async function deleteCategory(categoryId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // このカテゴリに紐づく商品があるかチェック
    const { count } = await supabase
      .from('product_categories')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if (count && count > 0) {
      return { success: false, error: `このカテゴリには${count}件の商品が紐づいています。先に商品のカテゴリを変更してください。` };
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;

    revalidatePath('/products');
    revalidatePath('/products/categories');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, error: 'カテゴリの削除に失敗しました' };
  }
}

// 単一商品を取得
export async function getProduct(productId: string): Promise<{
  data: ProductWithRelations | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError) throw productError;

    // バリエーションを取得
    const { data: variants, error: variantsError } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId);

    if (variantsError) throw variantsError;

    // 画像を取得
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true });

    if (imagesError) throw imagesError;

    // カテゴリ関連を取得
    const { data: productCategories, error: pcError } = await supabase
      .from('product_categories')
      .select('product_id, category_id')
      .eq('product_id', productId);

    if (pcError) throw pcError;

    // カテゴリ詳細を取得
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

    return {
      data: {
        ...product,
        variants: variants || [],
        images: images || [],
        categories,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    return { data: null, error: 'Failed to fetch product' };
  }
}

// 商品を作成
interface CreateProductInput {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  status: 'draft' | 'published' | 'archived';
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  featured?: boolean;
  categoryIds?: string[];
  variants: {
    name: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    stock: number;
    options?: Record<string, string>;
  }[];
}

export async function createProduct(input: CreateProductInput): Promise<{
  data: Product | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 商品を作成
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        short_description: input.shortDescription || null,
        status: input.status,
        tags: input.tags || [],
        seo_title: input.seoTitle || null,
        seo_description: input.seoDescription || null,
        featured: input.featured || false,
        published_at: input.status === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (productError) throw productError;

    // バリエーションを作成
    if (input.variants.length > 0) {
      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(
          input.variants.map(v => ({
            product_id: product.id,
            name: v.name,
            sku: v.sku,
            price: v.price,
            compare_at_price: v.compareAtPrice || null,
            stock: v.stock,
            options: v.options || {},
          }))
        );

      if (variantsError) throw variantsError;
    }

    // カテゴリ関連を作成
    if (input.categoryIds && input.categoryIds.length > 0) {
      const { error: catError } = await supabase
        .from('product_categories')
        .insert(
          input.categoryIds.map(catId => ({
            product_id: product.id,
            category_id: catId,
          }))
        );

      if (catError) throw catError;
    }

    revalidatePath('/products');
    return { data: product, error: null };
  } catch (error) {
    console.error('Error creating product:', error);
    return { data: null, error: 'Failed to create product' };
  }
}

// 商品を更新
interface UpdateProductInput {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  status?: 'draft' | 'published' | 'archived';
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  featured?: boolean;
  categoryIds?: string[];
  variants?: {
    id?: string;
    name: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    stock: number;
    options?: Record<string, string>;
  }[];
}

export async function updateProduct(input: UpdateProductInput): Promise<{
  data: Product | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 商品を更新
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.shortDescription !== undefined) updateData.short_description = input.shortDescription;
    if (input.status !== undefined) {
      updateData.status = input.status;
      if (input.status === 'published') {
        updateData.published_at = new Date().toISOString();
      }
    }
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.seoTitle !== undefined) updateData.seo_title = input.seoTitle;
    if (input.seoDescription !== undefined) updateData.seo_description = input.seoDescription;
    if (input.featured !== undefined) updateData.featured = input.featured;

    const { data: product, error: productError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single();

    if (productError) throw productError;

    // バリエーションを更新
    if (input.variants !== undefined) {
      // 既存のバリエーションを削除
      await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', input.id);

      // 新しいバリエーションを作成
      if (input.variants.length > 0) {
        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(
            input.variants.map(v => ({
              product_id: input.id,
              name: v.name,
              sku: v.sku,
              price: v.price,
              compare_at_price: v.compareAtPrice || null,
              stock: v.stock,
              options: v.options || {},
            }))
          );

        if (variantsError) throw variantsError;
      }
    }

    // カテゴリ関連を更新
    if (input.categoryIds !== undefined) {
      // 既存の関連を削除
      await supabase
        .from('product_categories')
        .delete()
        .eq('product_id', input.id);

      // 新しい関連を作成
      if (input.categoryIds.length > 0) {
        const { error: catError } = await supabase
          .from('product_categories')
          .insert(
            input.categoryIds.map(catId => ({
              product_id: input.id,
              category_id: catId,
            }))
          );

        if (catError) throw catError;
      }
    }

    revalidatePath('/products');
    revalidatePath(`/products/${input.id}`);
    return { data: product, error: null };
  } catch (error) {
    console.error('Error updating product:', error);
    return { data: null, error: 'Failed to update product' };
  }
}

// 商品を削除
export async function deleteProduct(productId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 関連データは CASCADE で自動削除される
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;

    revalidatePath('/products');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: 'Failed to delete product' };
  }
}

// 商品ステータスを更新
export async function updateProductStatus(
  productId: string,
  status: 'draft' | 'published' | 'archived'
): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const updateData: Record<string, unknown> = { status };
    if (status === 'published') {
      updateData.published_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId);

    if (error) throw error;

    revalidatePath('/products');
    revalidatePath(`/products/${productId}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating product status:', error);
    return { success: false, error: 'Failed to update product status' };
  }
}

// スラッグの重複チェック
export async function checkSlugExists(
  organizationId: string,
  slug: string,
  excludeProductId?: string
): Promise<boolean> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('products')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('slug', slug);

    if (excludeProductId) {
      query = query.neq('id', excludeProductId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking slug:', error);
    return false;
  }
}

// スラッグを生成（名前からユニークなスラッグを作成）
export async function generateUniqueSlug(
  organizationId: string,
  name: string,
  excludeProductId?: string
): Promise<string> {
  // 基本的なスラッグを生成
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let slug = baseSlug;
  let counter = 1;

  while (await checkSlugExists(organizationId, slug, excludeProductId)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}


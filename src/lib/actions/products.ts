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
export async function getProducts(
  organizationId: string,
  options?: { limit?: number; offset?: number; status?: string; search?: string }
): Promise<{
  data: ProductWithRelations[] | null;
  error: string | null;
  total: number;
}> {
  const supabase = await createClient();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  try {
    // 1クエリで商品＋バリエーション＋画像＋カテゴリをJOIN取得
    let query = supabase
      .from('products')
      .select(`
        *,
        product_variants (*),
        product_images (*),
        product_categories (
          category_id,
          categories (*)
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    if (options?.search) {
      query = query.ilike('name', `%${options.search}%`);
    }

    const { data: products, error: productsError, count } = await query;

    if (productsError) throw productsError;
    if (!products || products.length === 0) {
      return { data: [], error: null, total: 0 };
    }

    // データを整形
    const productsWithRelations: ProductWithRelations[] = products.map(product => {
      const { product_variants, product_images, product_categories, ...rest } = product as Record<string, unknown>;
      const variants = (product_variants as ProductVariant[]) || [];
      const images = ((product_images as ProductImage[]) || [])
        .sort((a, b) => a.sort_order - b.sort_order);
      const categories = ((product_categories as { category_id: string; categories: Category }[]) || [])
        .map(pc => pc.categories)
        .filter((c): c is Category => c !== null && c !== undefined);

      return {
        ...(rest as Product),
        variants,
        images,
        categories,
      };
    });

    return { data: productsWithRelations, error: null, total: count ?? productsWithRelations.length };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { data: null, error: 'Failed to fetch products', total: 0 };
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
    // カテゴリ一覧をproduct_categoriesカウント付きで1クエリで取得
    const [catRes, pcRes] = await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('product_categories')
        .select('category_id, categories!inner(organization_id)')
        .eq('categories.organization_id', organizationId),
    ]);

    if (catRes.error) throw catRes.error;

    // JSで集計（N+1クエリ不要）
    const pcData = pcRes.data || [];
    const countMap = pcData.reduce<Record<string, number>>((acc, row) => {
      acc[row.category_id] = (acc[row.category_id] || 0) + 1;
      return acc;
    }, {});

    const categoriesWithCount = (catRes.data || []).map(category => ({
      ...category,
      productCount: countMap[category.id] || 0,
    }));

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
    // 1クエリでJOIN取得
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_variants (*),
        product_images (*),
        product_categories (
          category_id,
          categories (*)
        )
      `)
      .eq('id', productId)
      .single();

    if (error) throw error;
    if (!product) return { data: null, error: 'Product not found' };

    const { product_variants, product_images, product_categories, ...rest } = product as Record<string, unknown>;
    const variants = (product_variants as ProductVariant[]) || [];
    const images = ((product_images as ProductImage[]) || [])
      .sort((a, b) => a.sort_order - b.sort_order);
    const categories = ((product_categories as { category_id: string; categories: Category }[]) || [])
      .map(pc => pc.categories)
      .filter((c): c is Category => c !== null && c !== undefined);

    return {
      data: { ...(rest as Product), variants, images, categories },
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
  customFields?: { key: string; label: string; value: string; type: string; options?: string[] }[];
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
        custom_fields: input.customFields || [],
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
  customFields?: { key: string; label: string; value: string; type: string; options?: string[] }[];
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
    if (input.customFields !== undefined) updateData.custom_fields = input.customFields;

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

// CSVインポート用の型
export interface CsvProductRow {
  name: string;
  slug: string;
  category: string;
  subcategory: string;
  size: string;
  price: number;
  status: string;
  description: string;
  sortOrder: number;
  imageUrls: string[];
}

export interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { row: number; name: string; error: string }[];
}

// 商品を一括インポート
export async function importProducts(
  organizationId: string,
  rows: CsvProductRow[]
): Promise<ImportResult> {
  const supabase = await createClient();
  const result: ImportResult = { total: rows.length, success: 0, failed: 0, errors: [] };

  // カテゴリキャッシュ（名前 → ID）
  const categoryCache = new Map<string, string>();

  // 既存カテゴリを取得してキャッシュ
  const { data: existingCategories } = await supabase
    .from('categories')
    .select('*')
    .eq('organization_id', organizationId);

  for (const cat of existingCategories || []) {
    categoryCache.set(cat.slug, cat.id);
  }

  // カテゴリを取得or作成
  async function getOrCreateCategory(slug: string, name: string): Promise<string | null> {
    if (!slug) return null;
    const cached = categoryCache.get(slug);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('categories')
      .insert({
        organization_id: organizationId,
        name,
        slug,
        sort_order: categoryCache.size,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('categories')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('slug', slug)
          .single();
        if (existing) {
          categoryCache.set(slug, existing.id);
          return existing.id;
        }
      }
      return null;
    }
    categoryCache.set(slug, data.id);
    return data.id;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // slugの重複チェック
      const slugExists = await checkSlugExists(organizationId, row.slug);
      if (slugExists) {
        result.errors.push({ row: i + 1, name: row.name, error: 'スラッグが既に存在します' });
        result.failed++;
        continue;
      }

      const validStatus = ['draft', 'published', 'archived'].includes(row.status)
        ? row.status as 'draft' | 'published' | 'archived'
        : 'draft';

      // 商品を作成
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          organization_id: organizationId,
          name: row.name,
          slug: row.slug,
          description: row.description || null,
          status: validStatus,
          tags: [],
          featured: false,
          custom_fields: [],
          published_at: validStatus === 'published' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (productError) throw productError;

      // バリエーション作成
      const options: Record<string, string> = {};
      if (row.size) options['サイズ'] = row.size;
      if (row.subcategory) options['サブカテゴリ'] = row.subcategory;

      const { error: variantError } = await supabase
        .from('product_variants')
        .insert({
          product_id: product.id,
          name: 'デフォルト',
          sku: row.slug,
          price: row.price,
          stock: 0,
          options,
        });

      if (variantError) throw variantError;

      // 画像を登録
      if (row.imageUrls.length > 0) {
        const imageInserts = row.imageUrls.map((url, idx) => ({
          product_id: product.id,
          url,
          alt: row.name,
          sort_order: idx,
        }));

        const { error: imageError } = await supabase
          .from('product_images')
          .insert(imageInserts);

        if (imageError) throw imageError;
      }

      // カテゴリ関連付け
      const categoryId = await getOrCreateCategory(row.category, row.category);
      if (categoryId) {
        await supabase.from('product_categories').insert({
          product_id: product.id,
          category_id: categoryId,
        });
      }

      result.success++;
    } catch (error) {
      result.failed++;
      const msg = error instanceof Error ? error.message : '不明なエラー';
      result.errors.push({ row: i + 1, name: row.name, error: msg });
    }
  }

  revalidatePath('/products');
  revalidatePath('/products/categories');
  return result;
}

// 商品を複製
export async function duplicateProduct(productId: string): Promise<{
  data: Product | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 元の商品を全リレーション含めて1クエリで取得
    const { data: orig, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        product_variants (*),
        product_images (*),
        product_categories (category_id)
      `)
      .eq('id', productId)
      .single();

    if (productError) throw productError;
    if (!orig) {
      return { data: null, error: '商品が見つかりません' };
    }

    const origAny = orig as Record<string, unknown>;
    const origVariants = (origAny.product_variants as ProductVariant[]) || [];
    const origImages = (origAny.product_images as ProductImage[]) || [];
    const origCats = (origAny.product_categories as { category_id: string }[]) || [];

    // ユニークなスラッグを生成
    const newSlug = await generateUniqueSlug(
      orig.organization_id,
      `${orig.name} (コピー)`
    );

    // 商品を複製（下書きとして作成）
    const { data: newProduct, error: newProductError } = await supabase
      .from('products')
      .insert({
        organization_id: orig.organization_id,
        name: `${orig.name} (コピー)`,
        slug: newSlug,
        description: orig.description,
        short_description: orig.short_description,
        status: 'draft',
        tags: orig.tags,
        seo_title: orig.seo_title,
        seo_description: orig.seo_description,
        featured: false,
        published_at: null,
      })
      .select()
      .single();

    if (newProductError) throw newProductError;

    // バリエーション・画像・カテゴリを並列で複製
    const inserts: PromiseLike<unknown>[] = [];

    if (origVariants.length > 0) {
      const timestamp = Date.now();
      inserts.push(supabase.from('product_variants').insert(
        origVariants.map((v, index) => ({
          product_id: newProduct.id,
          name: v.name,
          sku: `${v.sku}-COPY-${timestamp}-${index}`,
          price: v.price,
          compare_at_price: v.compare_at_price,
          stock: 0,
          low_stock_threshold: v.low_stock_threshold,
          options: v.options,
        }))
      ));
    }

    if (origImages.length > 0) {
      inserts.push(supabase.from('product_images').insert(
        origImages.map((img) => ({
          product_id: newProduct.id,
          url: img.url,
          alt: img.alt,
          sort_order: img.sort_order,
        }))
      ));
    }

    if (origCats.length > 0) {
      inserts.push(supabase.from('product_categories').insert(
        origCats.map((cat) => ({
          product_id: newProduct.id,
          category_id: cat.category_id,
        }))
      ));
    }

    await Promise.all(inserts);

    revalidatePath('/products');
    return { data: newProduct, error: null };
  } catch (error) {
    console.error('Error duplicating product:', error);
    return { data: null, error: '商品の複製に失敗しました' };
  }
}


'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import {
  getOrSetCached,
  orgCacheKey,
  invalidateOrgCache,
  MEMORY_TTL,
} from '@/lib/api/memory-cache';
import type { Database } from '@/types/database';

function getAdminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

function bustProductCaches(organizationId: string) {
  invalidateOrgCache(organizationId, 'products');
  invalidateOrgCache(organizationId, 'categories');
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
  const limit = options?.limit;
  const offset = options?.offset ?? 0;
  const cacheSuffix = `l${limit ?? 'all'}:o${offset}:s${options?.status ?? 'all'}:q${options?.search ?? ''}`;

  return getOrSetCached(
    orgCacheKey(organizationId, 'products', cacheSuffix),
    MEMORY_TTL.adminList,
    async () => {
  const supabase = await createClient();

  try {
    // 一覧用: description/tags を除外し転送量を削減
    let query = supabase
      .from('products')
      .select(`
        id, name, slug, status, featured, custom_fields, created_at, organization_id,
        product_variants (id, sku, price, stock),
        product_images (id, url, thumbnail_url, alt, sort_order),
        product_categories (
          category_id,
          categories (id, name, slug)
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (limit !== undefined) {
      query = query.range(offset, offset + limit - 1);
    }

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

    // データを整形（同一 ID の重複を除去してからマップ）
    const seenIds = new Set<string>();
    const productsWithRelations: ProductWithRelations[] = products
      .filter(product => {
        if (seenIds.has(product.id)) return false;
        seenIds.add(product.id);
        return true;
      })
      .map(product => {
      const { product_variants, product_images, product_categories, ...rest } = product as Record<string, unknown>;
      const variants = (product_variants as ProductVariant[]) || [];
      const images = ((product_images as ProductImage[]) || [])
        .sort((a, b) => a.sort_order - b.sort_order)
        .slice(0, 1);
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
    },
  );
}

// カテゴリ一覧を取得
export async function getCategories(organizationId: string): Promise<{
  data: Category[] | null;
  error: string | null;
}> {
  return getOrSetCached(
    orgCacheKey(organizationId, 'categories'),
    MEMORY_TTL.settings,
    async () => {
      const supabase = await createClient();
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug, description, parent_id, sort_order, image, organization_id, created_at, updated_at')
          .eq('organization_id', organizationId)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error('Error fetching categories:', error);
        return { data: null, error: 'Failed to fetch categories' };
      }
    },
  );
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

    bustProductCaches(input.organizationId);
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

    bustProductCaches(data.organization_id);
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

    const { data: category } = await supabase
      .from('categories')
      .select('organization_id')
      .eq('id', categoryId)
      .single();

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;

    if (category?.organization_id) bustProductCaches(category.organization_id);
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

    const normalizedCustomFields = Array.isArray(rest.custom_fields) ? rest.custom_fields : [];

    return {
      data: { ...(rest as Product), custom_fields: normalizedCustomFields, variants, images, categories },
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
      // 組織内の既存SKUと衝突しないよう一意化（同一組み合わせの別商品との衝突を解消）
      const { data: otherVariants } = await supabase
        .from('product_variants')
        .select('sku')
        .eq('organization_id', input.organizationId);
      const usedSkus = new Set((otherVariants || []).map((v) => v.sku as string));

      const variantInserts = input.variants.map(v => {
        let sku = (v.sku || '').trim() || `VAR-${product.id.slice(0, 8)}`;
        if (usedSkus.has(sku)) {
          const base = `${sku}-${product.id.slice(0, 4).toUpperCase()}`;
          let candidate = base;
          let n = 1;
          while (usedSkus.has(candidate)) {
            candidate = `${base}${n}`;
            n++;
          }
          sku = candidate;
        }
        usedSkus.add(sku);
        return {
          product_id: product.id,
          organization_id: input.organizationId,
          name: v.name,
          sku,
          price: v.price,
          compare_at_price: v.compareAtPrice || null,
          stock: v.stock,
          options: v.options || {},
        };
      });

      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(variantInserts);

      if (variantsError) {
        // バリアント挿入失敗時は孤立した商品を削除してロールバック
        await supabase.from('products').delete().eq('id', product.id);
        throw variantsError;
      }
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

    bustProductCaches(input.organizationId);
    revalidatePath('/products');
    return { data: product, error: null };
  } catch (error) {
    console.error('Error creating product:', error);
    const message = error instanceof Error ? error.message : String(error);
    // SKUの重複エラーを分かりやすく変換
    if (message.includes('duplicate') && message.includes('sku')) {
      return { data: null, error: 'このSKUはすでに使用されています。別のSKUを入力してください。' };
    }
    return { data: null, error: `商品の作成に失敗しました: ${message}` };
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
    // 注意: (organization_id, sku) のユニーク制約があるため、
    // 同じ組み合わせ名を持つ別商品が同一SKUを生成すると衝突する。
    // サーバー側で組織内のSKU一意性を保証し、失敗時は既存データを復元する。
    if (input.variants !== undefined) {
      const orgId = product.organization_id as string;

      // 既存バリエーションを全カラム取得（INSERT失敗時のロールバック用）
      const { data: existingVariants } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', input.id);
      const existingIds = (existingVariants || []).map((v) => v.id);

      if (input.variants.length > 0) {
        // 組織内の他商品が使用中のSKUを取得（衝突回避の対象）
        const { data: otherVariants } = await supabase
          .from('product_variants')
          .select('sku')
          .eq('organization_id', orgId)
          .neq('product_id', input.id);
        const usedSkus = new Set((otherVariants || []).map((v) => v.sku as string));

        // 各バリアントのSKUを組織内で一意になるよう確定（バッチ内重複も回避）
        const newInserts = input.variants.map((v) => {
          let sku = (v.sku || '').trim() || `VAR-${product.id.slice(0, 8)}`;
          if (usedSkus.has(sku)) {
            // 商品IDを混ぜたサフィックスで一意化（同一組み合わせの別商品との衝突を解消）
            const base = `${sku}-${product.id.slice(0, 4).toUpperCase()}`;
            let candidate = base;
            let n = 1;
            while (usedSkus.has(candidate)) {
              candidate = `${base}${n}`;
              n++;
            }
            sku = candidate;
          }
          usedSkus.add(sku);
          return {
            product_id: input.id,
            organization_id: orgId,
            name: v.name,
            sku,
            price: v.price,
            compare_at_price: v.compareAtPrice || null,
            stock: v.stock,
            options: v.options || {},
          };
        });

        // 古いバリアントを削除してから新バリアントをINSERT
        if (existingIds.length > 0) {
          await supabase.from('product_variants').delete().in('id', existingIds);
        }

        const { error: variantsError } = await supabase
          .from('product_variants')
          .insert(newInserts);

        if (variantsError) {
          // INSERT失敗時: 削除済みの既存バリアントを復元してデータロスを防ぐ
          if (existingVariants && existingVariants.length > 0) {
            await supabase.from('product_variants').insert(existingVariants);
          }
          throw variantsError;
        }
      } else {
        // バリアントが空 → 既存を削除
        if (existingIds.length > 0) {
          await supabase.from('product_variants').delete().in('id', existingIds);
        }
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

    bustProductCaches(product.organization_id);
    revalidatePath('/products');
    revalidatePath(`/products/${input.id}`);

    // eiwanext の Netlify ビルドをトリガー（fire-and-forget）
    const buildHookUrl = process.env.NETLIFY_BUILD_HOOK_URL;
    if (buildHookUrl) {
      fetch(buildHookUrl, { method: 'POST' }).catch(() => {});
    }

    return { data: product, error: null };
  } catch (error) {
    console.error('Error updating product:', error);
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('duplicate') && message.includes('sku')) {
      return { data: null, error: 'このSKUはすでに使用されています。別のSKUを入力してください。' };
    }
    return { data: null, error: `商品の更新に失敗しました: ${message}` };
  }
}

// 商品を削除
export async function deleteProduct(productId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { data: product } = await supabase
      .from('products')
      .select('organization_id')
      .eq('id', productId)
      .single();

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;

    if (product?.organization_id) bustProductCaches(product.organization_id);
    revalidatePath('/products');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: 'Failed to delete product' };
  }
}

// 商品を一括削除
export async function deleteProducts(productIds: string[]): Promise<{
  success: boolean;
  deletedCount: number;
  error: string | null;
}> {
  if (!productIds || productIds.length === 0) {
    return { success: true, deletedCount: 0, error: null };
  }

  const supabase = await createClient();

  try {
    const { data: orgRow } = await supabase
      .from('products')
      .select('organization_id')
      .in('id', productIds)
      .limit(1)
      .maybeSingle();

    const { error, count } = await supabase
      .from('products')
      .delete({ count: 'exact' })
      .in('id', productIds);

    if (error) throw error;

    if (orgRow?.organization_id) bustProductCaches(orgRow.organization_id);
    revalidatePath('/products');
    return { success: true, deletedCount: count ?? productIds.length, error: null };
  } catch (error) {
    console.error('Error bulk deleting products:', error);
    return { success: false, deletedCount: 0, error: 'Failed to delete products' };
  }
}

// 複数商品のカスタムフィールドを個別値で一括更新
// entries: [{ productId, value }] — 商品ごとに異なる値を設定できる
export async function bulkUpdateCustomFieldPerProduct(
  entries: { productId: string; value: string }[],
  fieldKey: string,
  fieldLabel: string,
  fieldType: string,
): Promise<{ success: boolean; updatedCount?: number; error?: string }> {
  if (!entries || entries.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  const supabase = await createClient();
  const productIds = entries.map(e => e.productId);

  try {
    const { data: rows, error: fetchError } = await supabase
      .from('products')
      .select('id, custom_fields, organization_id')
      .in('id', productIds);

    if (fetchError || !rows) throw fetchError ?? new Error('fetch failed');

    const valueMap = new Map(entries.map(e => [e.productId, e.value]));

    const updates = rows.map((p) => {
      const fields: Array<Record<string, unknown>> = Array.isArray(p.custom_fields)
        ? (p.custom_fields as Array<Record<string, unknown>>)
        : [];
      const newValue = valueMap.get(p.id) ?? '';
      const idx = fields.findIndex((f) => f.key === fieldKey);
      if (idx >= 0) {
        fields[idx] = { ...fields[idx], value: newValue };
      } else {
        fields.push({ id: fieldKey, key: fieldKey, label: fieldLabel, value: newValue, type: fieldType });
      }
      return { id: p.id, custom_fields: fields };
    });

    for (const u of updates) {
      const { error } = await supabase
        .from('products')
        .update({ custom_fields: u.custom_fields })
        .eq('id', u.id);
      if (error) throw error;
    }

    const orgId = rows[0]?.organization_id as string | undefined;
    if (orgId) bustProductCaches(orgId);
    revalidatePath('/products');
    return { success: true, updatedCount: updates.length };
  } catch (error) {
    console.error('Error bulk updating custom field per product:', error);
    return { success: false, error: 'カスタムフィールドの一括更新に失敗しました' };
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

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select('organization_id')
      .single();

    if (error) throw error;

    if (product?.organization_id) bustProductCaches(product.organization_id);
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
  id?: string;
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
  customFields?: { key: string; label: string; value: string; type: string; options?: string[] }[];
}

export interface ImportResult {
  total: number;
  success: number;
  updated: number;
  failed: number;
  errors: { row: number; name: string; error: string }[];
}

// 商品を一括インポート（新規作成 & 既存商品更新対応）
export async function importProducts(
  organizationId: string,
  rows: CsvProductRow[]
): Promise<ImportResult> {
  const supabase = getAdminClient();
  const result: ImportResult = { total: rows.length, success: 0, updated: 0, failed: 0, errors: [] };

  if (rows.length === 0) return result;

  // 名前からslugを生成するヘルパー
  const toSlug = (name: string): string =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'product';

  // ① 既存商品を一括取得（id・slug・name 三段階でマッチできるように）
  const { data: existingProducts, error: existingError } = await supabase
    .from('products')
    .select('id, slug, name')
    .eq('organization_id', organizationId);

  if (existingError) {
    return {
      total: rows.length,
      success: 0,
      updated: 0,
      failed: rows.length,
      errors: rows.map((r, i) => ({ row: i + 1, name: r.name, error: `既存商品取得失敗: ${existingError.message}` })),
    };
  }

  const existingById = new Map<string, string>(); // id → slug
  const existingBySlug = new Map<string, string>(); // slug → id
  const existingByName = new Map<string, string>(); // name(lowercase) → id
  const usedSlugs = new Set<string>();
  for (const p of existingProducts ?? []) {
    existingById.set(p.id, p.slug);
    existingBySlug.set(p.slug, p.id);
    existingByName.set(p.name.trim().toLowerCase(), p.id);
    usedSlugs.add(p.slug);
  }

  // ② 既存カテゴリを一括取得
  const { data: existingCategories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('organization_id', organizationId);

  const categoryMap = new Map<string, string>();
  for (const cat of existingCategories ?? []) {
    categoryMap.set(cat.name, cat.id);
    if (cat.slug && cat.slug !== cat.name) categoryMap.set(cat.slug, cat.id);
  }

  // ③ 新規カテゴリをまとめて作成
  const orgSlugPrefix = organizationId.slice(0, 8);
  const newCategoryNames = Array.from(
    new Set(rows.map((r) => r.category).filter((c) => c && !categoryMap.has(c)))
  );
  if (newCategoryNames.length > 0) {
    const baseSortOrder = categoryMap.size;
    const newCategoryRows = newCategoryNames.map((name, idx) => ({
      organization_id: organizationId,
      name,
      slug: `${orgSlugPrefix}-${toSlug(name)}`,
      sort_order: baseSortOrder + idx,
    }));
    const { data: insertedCats, error: catInsertError } = await supabase
      .from('categories')
      .insert(newCategoryRows)
      .select('id, name, slug');

    if (catInsertError) {
      console.error('カテゴリ作成エラー:', catInsertError);
      const { data: refetched } = await supabase
        .from('categories')
        .select('id, name')
        .eq('organization_id', organizationId)
        .in('name', newCategoryNames);
      for (const cat of refetched ?? []) {
        categoryMap.set(cat.name, cat.id);
      }
    } else {
      for (const cat of insertedCats ?? []) {
        categoryMap.set(cat.name, cat.id);
      }
    }
  }

  const validStatuses = ['draft', 'published', 'archived'] as const;
  type Status = typeof validStatuses[number];

  // ④ 行を「更新」と「新規作成」に分類
  type PreparedRow = { idx: number; row: CsvProductRow; slug: string; status: Status; existingId: string | null };
  const prepared: PreparedRow[] = rows.map((row, idx) => {
    const status: Status = (validStatuses as readonly string[]).includes(row.status)
      ? (row.status as Status)
      : 'draft';

    // id が指定されていて既存商品に一致 → 更新
    if (row.id?.trim() && existingById.has(row.id.trim())) {
      const slug = existingById.get(row.id.trim())!;
      return { idx, row, slug, status, existingId: row.id.trim() };
    }

    // slug が指定されていて既存商品に一致 → 更新
    const rowSlug = row.slug?.trim();
    if (rowSlug && existingBySlug.has(rowSlug)) {
      return { idx, row, slug: rowSlug, status, existingId: existingBySlug.get(rowSlug)! };
    }

    // 商品名が既存商品と完全一致 → 重複作成を防ぐため更新扱い（第3優先フォールバック）
    const normalizedName = row.name.trim().toLowerCase();
    const matchedIdByName = existingByName.get(normalizedName);
    if (matchedIdByName) {
      const matchedSlug = existingById.get(matchedIdByName) ?? rowSlug ?? toSlug(row.name);
      return { idx, row, slug: matchedSlug, status, existingId: matchedIdByName };
    }

    // 新規作成: slug をユニークに
    let slug = rowSlug || '';
    if (!slug || usedSlugs.has(slug)) {
      const baseSlug = toSlug(row.name);
      slug = baseSlug;
      let counter = 1;
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${counter++}`;
      }
    }
    usedSlugs.add(slug);
    return { idx, row, slug, status, existingId: null };
  });

  const toUpdate = prepared.filter((p) => p.existingId !== null);
  const toInsert = prepared.filter((p) => p.existingId === null);

  // ⑤-A 既存商品の更新
  for (const { row, slug, status, existingId } of toUpdate) {
    if (!existingId) continue;
    try {
      const updatePayload: Record<string, unknown> = {
        name: row.name,
        description: row.description || null,
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
      };
      // カスタムフィールドが指定されている場合のみ更新
      if (row.customFields && row.customFields.length > 0) {
        // 既存のカスタムフィールドを取得して差分マージ
        const { data: currentProduct } = await supabase
          .from('products')
          .select('custom_fields')
          .eq('id', existingId)
          .single();
        const existingCf: Array<{ key: string; label: string; value: unknown; type: string }> =
          (currentProduct?.custom_fields as typeof existingCf) ?? [];
        const cfMap = new Map(existingCf.map((f) => [f.key, f]));
        for (const newCf of row.customFields) {
          cfMap.set(newCf.key, { key: newCf.key, label: newCf.label, value: newCf.value, type: newCf.type });
        }
        updatePayload.custom_fields = Array.from(cfMap.values());
      }

      const { error: updateError } = await supabase
        .from('products')
        .update(updatePayload)
        .eq('id', existingId);
      if (updateError) throw updateError;

      // バリアント価格更新（最初のバリアントのみ）
      await supabase
        .from('product_variants')
        .update({ price: row.price })
        .eq('product_id', existingId)
        .order('created_at', { ascending: true })
        .limit(1);

      // 画像が指定されている場合は置き換え
      if (row.imageUrls.length > 0) {
        await supabase.from('product_images').delete().eq('product_id', existingId);
        const imageInserts = row.imageUrls.map((url, imgIdx) => ({
          product_id: existingId,
          url,
          alt: row.name,
          sort_order: imgIdx,
        }));
        await supabase.from('product_images').insert(imageInserts);
      }

      // カテゴリが指定されている場合は置き換え
      if (row.category) {
        const categoryId = categoryMap.get(row.category);
        if (categoryId) {
          await supabase.from('product_categories').delete().eq('product_id', existingId);
          await supabase.from('product_categories').insert({ product_id: existingId, category_id: categoryId });
        }
      }

      result.updated++;
      result.success++;
    } catch (err) {
      result.errors.push({ row: 0, name: row.name, error: `更新失敗: ${err instanceof Error ? err.message : String(err)}` });
      result.failed++;
    }
    void slug;
  }

  // ⑤-B 新規商品のまとめてINSERT
  if (toInsert.length > 0) {
    const productInserts = toInsert.map(({ row, slug, status }) => ({
      organization_id: organizationId,
      name: row.name,
      slug,
      description: row.description || null,
      status,
      tags: [],
      featured: false,
      custom_fields: row.customFields || [],
      published_at: status === 'published' ? new Date().toISOString() : null,
    }));

    const { data: insertedProducts, error: productInsertError } = await supabase
      .from('products')
      .insert(productInserts)
      .select('id, slug');

    if (productInsertError || !insertedProducts) {
      for (const { row } of toInsert) {
        result.errors.push({ row: 0, name: row.name, error: `商品作成失敗: ${productInsertError?.message ?? '不明'}` });
        result.failed++;
      }
    } else {
      const productIdBySlug = new Map<string, string>();
      for (const p of insertedProducts) {
        productIdBySlug.set(p.slug, p.id);
      }

      const variantInserts: Array<Record<string, unknown>> = [];
      const imageInserts: Array<Record<string, unknown>> = [];
      const productCategoryInserts: Array<{ product_id: string; category_id: string }> = [];

      for (const { row, slug } of toInsert) {
        const productId = productIdBySlug.get(slug);
        if (!productId) {
          result.errors.push({ row: 0, name: row.name, error: '商品IDが取得できませんでした' });
          result.failed++;
          continue;
        }

        const options: Record<string, string> = {};
        if (row.size) options['サイズ'] = row.size;
        if (row.subcategory) options['サブカテゴリ'] = row.subcategory;

        variantInserts.push({
          product_id: productId,
          name: 'デフォルト',
          sku: `${orgSlugPrefix}-${slug}`,
          price: row.price,
          stock: 1,
          options,
        });

        for (let imgIdx = 0; imgIdx < row.imageUrls.length; imgIdx++) {
          imageInserts.push({
            product_id: productId,
            url: row.imageUrls[imgIdx],
            alt: row.name,
            sort_order: imgIdx,
          });
        }

        if (row.category) {
          const categoryId = categoryMap.get(row.category);
          if (categoryId) {
            productCategoryInserts.push({ product_id: productId, category_id: categoryId });
          }
        }

        result.success++;
      }

      const batchPromises: Array<PromiseLike<unknown>> = [];
      if (variantInserts.length > 0) {
        batchPromises.push(
          supabase.from('product_variants').insert(variantInserts)
            .then(({ error }) => { if (error) console.error('バリエーション一括作成エラー:', error); })
        );
      }
      if (imageInserts.length > 0) {
        batchPromises.push(
          supabase.from('product_images').insert(imageInserts)
            .then(({ error }) => { if (error) console.error('画像一括作成エラー:', error); })
        );
      }
      if (productCategoryInserts.length > 0) {
        batchPromises.push(
          supabase.from('product_categories').insert(productCategoryInserts)
            .then(({ error }) => { if (error) console.error('カテゴリ関連付け一括作成エラー:', error); })
        );
      }
      await Promise.all(batchPromises);
    }
  }

  bustProductCaches(organizationId);
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

    bustProductCaches(orig.organization_id);
    revalidatePath('/products');
    return { data: newProduct, error: null };
  } catch (error) {
    console.error('Error duplicating product:', error);
    return { data: null, error: '商品の複製に失敗しました' };
  }
}

// ============================================
// 外部Supabase（dabranch.com）からバリアント画像を同期
// ============================================
export interface SyncVariantImagesResult {
  total: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function syncVariantImagesFromSource(
  organizationId: string,
  sourceSupabaseUrl: string,
  sourceSupabaseKey: string
): Promise<SyncVariantImagesResult> {
  const result: SyncVariantImagesResult = { total: 0, updated: 0, skipped: 0, errors: [] };
  const destClient = getAdminClient();

  try {
    // 同期元からバリアント一覧を取得（image_url付き）
    const sourceRes = await fetch(
      `${sourceSupabaseUrl}/rest/v1/product_variants?select=sku,image_url&image_url=not.is.null`,
      {
        headers: {
          apikey: sourceSupabaseKey,
          Authorization: `Bearer ${sourceSupabaseKey}`,
        },
      }
    );

    if (!sourceRes.ok) {
      result.errors.push(`同期元の取得に失敗しました: ${sourceRes.status} ${sourceRes.statusText}`);
      return result;
    }

    const sourceVariants: { sku: string; image_url: string | null }[] = await sourceRes.json();
    result.total = sourceVariants.length;

    // 画像URLがあるものだけ処理
    const toUpdate = sourceVariants.filter(v => v.image_url);

    for (const sv of toUpdate) {
      // akinai側で同一SKUのバリアントを検索
      const { data: destVariant, error: findError } = await destClient
        .from('product_variants')
        .select('id, image_url')
        .eq('sku', sv.sku)
        .single();

      if (findError || !destVariant) {
        result.skipped++;
        continue;
      }

      // 既に同じURLが設定されていればスキップ
      if (destVariant.image_url === sv.image_url) {
        result.skipped++;
        continue;
      }

      const { error: updateError } = await destClient
        .from('product_variants')
        .update({ image_url: sv.image_url })
        .eq('id', destVariant.id);

      if (updateError) {
        result.errors.push(`SKU ${sv.sku}: ${updateError.message}`);
      } else {
        result.updated++;
      }
    }

    bustProductCaches(organizationId);
    revalidatePath('/products');
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : '不明なエラー';
    result.errors.push(msg);
    return result;
  }
}

// ============================================
// マイグレーション：product_variants に image_url を追加
// ============================================
export async function ensureVariantImageUrlColumn(): Promise<{ ok: boolean; message: string }> {
  const supabase = getAdminClient();

  try {
    // image_url カラムが存在するか確認（存在しなければ追加）
    const { error } = await supabase.rpc('exec_sql' as never, {
      sql: 'ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS image_url TEXT;',
    } as never);

    // rpc が無い環境では REST API でテスト更新してカラム存在を確認
    if (error) {
      // カラムが既に存在すれば問題なし
      if (error.message?.includes('already exists') || error.message?.includes('42701')) {
        return { ok: true, message: 'カラムは既に存在します' };
      }
      // 直接 SQL 実行できない場合はフラグのみ返す
      return { ok: true, message: 'マイグレーションはSupabaseダッシュボードから手動で適用してください' };
    }

    return { ok: true, message: 'image_url カラムを追加しました' };
  } catch {
    return { ok: true, message: 'マイグレーションはSupabaseダッシュボードから手動で適用してください' };
  }
}

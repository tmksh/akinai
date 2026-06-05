/**
 * ストアフロント向けデータ取得（bootstrap / 個別 API で共用）
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { contentTypeConfig } from '@/lib/content-types';
import { getOrSetCached, orgCacheKey, MEMORY_TTL } from './memory-cache';
import {
  PRODUCT_LIST_SELECT,
  formatPublicProduct,
  extractCategoriesFromProductCategories,
} from './product-format';

export async function fetchContentTypes(
  supabase: SupabaseClient,
  organizationId: string,
) {
  return getOrSetCached(
    orgCacheKey(organizationId, 'content-types'),
    MEMORY_TTL.master,
    async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      const settings = (org?.settings as Record<string, unknown>) || {};
      const enabled = (settings.enabled_content_types as string[] | undefined) || [];
      const customContentTypes =
        (settings.custom_content_types as { key: string; label: string }[] | undefined) || [];
      const customTypeMap = Object.fromEntries(customContentTypes.map((t) => [t.key, t.label]));

      return enabled.map((value) => ({
        value,
        label: contentTypeConfig[value]?.label ?? customTypeMap[value] ?? value,
      }));
    },
  );
}

export async function fetchFlatCategories(
  supabase: SupabaseClient,
  organizationId: string,
) {
  return getOrSetCached(
    orgCacheKey(organizationId, 'categories-flat'),
    MEMORY_TTL.catalog,
    async () => {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, image, parent_id, sort_order')
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const rows = categories || [];
      const categoryIds = rows.map((c) => c.id);
      let productCounts: Record<string, number> = {};

      if (categoryIds.length > 0) {
        const { data: pcData } = await supabase
          .from('product_categories')
          .select('category_id')
          .in('category_id', categoryIds);

        if (pcData) {
          productCounts = pcData.reduce((acc: Record<string, number>, pc) => {
            acc[pc.category_id] = (acc[pc.category_id] || 0) + 1;
            return acc;
          }, {});
        }
      }

      return rows.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: c.image,
        parentId: c.parent_id,
        sortOrder: c.sort_order,
        productCount: productCounts[c.id] || 0,
      }));
    },
  );
}

export async function fetchShippingSummary(
  supabase: SupabaseClient,
  organizationId: string,
) {
  return getOrSetCached(
    orgCacheKey(organizationId, 'shipping-summary'),
    MEMORY_TTL.settings,
    async () => {
      const { data: org } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single();

      const settings = (org?.settings || {}) as Record<string, unknown>;
      const shippingSettings = (settings.shipping || {}) as Record<string, unknown>;

      const defaultFee = Number(shippingSettings.default_shipping_fee) || 500;
      const freeThreshold = Number(shippingSettings.free_shipping_threshold) || 5500;
      const codFee = Number(shippingSettings.cod_fee) || 330;

      return {
        freeShippingThreshold: freeThreshold,
        defaultShippingFee: defaultFee,
        codFee,
        currency: 'JPY' as const,
      };
    },
  );
}

export async function fetchPublishedProducts(
  supabase: SupabaseClient,
  organizationId: string,
  options: { limit?: number; featured?: boolean } = {},
) {
  const limit = Math.min(options.limit ?? 20, 100);
  const cacheKey = orgCacheKey(
    organizationId,
    'products-preview',
    `${options.featured ? 'featured' : 'all'}:${limit}`,
  );

  return getOrSetCached(cacheKey, MEMORY_TTL.catalog, async () => {
    let query = supabase
      .from('products')
      .select(PRODUCT_LIST_SELECT)
      .eq('organization_id', organizationId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .order('sort_order', { ascending: true, referencedTable: 'product_images' })
      .limit(limit);

    if (options.featured) {
      query = query.eq('featured', true);
    }

    const { data: products, error } = await query;
    if (error) throw error;

    type ProductRow = Record<string, unknown> & {
      product_variants?: Record<string, unknown>[];
      product_images?: Record<string, unknown>[];
      product_categories?: Array<{
        category_id?: string;
        categories?: { id: string; name: string; slug: string } | null;
      }>;
    };

    return ((products || []) as unknown as ProductRow[]).map((product) => {
      const { product_variants = [], product_images = [], product_categories = [], ...base } =
        product;
      return formatPublicProduct(
        base,
        product_variants,
        product_images,
        extractCategoriesFromProductCategories(product_categories),
      );
    });
  });
}

export async function fetchSuppliers(
  supabase: SupabaseClient,
  organizationId: string,
  limit = 500,
) {
  return getOrSetCached(
    orgCacheKey(organizationId, 'suppliers', String(limit)),
    MEMORY_TTL.master,
    async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, company, phone, prefecture, role, roles, custom_fields, created_at')
        .eq('organization_id', organizationId)
        .contains('roles', ['supplier'])
        .eq('status', 'active')
        .order('name', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        company: c.company,
        phone: c.phone,
        prefecture: c.prefecture,
        role: c.role,
        roles: (c.roles as string[]) || [c.role],
        customFields: c.custom_fields ?? {},
        createdAt: c.created_at,
      }));
    },
  );
}

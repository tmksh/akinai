export type CustomFieldItem = {
  key: string;
  label: string;
  value: string;
  type: string;
  options?: string[];
  urls?: string[];
};

export interface UnifiedField {
  key: string;
  label: string;
  value: string;
  type: string;
  system: boolean;
  options?: string[];
  urls?: string[];
}

function parseImageUrls(value: string | null | undefined): string[] {
  if (!value) return [];
  const trimmed = String(value).trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === 'string' && v.length > 0);
      }
    } catch {
      /* fall through */
    }
  }
  return [trimmed];
}

function normalizeImageField(item: CustomFieldItem): CustomFieldItem {
  if (item.type !== 'image_url' && item.type !== 'image_url_list') return item;
  const urls = parseImageUrls(item.value);
  return { ...item, value: urls[0] ?? '', urls };
}

export function normalizeCustomFields(raw: unknown): CustomFieldItem[] {
  let items: CustomFieldItem[] = [];
  if (Array.isArray(raw)) {
    items = raw as CustomFieldItem[];
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    items = Object.entries(raw as Record<string, unknown>).map(([key, value]) => ({
      key,
      label: key,
      value: String(value ?? ''),
      type: 'text',
    }));
  }
  return items.map(normalizeImageField);
}

export function buildFields(
  product: Record<string, unknown>,
  variants: Record<string, unknown>[],
  customFields: CustomFieldItem[],
): UnifiedField[] {
  const fields: UnifiedField[] = [
    { key: 'name', label: '商品名', value: (product.name as string) || '', type: 'text', system: true },
    { key: 'slug', label: 'スラッグ', value: (product.slug as string) || '', type: 'text', system: true },
    {
      key: 'short_description',
      label: '短い説明',
      value: (product.short_description as string) || '',
      type: 'text',
      system: true,
    },
    {
      key: 'description',
      label: '詳細説明',
      value: (product.description as string) || '',
      type: 'textarea',
      system: true,
    },
    {
      key: 'status',
      label: 'ステータス',
      value: (product.status as string) || 'draft',
      type: 'select',
      system: true,
      options: ['draft', 'published', 'archived'],
    },
    {
      key: 'featured',
      label: 'おすすめ',
      value: String(product.featured ?? false),
      type: 'boolean',
      system: true,
    },
    {
      key: 'seo_title',
      label: 'SEOタイトル',
      value: (product.seo_title as string) || '',
      type: 'text',
      system: true,
    },
    {
      key: 'seo_description',
      label: 'メタディスクリプション',
      value: (product.seo_description as string) || '',
      type: 'textarea',
      system: true,
    },
    {
      key: 'tags',
      label: 'タグ',
      value: JSON.stringify(product.tags || []),
      type: 'list',
      system: true,
    },
  ];

  const prices = variants.map((v) => Number(v.price) || 0);
  if (prices.length > 0) {
    fields.push(
      { key: 'min_price', label: '最低価格', value: String(Math.min(...prices)), type: 'number', system: true },
      { key: 'max_price', label: '最高価格', value: String(Math.max(...prices)), type: 'number', system: true },
    );
  }

  const totalStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  fields.push({ key: 'total_stock', label: '在庫合計', value: String(totalStock), type: 'number', system: true });

  for (const cf of customFields) {
    fields.push({
      key: cf.key,
      label: cf.label,
      value: cf.value,
      type: cf.type,
      system: false,
      ...(cf.options && { options: cf.options }),
      ...(cf.urls && { urls: cf.urls }),
    });
  }

  return fields;
}

type VariantRow = Record<string, unknown>;
type ImageRow = Record<string, unknown>;
type CategoryRow = { id: string; name: string; slug: string };

export function formatVariant(v: VariantRow) {
  const opts = (v.options || {}) as Record<string, unknown>;
  return {
    id: v.id,
    name: v.name,
    sku: v.sku,
    price: v.price,
    compareAtPrice: v.compare_at_price,
    stock: v.stock,
    available: (Number(v.stock) || 0) > 0,
    imageUrl: (v.image_url as string) || (opts.imageUrl as string) || null,
    options: opts,
  };
}

export function formatImage(img: ImageRow, includeThumbnail = true) {
  return {
    id: img.id,
    url: img.url,
    ...(includeThumbnail && { thumbnailUrl: img.thumbnail_url ?? null }),
    alt: img.alt,
  };
}

export function formatPublicProduct(
  product: Record<string, unknown>,
  variants: VariantRow[],
  images: ImageRow[],
  categories: CategoryRow[],
  options?: { includeFields?: boolean; includeThumbnail?: boolean },
) {
  const customFields = normalizeCustomFields(product.custom_fields);
  const includeFields = options?.includeFields !== false;
  const includeThumbnail = options?.includeThumbnail !== false;

  const sortedImages = [...images].sort(
    (a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0),
  );

  return {
    id: product.id,
    customFields,
    ...(includeFields && { fields: buildFields(product, variants, customFields) }),
    variants: variants.map(formatVariant),
    images: sortedImages.map((img) => formatImage(img, includeThumbnail)),
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

/** product_id でグループ化（O(n) — 一覧 API の filter 連打を排除） */
export function groupByProductId<T extends { product_id?: string | null }>(
  rows: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const pid = row.product_id;
    if (!pid) continue;
    const bucket = map.get(pid);
    if (bucket) bucket.push(row);
    else map.set(pid, [row]);
  }
  return map;
}

/** PostgREST ネスト取得結果をフラットなカテゴリ配列に変換 */
export function extractCategoriesFromProductCategories(
  productCategories: Array<{
    category_id?: string;
    categories?: CategoryRow | CategoryRow[] | null;
  }>,
): CategoryRow[] {
  const seen = new Set<string>();
  const result: CategoryRow[] = [];

  for (const pc of productCategories) {
    const raw = pc.categories;
    const cats = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const c of cats) {
      if (c?.id && !seen.has(c.id)) {
        seen.add(c.id);
        result.push(c);
      }
    }
  }

  return result;
}

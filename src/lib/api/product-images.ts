import type { SupabaseClient } from '@supabase/supabase-js';
import { processAndUploadImageFromUrl } from '@/lib/server-image';

export type ProductImageInput = { url: string; alt?: string };

export function isDataUri(url: string): boolean {
  return url.trim().toLowerCase().startsWith('data:');
}

/** base64 データURI を拒否し、http/https URL のみ許可 */
export function validateProductImageUrls(images: ProductImageInput[]): string | null {
  for (const img of images) {
    if (!img.url) continue;
    if (isDataUri(img.url)) {
      return (
        'images[].url に base64 データURI は使用できません。' +
        '公開 HTTPS URL を指定するか、POST /api/v1/upload-image でファイルをアップロードしてください。'
      );
    }
    try {
      const parsed = new URL(img.url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'images[].url は http:// または https:// の公開 URL を指定してください。';
      }
    } catch {
      return `images[].url が不正な URL です: ${img.url.slice(0, 80)}`;
    }
  }
  return null;
}

/**
 * 商品画像 URL をサーバー側で取得・最適化し、product_images 挿入用の行を生成する。
 * POST / PUT 共通。
 */
export async function buildProductImageRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  productId: string,
  images: ProductImageInput[],
  defaultAlt = '',
): Promise<
  Array<{
    product_id: string;
    url: string;
    thumbnail_url: string | null;
    alt: string;
    sort_order: number;
  }>
> {
  return Promise.all(
    images.map(async (img, idx) => {
      const processed = img.url
        ? await processAndUploadImageFromUrl(supabase, img.url, {
            bucket: 'products',
            folder: productId,
          })
        : null;
      return {
        product_id: productId,
        url: processed?.url ?? img.url,
        thumbnail_url: processed?.thumbnailUrl ?? null,
        alt: img.alt || defaultAlt,
        sort_order: idx,
      };
    }),
  );
}

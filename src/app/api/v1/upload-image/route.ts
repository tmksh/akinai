import { NextRequest } from 'next/server';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  withApiLogging,
  getServiceSupabase,
} from '@/lib/api/auth';
import { processAndUploadImageBuffer } from '@/lib/server-image';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/v1/upload-image
 *
 * APIキー認証で商品画像をアップロードし、公開 URL を返す。
 * 返却された url を POST/PUT /api/v1/products の images[].url に指定してください。
 *
 * Content-Type: multipart/form-data
 * フィールド:
 *   file       (File, 必須) — 画像ファイル（JPG/PNG/WEBP/GIF, 最大 10MB）
 *   productId  (string, 任意) — Storage 保存先フォルダ。省略時は organizationId
 */
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status!, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiError('Content-Type: multipart/form-data が必要です', 400);
    }

    const file = formData.get('file') as File | null;
    if (!file || typeof file === 'string') {
      return apiError('file フィールドが必要です', 400);
    }

    if (file.size > MAX_SIZE) {
      return apiError('ファイルサイズは10MB以下にしてください', 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError('サポートされていないファイル形式です（JPG, PNG, WEBP, GIFのみ）', 400);
    }

    const folder =
      (formData.get('productId') as string | null) || auth.organizationId!;

    const supabase = getServiceSupabase();

    try {
      const inputBuffer = Buffer.from(await file.arrayBuffer());
      const processed = await processAndUploadImageBuffer(supabase, inputBuffer, {
        bucket: 'products',
        folder,
      });

      return apiSuccess(
        {
          url: processed.url,
          thumbnailUrl: processed.thumbnailUrl,
        },
        undefined,
        auth.rateLimit,
      );
    } catch (error) {
      console.error('v1 upload-image error:', error);
      return apiError('アップロードに失敗しました', 500);
    }
  });
}

export async function OPTIONS() {
  return handleOptions();
}

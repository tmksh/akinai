/**
 * クライアント側の画像軽量化ユーティリティ（ブラウザ専用）。
 *
 * アップロード前に画像をリサイズ＋再エンコード（WebP優先）して、
 * 保存容量・アップロード時間・配信転送量を削減する。
 *
 * 方針:
 *  - 長辺を maxDimension に収まるよう縮小（拡大はしない）
 *  - WebP で再エンコード（非対応環境では JPEG にフォールバック）
 *  - GIF（アニメーション保持）/ SVG は変換せず原本のまま返す
 *  - 変換結果が原本より大きく、かつ縮小もしていない場合は原本を返す
 *  - デコード不可・canvas 不可などの異常時も原本を返す（安全側）
 */

export interface CompressImageOptions {
  /** 縮小後の長辺の最大ピクセル数（デフォルト 1600） */
  maxDimension?: number;
  /** 再エンコード品質 0〜1（デフォルト 0.8） */
  quality?: number;
  /** 出力形式（デフォルト image/webp） */
  mimeType?: 'image/webp' | 'image/jpeg';
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const { maxDimension = 1600, quality = 0.8, mimeType = 'image/webp' } = options;

  // 画像以外、アニメーションGIF、SVG は変換しない
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  // ブラウザ以外（SSR）や API 非対応環境では原本を返す
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    // EXIF の回転情報を反映（スマホ写真の向きズレ防止）
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  try {
    const { width, height } = bitmap;
    if (!width || !height) return file;

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);

    // WebP を優先し、生成できなければ JPEG にフォールバック
    const blob =
      (await canvasToBlob(canvas, mimeType, quality)) ??
      (await canvasToBlob(canvas, 'image/jpeg', quality));
    if (!blob) return file;

    // 縮小していない上に容量も減らないなら原本を採用
    if (scale === 1 && blob.size >= file.size) return file;

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
    const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'image';
    return new File([blob], `${baseName}.${ext}`, {
      type: blob.type,
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close?.();
  }
}

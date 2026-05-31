/**
 * サーバー側の画像処理ユーティリティ（Node ランタイム専用）。
 *
 * - 本体画像: 長辺を最大 MAIN_MAX に縮小し WebP で再エンコード
 * - サムネイル: 長辺を最大 THUMB_MAX に縮小し WebP で再エンコード
 * - 両方を Supabase Storage にアップロードし、公開URLのみを返す（base64 は保存しない）
 *
 * 管理画面アップロード・API取り込みの両方から利用する。
 */
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';

const MAIN_MAX = 1200; // 本体画像の長辺(px)
const THUMB_MAX = 400; // サムネイルの長辺(px)
const MAIN_QUALITY = 80;
const THUMB_QUALITY = 70;

// 取り込み時にダウンロードを許可する最大バイト数（SSRF/巨大ファイル対策）
const MAX_FETCH_BYTES = 20 * 1024 * 1024; // 20MB

export type OutputFormat = 'webp' | 'avif';

export interface ProcessedImage {
  /** 本体画像の公開URL */
  url: string;
  /** サムネイルの公開URL */
  thumbnailUrl: string;
}

interface ProcessOptions {
  bucket: string;
  /** 保存先フォルダ（例: productId, organizationId） */
  folder: string;
  /** 出力形式（デフォルト webp。avif は高圧縮だがエンコードが重い） */
  format?: OutputFormat;
}

function randomName(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function encode(
  input: Buffer,
  maxDimension: number,
  quality: number,
  format: OutputFormat,
  animated: boolean
): Promise<Buffer> {
  const pipeline = sharp(input, { failOn: 'none', animated })
    .rotate() // EXIF の向きを反映
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside', // アスペクト比維持・長辺を maxDimension に収める
      withoutEnlargement: true, // 元より大きくしない
    });

  return format === 'avif'
    ? pipeline.avif({ quality }).toBuffer()
    : pipeline.webp({ quality }).toBuffer();
}

/**
 * 画像バッファを本体＋サムネイルに変換して Storage に保存し、公開URLを返す。
 */
export async function processAndUploadImageBuffer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  input: Buffer,
  options: ProcessOptions
): Promise<ProcessedImage> {
  const format = options.format ?? 'webp';
  const ext = format === 'avif' ? 'avif' : 'webp';
  const contentType = format === 'avif' ? 'image/avif' : 'image/webp';

  // アニメーションGIF等は全フレームを保持する
  const meta = await sharp(input, { failOn: 'none' }).metadata();
  const animated = (meta.pages ?? 1) > 1;

  const [mainBuf, thumbBuf] = await Promise.all([
    encode(input, MAIN_MAX, MAIN_QUALITY, format, animated),
    encode(input, THUMB_MAX, THUMB_QUALITY, format, animated),
  ]);

  const base = `${options.folder}/${randomName()}`;
  const mainPath = `${base}.${ext}`;
  const thumbPath = `${base}-thumb.${ext}`;

  const upload = (path: string, buf: Buffer) =>
    supabase.storage.from(options.bucket).upload(path, buf, {
      cacheControl: '31536000', // 1年（変換後は不変なので長期キャッシュ）
      upsert: false,
      contentType,
    });

  const [mainRes, thumbRes] = await Promise.all([
    upload(mainPath, mainBuf),
    upload(thumbPath, thumbBuf),
  ]);

  if (mainRes.error) throw mainRes.error;
  if (thumbRes.error) {
    // サムネイル失敗時は本体だけ残してロールバックせず、本体URLをサムネイルにも流用
    console.error('Thumbnail upload failed:', thumbRes.error);
  }

  const { data: mainPublic } = supabase.storage.from(options.bucket).getPublicUrl(mainRes.data.path);
  const thumbPublicUrl = thumbRes.error
    ? mainPublic.publicUrl
    : supabase.storage.from(options.bucket).getPublicUrl(thumbRes.data!.path).data.publicUrl;

  return { url: mainPublic.publicUrl, thumbnailUrl: thumbPublicUrl };
}

/**
 * リモートURLの画像を取得し、変換して Storage に保存する。
 * 取得・変換に失敗した場合は null を返す（呼び出し側で元URLにフォールバックする想定）。
 */
export async function processAndUploadImageFromUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  sourceUrl: string,
  options: ProcessOptions
): Promise<ProcessedImage | null> {
  try {
    // http/https のみ許可
    const parsed = new URL(sourceUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

    const res = await fetch(sourceUrl, { redirect: 'follow' });
    if (!res.ok) {
      console.error('Failed to fetch source image:', sourceUrl, res.status);
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      console.error('Source is not an image:', sourceUrl, contentType);
      return null;
    }

    const lengthHeader = Number(res.headers.get('content-length') || 0);
    if (lengthHeader && lengthHeader > MAX_FETCH_BYTES) {
      console.error('Source image too large:', sourceUrl, lengthHeader);
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > MAX_FETCH_BYTES) {
      console.error('Source image too large (body):', sourceUrl, arrayBuf.byteLength);
      return null;
    }

    return await processAndUploadImageBuffer(supabase, Buffer.from(arrayBuf), options);
  } catch (error) {
    console.error('processAndUploadImageFromUrl error:', sourceUrl, error);
    return null;
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processAndUploadImageBuffer } from '@/lib/server-image';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/upload-image
 * FormData: file (File), bucket? (string), folder? (string)
 * → { url: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'ファイルサイズは10MB以下にしてください' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'サポートされていないファイル形式です（JPG, PNG, WEBP, GIFのみ）' },
      { status: 400 }
    );
  }

  const bucket = (formData.get('bucket') as string | null) || 'contents';
  const folder = (formData.get('folder') as string | null) || user.id;

  // サーバー側でリサイズ(長辺1200px)+WebP変換し、サムネイル(400px)も生成して保存
  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const processed = await processAndUploadImageBuffer(supabase, inputBuffer, {
      bucket,
      folder,
    });
    return NextResponse.json({ url: processed.url, thumbnailUrl: processed.thumbnailUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 });
  }
}

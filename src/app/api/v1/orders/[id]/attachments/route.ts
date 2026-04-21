import { NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  corsHeaders,
} from '@/lib/api/auth';

const BUCKET = 'order-attachments';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** POST /api/v1/orders/:id/attachments — ファイルアップロード
 *
 * Content-Type: multipart/form-data
 * フィールド:
 *   file   (File, 必須) — アップロードするファイル（最大 20MB）
 *   name   (string, 任意) — 表示名。省略時はファイル名を使用
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const auth = await validateApiKey(request);
  if (!auth.success) return apiError(auth.error!, auth.status!);

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

  if (file.size > MAX_FILE_SIZE) {
    return apiError('ファイルサイズは20MB以下にしてください', 400);
  }

  const supabase = createClient();

  // 注文の存在と組織の一致を確認
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('organization_id', auth.organizationId!)
    .single();

  if (!order) return apiError('Order not found', 404);

  const fileExt = file.name.split('.').pop() || 'bin';
  const storagePath = `${auth.organizationId}/${orderId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('Attachment upload error:', uploadError);
    return apiError('ファイルのアップロードに失敗しました', 500);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);

  const { data: record, error: dbError } = await supabase
    .from('order_attachments')
    .insert({
      organization_id: auth.organizationId,
      order_id: orderId,
      name: (formData.get('name') as string | null) || file.name,
      file_name: file.name,
      file_size: file.size,
      content_type: file.type || 'application/octet-stream',
      storage_path: uploadData.path,
      url: urlData.publicUrl,
    })
    .select()
    .single();

  if (dbError) {
    console.error('Attachment DB error:', dbError);
    await supabase.storage.from(BUCKET).remove([uploadData.path]);
    return apiError('データベースへの保存に失敗しました', 500);
  }

  const response = apiSuccess({ attachment: record });
  Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

/** GET /api/v1/orders/:id/attachments — 添付ファイル一覧 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const auth = await validateApiKey(request);
  if (!auth.success) return apiError(auth.error!, auth.status!);

  const supabase = createClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('organization_id', auth.organizationId!)
    .single();

  if (!order) return apiError('Order not found', 404);

  const { data: attachments, error } = await supabase
    .from('order_attachments')
    .select('*')
    .eq('order_id', orderId)
    .eq('organization_id', auth.organizationId!)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch attachments error:', error);
    return apiError('Failed to fetch attachments', 500);
  }

  const response = apiSuccess({ attachments: attachments || [] });
  Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export async function OPTIONS() {
  return handleOptions();
}

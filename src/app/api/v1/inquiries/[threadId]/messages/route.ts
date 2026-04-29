/**
 * /api/v1/inquiries/[threadId]/messages
 *
 * スレッドへの返信メッセージ投稿。
 * 認証: Authorization: Bearer <customer_jwt>
 *
 * - POST : { body, attachments? } を受け取り、相手の未読数を +1 して通知
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCustomerToken } from '@/lib/api/customer-auth';
import { corsHeaders, handleOptions } from '@/lib/api/auth';
import {
  buildPreview,
  notifyInquiryRecipient,
  sanitizeAttachments,
  type InquiryAttachment,
} from '@/lib/inquiries';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function jsonError(message: string, status: number) {
  const res = NextResponse.json({ error: message }, { status });
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

function jsonSuccess<T>(data: T, status = 200) {
  const res = NextResponse.json(data, { status });
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

const MAX_BODY_LENGTH = 8000;

interface PostBody {
  body?: string;
  attachments?: InquiryAttachment[];
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await context.params;
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  let body: PostBody;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  if (!body.body?.trim()) return jsonError('body is required', 400);
  if (body.body.length > MAX_BODY_LENGTH) return jsonError('body is too long', 400);

  const supabase = getAdminSupabase();

  interface ThreadLite {
    id: string;
    organization_id: string;
    status: 'open' | 'closed';
    initiator_customer_id: string;
    recipient_customer_id: string;
    initiator_unread_count: number;
    recipient_unread_count: number;
    subject: string;
    product_id: string | null;
  }

  // スレッドを取得し、参加者かつ open 状態であることを確認
  const { data: threadRaw, error: threadError } = await supabase
    .from('inquiry_threads')
    .select(
      'id, organization_id, status, initiator_customer_id, recipient_customer_id, initiator_unread_count, recipient_unread_count, subject, product_id'
    )
    .eq('id', threadId)
    .eq('organization_id', verify.payload.org)
    .single();

  if (threadError || !threadRaw) return jsonError('Thread not found', 404);
  const thread = threadRaw as unknown as ThreadLite;
  if (
    thread.initiator_customer_id !== verify.payload.sub &&
    thread.recipient_customer_id !== verify.payload.sub
  ) {
    return jsonError('Forbidden', 403);
  }
  if (thread.status === 'closed') {
    return jsonError('Thread is closed', 409);
  }

  // 送信者と受信者を判定
  const senderIsInitiator = thread.initiator_customer_id === verify.payload.sub;
  const recipientId = senderIsInitiator
    ? thread.recipient_customer_id
    : thread.initiator_customer_id;

  // 送信者情報（通知メールに使う）
  const { data: sender } = await supabase
    .from('customers')
    .select('id, name, status')
    .eq('id', verify.payload.sub)
    .eq('organization_id', verify.payload.org)
    .single();

  if (!sender) return jsonError('Sender not found', 404);
  if (sender.status === 'suspended') return jsonError('Your account is suspended', 403);

  const attachments = sanitizeAttachments(body.attachments);
  const preview = buildPreview(body.body);
  const now = new Date().toISOString();

  // メッセージ insert
  const { data: message, error: messageError } = await supabase
    .from('inquiry_messages')
    .insert({
      thread_id: thread.id,
      organization_id: verify.payload.org,
      from_customer_id: sender.id,
      body: body.body,
      attachments,
      is_read: false,
    })
    .select()
    .single();

  if (messageError || !message) {
    console.error('Failed to create inquiry message:', messageError);
    return jsonError('Failed to create message', 500);
  }

  // スレッドの最新情報と未読数を更新
  const newRecipientUnread = senderIsInitiator
    ? thread.recipient_unread_count + 1
    : thread.recipient_unread_count;
  const newInitiatorUnread = !senderIsInitiator
    ? thread.initiator_unread_count + 1
    : thread.initiator_unread_count;

  await supabase
    .from('inquiry_threads')
    .update({
      last_message_at: now,
      last_message_preview: preview,
      last_message_from_id: sender.id,
      initiator_unread_count: newInitiatorUnread,
      recipient_unread_count: newRecipientUnread,
    })
    .eq('id', thread.id);

  // 関連商品名（通知メールタイトル用）
  let productName: string | null = null;
  if (thread.product_id) {
    const { data: product } = await supabase
      .from('products')
      .select('name')
      .eq('id', thread.product_id)
      .single();
    productName = product?.name ?? null;
  }

  // 受信者に通知
  await notifyInquiryRecipient({
    supabase,
    organizationId: verify.payload.org,
    threadId: thread.id,
    recipientCustomerId: recipientId,
    fromCustomerName: sender.name,
    subject: thread.subject || '',
    preview,
    productName,
  });

  return jsonSuccess({ message }, 201);
}

export async function OPTIONS() {
  return handleOptions();
}

/**
 * /api/v1/inquiries
 *
 * 1対1メッセージ（問い合わせ）スレッドの作成と一覧取得。
 * 認証: Authorization: Bearer <customer_jwt>
 *
 * - POST : 新規スレッドを作成し、初回メッセージを投稿する
 * - GET  : ログイン中の顧客が参加しているスレッド一覧を取得する
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
const MAX_SUBJECT_LENGTH = 200;

// =====================================================
// POST — スレッド作成 + 初回メッセージ投稿
// =====================================================
interface CreateBody {
  toCustomerId?: string;
  relatedProductId?: string;
  subject?: string;
  body?: string;
  attachments?: InquiryAttachment[];
}

export async function POST(request: NextRequest) {
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  let body: CreateBody;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  if (!body.toCustomerId) return jsonError('toCustomerId is required', 400);
  if (!body.body?.trim()) return jsonError('body is required', 400);
  if (body.body.length > MAX_BODY_LENGTH) return jsonError('body is too long', 400);
  if (body.subject && body.subject.length > MAX_SUBJECT_LENGTH) {
    return jsonError('subject is too long', 400);
  }
  if (verify.payload.sub === body.toCustomerId) {
    return jsonError('Cannot send message to yourself', 400);
  }

  const supabase = getAdminSupabase();

  // 送信者・受信者を確認（同一テナント内）
  const { data: participants } = await supabase
    .from('customers')
    .select('id, name, email, role, organization_id, status')
    .in('id', [verify.payload.sub, body.toCustomerId])
    .eq('organization_id', verify.payload.org);

  const sender = participants?.find((p) => p.id === verify.payload.sub);
  const recipient = participants?.find((p) => p.id === body.toCustomerId);

  if (!sender) return jsonError('Sender not found', 404);
  if (!recipient) return jsonError('Recipient not found', 404);
  if (sender.status === 'suspended') return jsonError('Your account is suspended', 403);

  // 関連商品の確認（指定がある場合のみ）
  let productName: string | null = null;
  if (body.relatedProductId) {
    const { data: product } = await supabase
      .from('products')
      .select('id, name, organization_id')
      .eq('id', body.relatedProductId)
      .eq('organization_id', verify.payload.org)
      .single();
    if (!product) return jsonError('Related product not found', 404);
    productName = product.name;
  }

  // スレッド作成
  const subject = body.subject?.trim() || (productName ? `「${productName}」について` : '新規お問い合わせ');
  const attachments = sanitizeAttachments(body.attachments);
  const preview = buildPreview(body.body);
  const now = new Date().toISOString();

  const { data: thread, error: threadError } = await supabase
    .from('inquiry_threads')
    .insert({
      organization_id: verify.payload.org,
      product_id: body.relatedProductId ?? null,
      initiator_customer_id: sender.id,
      recipient_customer_id: recipient.id,
      subject,
      status: 'open',
      last_message_at: now,
      last_message_preview: preview,
      last_message_from_id: sender.id,
      initiator_unread_count: 0,
      recipient_unread_count: 1,
    })
    .select()
    .single();

  if (threadError || !thread) {
    console.error('Failed to create inquiry thread:', threadError);
    return jsonError('Failed to create thread', 500);
  }

  // 初回メッセージ
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
    // ロールバック相当（スレッドだけ残るのを防ぐ）
    await supabase.from('inquiry_threads').delete().eq('id', thread.id);
    return jsonError('Failed to create message', 500);
  }

  // 受信者に通知（BOX + メール）—— 失敗してもメッセージ送信は完了扱い
  await notifyInquiryRecipient({
    supabase,
    organizationId: verify.payload.org,
    threadId: thread.id,
    recipientCustomerId: recipient.id,
    fromCustomerName: sender.name,
    subject,
    preview,
    productName,
  });

  return jsonSuccess({ thread, message }, 201);
}

// =====================================================
// GET — 自分が参加しているスレッド一覧
// クエリ: ?status=open|closed  ?role=initiator|recipient  ?page=1  ?limit=20
// =====================================================
export async function GET(request: NextRequest) {
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const role = searchParams.get('role'); // 'initiator' | 'recipient' | null
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
  const offset = (page - 1) * limit;

  const supabase = getAdminSupabase();
  const customerId = verify.payload.sub;

  let query = supabase
    .from('inquiry_threads')
    .select(
      `id, organization_id, product_id, initiator_customer_id, recipient_customer_id,
       subject, status, last_message_at, last_message_preview, last_message_from_id,
       initiator_unread_count, recipient_unread_count, created_at, updated_at,
       initiator:customers!inquiry_threads_initiator_customer_id_fkey(id, name, role),
       recipient:customers!inquiry_threads_recipient_customer_id_fkey(id, name, role),
       product:products!inquiry_threads_product_id_fkey(id, name, slug)`,
      { count: 'exact' }
    )
    .eq('organization_id', verify.payload.org)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  // 自分が参加者であるスレッドだけを返す
  if (role === 'initiator') {
    query = query.eq('initiator_customer_id', customerId);
  } else if (role === 'recipient') {
    query = query.eq('recipient_customer_id', customerId);
  } else {
    query = query.or(
      `initiator_customer_id.eq.${customerId},recipient_customer_id.eq.${customerId}`
    );
  }

  if (status === 'open' || status === 'closed') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('Failed to fetch inquiry threads:', error);
    return jsonError('Failed to fetch threads', 500);
  }

  // 自分側の未読数を埋める
  const threads = (data || []).map((row) => {
    const r = row as unknown as {
      id: string;
      initiator_customer_id: string;
      recipient_customer_id: string;
      initiator_unread_count: number;
      recipient_unread_count: number;
      [key: string]: unknown;
    };
    const myRole = r.initiator_customer_id === customerId ? 'initiator' : 'recipient';
    const myUnreadCount =
      myRole === 'initiator' ? r.initiator_unread_count : r.recipient_unread_count;
    return {
      ...r,
      myRole,
      myUnreadCount,
    };
  });

  return jsonSuccess({
    data: threads,
    meta: {
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: page * limit < (count || 0),
      },
      unreadTotal: threads.reduce((sum, t) => sum + (t.myUnreadCount as number), 0),
      timestamp: new Date().toISOString(),
    },
  });
}

export async function OPTIONS() {
  return handleOptions();
}

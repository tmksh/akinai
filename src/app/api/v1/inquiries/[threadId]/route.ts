/**
 * /api/v1/inquiries/[threadId]
 *
 * スレッド本体に対する操作。
 * 認証: Authorization: Bearer <customer_jwt>
 *
 * - GET   : スレッド情報 + メッセージ一覧を取得
 * - PATCH : スレッド状態を変更（{ status: 'open' | 'closed' }）
 *           あるいは自分が受信したメッセージを既読化（{ markRead: true }）
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCustomerToken } from '@/lib/api/customer-auth';
import { corsHeaders, handleOptions } from '@/lib/api/auth';

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

function jsonSuccess<T>(data: T) {
  const res = NextResponse.json(data);
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

interface ThreadRow {
  id: string;
  organization_id: string;
  product_id: string | null;
  initiator_customer_id: string;
  recipient_customer_id: string;
  subject: string;
  status: 'open' | 'closed';
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_from_id: string | null;
  initiator_unread_count: number;
  recipient_unread_count: number;
  created_at: string;
  updated_at: string;
}

/** スレッドを取得し、認証ユーザーが参加者であることを確認する */
async function loadThread(
  organizationId: string,
  threadId: string,
  customerId: string
): Promise<{ thread: ThreadRow; myRole: 'initiator' | 'recipient' } | { error: string; status: number }> {
  const supabase = getAdminSupabase();
  const { data, error } = await supabase
    .from('inquiry_threads')
    .select('*')
    .eq('id', threadId)
    .eq('organization_id', organizationId)
    .single();

  if (error || !data) {
    return { error: 'Thread not found', status: 404 };
  }
  const thread = data as ThreadRow;
  if (thread.initiator_customer_id !== customerId && thread.recipient_customer_id !== customerId) {
    return { error: 'Forbidden', status: 403 };
  }
  const myRole = thread.initiator_customer_id === customerId ? 'initiator' : 'recipient';
  return { thread, myRole };
}

// =====================================================
// GET — スレッド情報 + メッセージ一覧
// =====================================================
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await context.params;
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  const result = await loadThread(verify.payload.org, threadId, verify.payload.sub);
  if ('error' in result) return jsonError(result.error, result.status);

  const supabase = getAdminSupabase();

  // 関連エンティティ
  const [messagesResult, initiatorResult, recipientResult, productResult] = await Promise.all([
    supabase
      .from('inquiry_messages')
      .select('id, thread_id, from_customer_id, body, attachments, is_read, read_at, created_at')
      .eq('thread_id', threadId)
      .eq('organization_id', verify.payload.org)
      .order('created_at', { ascending: true }),
    supabase
      .from('customers')
      .select('id, name, role')
      .eq('id', result.thread.initiator_customer_id)
      .single(),
    supabase
      .from('customers')
      .select('id, name, role')
      .eq('id', result.thread.recipient_customer_id)
      .single(),
    result.thread.product_id
      ? supabase
          .from('products')
          .select('id, name, slug')
          .eq('id', result.thread.product_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  if (messagesResult.error) {
    console.error('Failed to fetch inquiry messages:', messagesResult.error);
    return jsonError('Failed to fetch messages', 500);
  }

  return jsonSuccess({
    thread: {
      ...result.thread,
      myRole: result.myRole,
      myUnreadCount:
        result.myRole === 'initiator'
          ? result.thread.initiator_unread_count
          : result.thread.recipient_unread_count,
      initiator: initiatorResult.data,
      recipient: recipientResult.data,
      product: productResult.data,
    },
    messages: messagesResult.data || [],
  });
}

// =====================================================
// PATCH — ステータス変更 / 既読化
// =====================================================
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await context.params;
  const verify = await verifyCustomerToken(request);
  if (!verify.success) return jsonError(verify.error, verify.status);

  let body: { status?: 'open' | 'closed'; markRead?: boolean };
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const result = await loadThread(verify.payload.org, threadId, verify.payload.sub);
  if ('error' in result) return jsonError(result.error, result.status);

  const supabase = getAdminSupabase();
  const updates: Record<string, unknown> = {};

  if (body.status === 'open' || body.status === 'closed') {
    updates.status = body.status;
  }

  if (body.markRead === true) {
    // 自分宛て（自分が受信したメッセージ）を既読化
    const now = new Date().toISOString();
    await supabase
      .from('inquiry_messages')
      .update({ is_read: true, read_at: now })
      .eq('thread_id', threadId)
      .eq('organization_id', verify.payload.org)
      .neq('from_customer_id', verify.payload.sub)
      .eq('is_read', false);

    // 自分側の未読数を 0 にリセット
    if (result.myRole === 'initiator') {
      updates.initiator_unread_count = 0;
    } else {
      updates.recipient_unread_count = 0;
    }
  }

  if (Object.keys(updates).length === 0) {
    return jsonError('No valid fields to update', 400);
  }

  const { data: updated, error: updateError } = await supabase
    .from('inquiry_threads')
    .update(updates)
    .eq('id', threadId)
    .eq('organization_id', verify.payload.org)
    .select()
    .single();

  if (updateError || !updated) {
    console.error('Failed to update thread:', updateError);
    return jsonError('Failed to update thread', 500);
  }

  return jsonSuccess({ thread: updated });
}

export async function OPTIONS() {
  return handleOptions();
}

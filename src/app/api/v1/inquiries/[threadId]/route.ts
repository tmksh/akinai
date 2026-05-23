/**
 * /api/v1/inquiries/[threadId]
 *
 * スレッド本体に対する操作。
 * 認証: Authorization: Bearer <customer_jwt>
 *
 * - GET   : スレッド情報 + メッセージ一覧を取得（デフォルトで既読化）
 *           ?markRead=false で既読化をスキップ可能
 * - PATCH : スレッド状態を変更（{ status: 'open' | 'closed' }）
 *           あるいは自分が受信したメッセージを既読化（{ markRead: true }）
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCustomerToken } from '@/lib/api/customer-auth';
import { corsHeaders, handleOptions } from '@/lib/api/auth';
import {
  getMyUnreadCount,
  loadInquiryThreadForCustomer,
  markInquiryThreadAsRead,
  type InquiryThreadRow,
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

function jsonSuccess<T>(data: T) {
  const res = NextResponse.json(data);
  Object.entries(corsHeaders()).forEach(([k, v]) => res.headers.set(k, v));
  return res;
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

  const supabase = getAdminSupabase();
  const loaded = await loadInquiryThreadForCustomer(
    supabase,
    verify.payload.org,
    threadId,
    verify.payload.sub,
  );
  if ('error' in loaded) return jsonError(loaded.error, loaded.status);

  let thread: InquiryThreadRow = loaded.thread;
  const { myRole } = loaded;

  const shouldMarkRead = request.nextUrl.searchParams.get('markRead') !== 'false';
  if (shouldMarkRead && getMyUnreadCount(thread, myRole) > 0) {
    const readResult = await markInquiryThreadAsRead({
      supabase,
      organizationId: verify.payload.org,
      threadId,
      customerId: verify.payload.sub,
      myRole,
    });
    if (readResult.thread) {
      thread = readResult.thread;
    }
  }

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
      .eq('id', thread.initiator_customer_id)
      .single(),
    supabase
      .from('customers')
      .select('id, name, role')
      .eq('id', thread.recipient_customer_id)
      .single(),
    thread.product_id
      ? supabase
          .from('products')
          .select('id, name, slug')
          .eq('id', thread.product_id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  if (messagesResult.error) {
    console.error('Failed to fetch inquiry messages:', messagesResult.error);
    return jsonError('Failed to fetch messages', 500);
  }

  return jsonSuccess({
    thread: {
      ...thread,
      myRole,
      myUnreadCount: getMyUnreadCount(thread, myRole),
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

  const supabase = getAdminSupabase();
  const loaded = await loadInquiryThreadForCustomer(
    supabase,
    verify.payload.org,
    threadId,
    verify.payload.sub,
  );
  if ('error' in loaded) return jsonError(loaded.error, loaded.status);

  const updates: Record<string, unknown> = {};

  if (body.status === 'open' || body.status === 'closed') {
    updates.status = body.status;
  }

  if (body.markRead === true) {
    const readResult = await markInquiryThreadAsRead({
      supabase,
      organizationId: verify.payload.org,
      threadId,
      customerId: verify.payload.sub,
      myRole: loaded.myRole,
    });
    if (readResult.error || !readResult.thread) {
      return jsonError(readResult.error || 'Failed to mark as read', 500);
    }
  }

  if (Object.keys(updates).length === 0 && body.markRead !== true) {
    return jsonError('No valid fields to update', 400);
  }

  if (Object.keys(updates).length === 0) {
    const thread = (await loadInquiryThreadForCustomer(
      supabase,
      verify.payload.org,
      threadId,
      verify.payload.sub,
    )) as { thread: InquiryThreadRow; myRole: typeof loaded.myRole };
    if ('error' in thread) return jsonError(thread.error, thread.status);

    return jsonSuccess({
      thread: {
        ...thread.thread,
        myRole: thread.myRole,
        myUnreadCount: getMyUnreadCount(thread.thread, thread.myRole),
      },
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from('inquiry_threads')
    .update(updates)
    .eq('id', threadId)
    .eq('organization_id', verify.payload.org)
    .select('*')
    .single();

  if (updateError || !updated) {
    console.error('Failed to update thread:', updateError);
    return jsonError('Failed to update thread', 500);
  }

  const updatedThread = updated as InquiryThreadRow;
  return jsonSuccess({
    thread: {
      ...updatedThread,
      myRole: loaded.myRole,
      myUnreadCount: getMyUnreadCount(updatedThread, loaded.myRole),
    },
  });
}

export async function OPTIONS() {
  return handleOptions();
}

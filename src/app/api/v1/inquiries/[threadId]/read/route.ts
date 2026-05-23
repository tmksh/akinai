/**
 * POST /api/v1/inquiries/[threadId]/read
 *
 * スレッド内の自分宛てメッセージを既読化し、myUnreadCount を 0 にする。
 * 認証: Authorization: Bearer <customer_jwt>
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyCustomerToken } from '@/lib/api/customer-auth';
import { corsHeaders, handleOptions } from '@/lib/api/auth';
import {
  getMyUnreadCount,
  loadInquiryThreadForCustomer,
  markInquiryThreadAsRead,
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

export async function POST(
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

  const { thread: updated, error } = await markInquiryThreadAsRead({
    supabase,
    organizationId: verify.payload.org,
    threadId,
    customerId: verify.payload.sub,
    myRole: loaded.myRole,
  });

  if (error || !updated) {
    return jsonError(error || 'Failed to mark as read', 500);
  }

  return jsonSuccess({
    thread: updated,
    myRole: loaded.myRole,
    myUnreadCount: getMyUnreadCount(updated, loaded.myRole),
  });
}

export async function OPTIONS() {
  return handleOptions();
}

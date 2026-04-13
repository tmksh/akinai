import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  apiSuccessPaginated,
  handleOptions,
  withApiLogging,
} from '@/lib/api/auth';
import { sendEmail } from '@/lib/email';

export function OPTIONS() {
  return handleOptions();
}

/** POST /api/v1/messages  — サプライヤー→バイヤーへメッセージ送信 */
export async function POST(request: NextRequest) {
  return withApiLogging(request, 'POST /api/v1/messages', async () => {
    const auth = await validateApiKey(request);
    if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

    const body = await request.json().catch(() => null);
    if (!body) return apiError('Invalid JSON body', 400);

    const { fromCustomerId, target = 'all', toCustomerId, subject, html, text } = body as {
      fromCustomerId?: string;
      target?: 'all' | 'buyer' | 'customer';
      toCustomerId?: string;
      subject?: string;
      html?: string;
      text?: string;
    };

    if (!subject || (!html && !text)) {
      return apiError('subject and html (or text) are required', 400);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 送信者確認
    if (fromCustomerId) {
      const { data: sender } = await supabase
        .from('customers')
        .select('id, role')
        .eq('id', fromCustomerId)
        .eq('organization_id', auth.organizationId!)
        .single();
      if (!sender) return apiError('Sender not found', 404);
    }

    // 受信者リスト
    let recipients: { id: string; email: string; name: string }[] = [];

    if (target === 'all' || target === 'buyer') {
      const { data } = await supabase
        .from('customers')
        .select('id, email, name')
        .eq('organization_id', auth.organizationId!)
        .eq('role', 'buyer')
        .eq('status', 'active')
        .not('email', 'is', null);
      recipients = (data || []) as typeof recipients;
    } else if (target === 'customer' && toCustomerId) {
      const { data } = await supabase
        .from('customers')
        .select('id, email, name')
        .eq('id', toCustomerId)
        .eq('organization_id', auth.organizationId!)
        .single();
      if (!data) return apiError('Recipient not found', 404);
      recipients = [data as typeof recipients[0]];
    }

    const emailHtml = html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`;

    // DB に保存（全員 or 個別）
    const inserts = recipients.map((r) => ({
      organization_id: auth.organizationId!,
      from_customer_id: fromCustomerId || null,
      to_customer_id: r.id,
      target,
      subject,
      body: html || text || '',
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from('messages')
      .insert(inserts)
      .select('id');

    if (insertErr) return apiError('Failed to save messages', 500);

    // メール送信
    let sentCount = 0;
    for (const r of recipients) {
      const { success } = await sendEmail({
        to: r.email,
        subject,
        html: emailHtml,
        organizationId: auth.organizationId!,
      });
      if (success) sentCount++;
    }

    return apiSuccess({
      messageCount: inserted?.length || 0,
      sentCount,
      recipientCount: recipients.length,
    }, 'Messages sent successfully', 201);
  });
}

/** GET /api/v1/messages?customerId={ID}  — 受信メッセージ一覧 */
export async function GET(request: NextRequest) {
  return withApiLogging(request, 'GET /api/v1/messages', async () => {
    const auth = await validateApiKey(request);
    if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const offset = (page - 1) * limit;

    if (!customerId) return apiError('customerId is required', 400);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error, count } = await supabase
      .from('messages')
      .select(`
        id,
        subject,
        body,
        is_read,
        created_at,
        from_customer:customers!messages_from_customer_id_fkey(id, name)
      `, { count: 'exact' })
      .eq('organization_id', auth.organizationId!)
      .eq('to_customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return apiError('Failed to fetch messages', 500);

    return apiSuccessPaginated(data || [], count || 0, page, limit);
  });
}

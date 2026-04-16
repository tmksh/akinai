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
  const auth = await validateApiKey(request);
  return withApiLogging(request, auth, async () => {
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

    // ⑤ メッセージ月間送信上限チェック
    const { data: orgData } = await supabase
      .from('organizations')
      .select('features')
      .eq('id', auth.organizationId!)
      .single();
    const msgFeatures = (orgData?.features as Record<string, unknown>) || {};
    const msgLimit = msgFeatures.message_monthly_limit;
    if (typeof msgLimit === 'number' && msgLimit > 0) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      // 月内にユニーク宛先へ送信した件数（to_customer_id がユニークな社数）
      const { count: sentThisMonth } = await supabase
        .from('messages')
        .select('to_customer_id', { count: 'exact', head: true })
        .eq('organization_id', auth.organizationId!)
        .gte('created_at', monthStart)
        .not('to_customer_id', 'is', null);

      if ((sentThisMonth || 0) >= msgLimit) {
        return apiError(
          `Message monthly limit reached: ${msgLimit} recipients per month allowed`,
          429
        );
      }
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
    });
  });
}

/** GET /api/v1/messages?customerId={ID}  — 受信メッセージ一覧 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  return withApiLogging(request, auth, async () => {
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

    return apiSuccessPaginated(data || [], page, limit, count || 0);
  });
}

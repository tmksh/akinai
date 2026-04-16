import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  corsHeaders,
  withApiLogging,
} from '@/lib/api/auth';
import { sendEmail } from '@/lib/email';

export function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  return withApiLogging(request, auth, async () => {
    if (!auth.success) {
      return apiError(auth.error || 'Unauthorized', auth.status || 401);
    }

    const body = await request.json().catch(() => null);
    if (!body) return apiError('Invalid JSON body', 400);

    const { supplierId, subject, html, text } = body as {
      supplierId?: string;
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

    // サプライヤーの存在確認
    let supplierName = '出品者';
    if (supplierId) {
      const { data: supplier } = await supabase
        .from('customers')
        .select('id, name, role')
        .eq('id', supplierId)
        .eq('organization_id', auth.organizationId!)
        .single();

      if (!supplier) return apiError('Supplier not found', 404);
      if (supplier.role !== 'supplier') return apiError('Customer is not a supplier', 400);
      supplierName = supplier.name;
    }

    // お気に入り登録者（メールアドレスを持つ顧客）を取得
    let favoritesQuery = supabase
      .from('product_favorites')
      .select(`
        customer_id,
        customers!inner(id, email, name, status)
      `)
      .eq('organization_id', auth.organizationId!);

    if (supplierId) {
      // サプライヤーの商品のみ対象
      const { data: productIds } = await supabase
        .from('products')
        .select('id')
        .eq('organization_id', auth.organizationId!)
        .eq('supplier_id', supplierId);

      if (productIds && productIds.length > 0) {
        favoritesQuery = favoritesQuery.in('product_id', productIds.map(p => p.id));
      }
    }

    const { data: favorites } = await favoritesQuery;

    // 重複排除・有効会員のみ
    const recipientMap = new Map<string, { email: string; name: string }>();
    for (const fav of favorites || []) {
      const c = ((fav as unknown) as { customers: { id: string; email: string; name: string; status: string } }).customers;
      if (c?.email && c.status === 'active') {
        recipientMap.set(c.id, { email: c.email, name: c.name });
      }
    }
    const recipients = Array.from(recipientMap.values());

    // 組織のメールアドレス取得
    const { data: org } = await supabase
      .from('organizations')
      .select('name, mail_from_address, mail_domain_verified, features')
      .eq('id', auth.organizationId!)
      .single();

    // ④ メルマガ配信頻度制限チェック
    const orgFeatures = (org?.features as Record<string, unknown>) || {};
    const freqLimit = orgFeatures.newsletter_frequency_limit;
    if (typeof freqLimit === 'number' && freqLimit > 0) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count: sentThisMonth } = await supabase
        .from('newsletter_sends')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', auth.organizationId!)
        .eq('status', 'sent')
        .gte('sent_at', monthStart);

      if ((sentThisMonth || 0) >= freqLimit) {
        return apiError(
          `Newsletter frequency limit reached: ${freqLimit} sends per month allowed`,
          429
        );
      }
    }

    // 送信履歴レコード作成
    const { data: sendRecord, error: insertErr } = await supabase
      .from('newsletter_sends')
      .insert({
        organization_id: auth.organizationId!,
        supplier_id: supplierId || null,
        subject,
        body: html || text || '',
        sent_count: 0,
        status: 'pending',
      })
      .select()
      .single();

    if (insertErr) return apiError('Failed to create send record', 500);

    // メール送信（バッチ）
    let sentCount = 0;
    const errors: string[] = [];

    const emailHtml = html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`;

    for (const recipient of recipients) {
      const { success, error: emailErr } = await sendEmail({
        to: recipient.email,
        subject,
        html: emailHtml,
        organizationId: auth.organizationId!,
      });
      if (success) {
        sentCount++;
      } else {
        errors.push(`${recipient.email}: ${emailErr}`);
      }
    }

    // 送信履歴を更新
    await supabase
      .from('newsletter_sends')
      .update({
        sent_count: sentCount,
        status: errors.length === 0 ? 'sent' : sentCount > 0 ? 'partial' : 'failed',
        sent_at: new Date().toISOString(),
      })
      .eq('id', sendRecord.id);

    return apiSuccess({
      id: sendRecord.id,
      sentCount,
      totalRecipients: recipients.length,
      status: errors.length === 0 ? 'sent' : sentCount > 0 ? 'partial' : 'failed',
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    });
  });
}

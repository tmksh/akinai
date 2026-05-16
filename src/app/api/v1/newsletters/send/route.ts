import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  corsHeaders,
  withApiLogging,
} from '@/lib/api/auth';
import { sendEmail } from '@/lib/email';

/** 受信者ごとのワンクリック解除トークンを生成する */
function generateUnsubscribeToken(organizationId: string, customerId: string): string {
  const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const payload = Buffer.from(`${organizationId}:${customerId}`).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** アプリのベースURLを取得 */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://akinai-dx.com';
}

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

    const { supplierId, subject, html, text, targetAudience, image, productName, excludeCustomerIds, customerIds, unsubscribeBaseUrl } = body as {
      supplierId?: string;
      subject?: string;
      html?: string;
      text?: string;
      targetAudience?: 'buyer' | 'personal' | 'both';
      image?: string;
      productName?: string;
      /** 明示的に除外する顧客IDリスト */
      excludeCustomerIds?: string[];
      /** 送信対象を特定顧客IDに限定する（指定時はお気に入りフィルタをスキップ） */
      customerIds?: string[];
      /**
       * 配信停止リンクのベースURL。
       * 指定した場合、{{unsubscribe_url}} は `${unsubscribeBaseUrl}?token=xxx` に展開される。
       * 指定しない場合は Akinai デフォルトの /api/v1/newsletters/unsubscribe?token=xxx（ワンクリック停止）。
       * 2ステップ解除フロー用：外部の確認ページへ誘導し、確認後に Akinai のエンドポイントを呼ぶ構成に使う。
       * {{unsubscribe_token}} プレースホルダーでトークン単体も取得可能。
       */
      unsubscribeBaseUrl?: string;
    };

    if (!subject || (!html && !text)) {
      return apiError('subject and html (or text) are required', 400);
    }

    const validAudiences = ['buyer', 'personal', 'both'];
    if (targetAudience && !validAudiences.includes(targetAudience)) {
      return apiError('targetAudience must be "buyer", "personal", or "both"', 400);
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

    // 明示除外IDをSetに変換して高速ルックアップ
    const excludeSet = new Set<string>(Array.isArray(excludeCustomerIds) ? excludeCustomerIds : []);

    const recipientMap = new Map<string, { id: string; email: string; name: string }>();

    if (Array.isArray(customerIds) && customerIds.length > 0) {
      // customerIds 直接指定モード：お気に入りフィルタをスキップして特定顧客に送信
      const { data: directCustomers } = await supabase
        .from('customers')
        .select('id, email, name, status, role, custom_fields')
        .eq('organization_id', auth.organizationId!)
        .in('id', customerIds);

      for (const c of directCustomers || []) {
        if (!c.email) continue;
        if (c.status !== 'active') continue;
        if (excludeSet.has(c.id)) continue;
        const cf = c.custom_fields as Record<string, unknown> | null | undefined;
        if (cf?.newsletter_unsubscribed === true || cf?.newsletter_unsubscribed === 'true') continue;
        recipientMap.set(c.id, { id: c.id, email: c.email, name: c.name });
      }
    } else {
      // お気に入り登録者（メールアドレスを持つ顧客）を取得
      let favoritesQuery = supabase
        .from('product_favorites')
        .select(`
          customer_id,
          customers!inner(id, email, name, status, role, custom_fields)
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

      // 重複排除・有効会員のみ・targetAudience による role フィルタ
      const targetRoles: string[] = !targetAudience || targetAudience === 'both'
        ? ['buyer', 'personal']
        : [targetAudience];

      for (const fav of favorites || []) {
        const c = ((fav as unknown) as { customers: { id: string; email: string; name: string; status: string; role: string; custom_fields?: Record<string, unknown> } }).customers;
        if (!c?.email) continue;
        if (c.status !== 'active') continue;
        if (!targetRoles.includes(c.role)) continue;
        if (excludeSet.has(c.id)) continue;
        const cf = c.custom_fields as Record<string, unknown> | null | undefined;
        if (cf?.newsletter_unsubscribed === true || cf?.newsletter_unsubscribed === 'true') continue;
        recipientMap.set(c.id, { id: c.id, email: c.email, name: c.name });
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

    // image・productName をHTMLに注入（受信者共通部分）
    let baseHtml = html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`;
    if (productName) {
      baseHtml = baseHtml.replace(/\{\{productName\}\}/g, productName);
    }
    const imageBlock = image
      ? `<p style="text-align:center;margin:16px 0;"><img src="${image}" alt="${productName ?? ''}" style="max-width:100%;height:auto;border-radius:8px;" /></p>`
      : '';
    const sharedHtml = imageBlock ? `${imageBlock}${baseHtml}` : baseHtml;

    const baseUrl = getBaseUrl();

    for (const recipient of recipients) {
      // 受信者ごとに {{unsubscribe_url}} / {{unsubscribe_token}} / {{name}} を展開
      const token = generateUnsubscribeToken(auth.organizationId!, recipient.id);
      // unsubscribeBaseUrl が指定された場合は外部確認ページへ誘導（2ステップ解除フロー）
      const unsubscribeUrl = unsubscribeBaseUrl
        ? `${unsubscribeBaseUrl}?token=${token}`
        : `${baseUrl}/api/v1/newsletters/unsubscribe?token=${token}`;

      const emailHtml = sharedHtml
        .replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl)
        .replace(/\{\{unsubscribe_token\}\}/g, token)
        .replace(/\{\{name\}\}/g, recipient.name || '');

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

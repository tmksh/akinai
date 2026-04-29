/**
 * 1対1メッセージ（問い合わせ）共通ヘルパー
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

/** 添付ファイルの型（inquiry_messages.attachments の要素） */
export interface InquiryAttachment {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

/** 添付ファイルのバリデーション（最大件数・サイズ等） */
export function sanitizeAttachments(input: unknown): InquiryAttachment[] {
  if (!Array.isArray(input)) return [];
  const attachments: InquiryAttachment[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const a = raw as Record<string, unknown>;
    const url = typeof a.url === 'string' ? a.url : '';
    const name = typeof a.name === 'string' ? a.name : '';
    const size = typeof a.size === 'number' ? a.size : 0;
    const mimeType = typeof a.mimeType === 'string' ? a.mimeType : 'application/octet-stream';
    if (url && name) {
      attachments.push({ url, name, size, mimeType });
    }
  }
  return attachments.slice(0, 10); // 1メッセージあたり最大10件まで
}

/** 本文プレビュー文字列（一覧表示用） */
export function buildPreview(body: string, maxLength = 100): string {
  const trimmed = body.replace(/\s+/g, ' ').trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}…` : trimmed;
}

/**
 * 新着メッセージを受信した相手に対して、
 * - notifications テーブルに 1件挿入（feature: notification_box が有効な場合）
 * - メール通知を送信
 * を行う。失敗してもメッセージ送信そのものは止めない。
 */
export async function notifyInquiryRecipient(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>;
  organizationId: string;
  threadId: string;
  recipientCustomerId: string;
  fromCustomerName: string;
  subject: string;
  preview: string;
  productName?: string | null;
}): Promise<void> {
  const {
    supabase,
    organizationId,
    threadId,
    recipientCustomerId,
    fromCustomerName,
    subject,
    preview,
    productName,
  } = params;

  // 受信者・組織情報・機能フラグを並行取得
  const [recipientResult, orgResult] = await Promise.all([
    supabase
      .from('customers')
      .select('id, email, name')
      .eq('id', recipientCustomerId)
      .eq('organization_id', organizationId)
      .single(),
    supabase
      .from('organizations')
      .select('name, frontend_url, features')
      .eq('id', organizationId)
      .single(),
  ]);

  const recipient = recipientResult.data as
    | { id: string; email: string | null; name: string }
    | null;
  const org = orgResult.data as
    | { name: string | null; frontend_url: string | null; features: Record<string, unknown> | null }
    | null;

  if (!recipient) return;

  const features = (org?.features as Record<string, unknown>) || {};
  const notificationBoxEnabled = features.notification_box === true;

  const titleBase = productName
    ? `「${productName}」へのお問い合わせ`
    : `新着メッセージ`;
  const title = subject ? `${titleBase}: ${subject}` : titleBase;

  // 通知BOXに挿入（機能フラグが有効な場合のみ）
  if (notificationBoxEnabled) {
    await supabase
      .from('notifications')
      .insert({
        organization_id: organizationId,
        customer_id: recipientCustomerId,
        type: 'message_received',
        title,
        body: preview,
        related_id: threadId,
        related_type: 'message',
      })
      .then(undefined, (err) => {
        console.warn('[inquiries] failed to insert notification:', err);
      });
  }

  // メール通知
  if (recipient.email) {
    const frontendUrl = org?.frontend_url || process.env.NEXT_PUBLIC_APP_URL || '';
    const threadUrl = frontendUrl ? `${frontendUrl.replace(/\/$/, '')}/mypage/inquiries/${threadId}` : null;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="font-size: 18px; margin: 0 0 16px;">${escapeHtml(titleBase)}</h2>
        <p style="margin: 0 0 12px;">${escapeHtml(recipient.name)} 様</p>
        <p style="margin: 0 0 12px;">${escapeHtml(fromCustomerName)} さんからメッセージが届きました。</p>
        ${subject ? `<p style="margin: 0 0 12px; color: #555;"><strong>件名：</strong>${escapeHtml(subject)}</p>` : ''}
        <div style="background: #f5f6f8; border-radius: 8px; padding: 12px 16px; margin: 12px 0; white-space: pre-wrap;">${escapeHtml(preview)}</div>
        ${threadUrl ? `<p style="margin: 16px 0;"><a href="${threadUrl}" style="display: inline-block; background: #0f172a; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none;">メッセージを確認する</a></p>` : ''}
        <p style="font-size: 12px; color: #777; margin-top: 24px;">このメールは ${escapeHtml(org?.name || '')} のメッセージ機能から自動送信されています。</p>
      </div>
    `;

    await sendEmail({
      to: recipient.email,
      subject: `[${org?.name || 'お知らせ'}] ${titleBase}`,
      html,
      organizationId,
    }).catch((err) => {
      console.warn('[inquiries] failed to send email notification:', err);
    });
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

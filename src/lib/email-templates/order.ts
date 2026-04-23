/**
 * 注文関連メールテンプレート
 */

export interface OrderEmailData {
  orderNumber: string;
  orderDate?: string; // 注文日時（整形済み）
  customerName: string;
  customerEmail: string;
  items: {
    productName: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    customFields?: Record<string, string>;
  }[];
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
  paymentMethod: string;
  shippingAddress: {
    postalCode?: string;
    prefecture?: string;
    city?: string;
    line1?: string;
    line2?: string | null;
    phone?: string;
  };
  shopName: string;
  paymentInstructions?: string | null;
}

export interface CustomTemplateSettings {
  order_confirmation?: {
    enabled?: boolean;
    subject?: string;
    headerText?: string;
    bodyText?: string;
    footerText?: string;
  };
  order_notification?: {
    enabled?: boolean;
    subject?: string;
    adminEmail?: string;
  };
}

const paymentMethodLabel: Record<string, string> = {
  credit_card: 'クレジットカード',
  bank_transfer: '銀行振込',
  cod: '代金引換',
  none: '決済なし（後払い）',
};

function formatPrice(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

function formatAddressStr(addr?: OrderEmailData['shippingAddress']): string {
  if (!addr) return '';
  const postal = addr.postalCode ? `〒${addr.postalCode} ` : '';
  const main = `${addr.prefecture || ''}${addr.city || ''}${addr.line1 || ''}`;
  const line2 = addr.line2 ? ` ${addr.line2}` : '';
  return `${postal}${main}${line2}`.trim();
}

function applyVars(text: string, data: OrderEmailData): string {
  const addr = data.shippingAddress || {};
  return text
    .replace(/\{shopName\}/g, data.shopName)
    .replace(/\{orderNumber\}/g, data.orderNumber)
    .replace(/\{orderDate\}/g, data.orderDate || '')
    .replace(/\{customerName\}/g, data.customerName)
    .replace(/\{customerEmail\}/g, data.customerEmail || '')
    .replace(/\{customerPhone\}/g, addr.phone || '')
    .replace(/\{customerAddress\}/g, formatAddressStr(addr))
    .replace(/\{paymentMethod\}/g, paymentMethodLabel[data.paymentMethod] || data.paymentMethod || '')
    .replace(/\{subtotal\}/g, formatPrice(data.subtotal))
    .replace(/\{shippingFee\}/g, data.shippingFee === 0 ? '無料' : formatPrice(data.shippingFee))
    .replace(/\{tax\}/g, formatPrice(data.tax))
    .replace(/\{total\}/g, formatPrice(data.total));
}

/**
 * 顧客向け注文確認メール HTML
 */
export function buildOrderConfirmationEmail(
  data: OrderEmailData,
  custom?: CustomTemplateSettings['order_confirmation']
): { subject: string; html: string } {
  const subjectTpl =
    custom?.subject ||
    '【{shopName}】ご注文ありがとうございます（注文番号: {orderNumber}）';
  const headerText = custom?.headerText || 'ご注文ありがとうございます';
  const bodyText =
    custom?.bodyText ||
    'この度はご注文いただき、誠にありがとうございます。\n以下の内容でご注文を承りました。';
  const footerText =
    custom?.footerText ||
    'ご不明な点がございましたら、お気軽にお問い合わせください。\n今後ともよろしくお願いいたします。';

  const subject = applyVars(subjectTpl, data);

  const itemRows = data.items
    .map(
      item => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1e293b;">
          ${item.productName}${item.variantName ? `<br><span style="font-size:12px;color:#64748b;">${item.variantName}</span>` : ''}${item.customFields && Object.keys(item.customFields).length > 0 ? `<br>${Object.entries(item.customFields).map(([k, v]) => `<span style="font-size:12px;color:#64748b;">${k}: ${v}</span>`).join('<br>')}` : ''}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1e293b;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1e293b;text-align:right;">${formatPrice(item.unitPrice)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1e293b;text-align:right;font-weight:600;">${formatPrice(item.totalPrice)}</td>
      </tr>`
    )
    .join('');

  const addr = data.shippingAddress;
  const addressStr = [
    addr.postalCode ? `〒${addr.postalCode}` : '',
    `${addr.prefecture || ''}${addr.city || ''}${addr.line1 || ''}`,
    addr.line2 || '',
    addr.phone ? `TEL: ${addr.phone}` : '',
  ]
    .filter(Boolean)
    .join('<br>');

  const paymentInstructionsSection = data.paymentInstructions
    ? `
    <div style="margin:24px 0;padding:16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">振込先のご案内</p>
      <p style="margin:0;font-size:13px;color:#78350f;white-space:pre-line;">${data.paymentInstructions}</p>
    </div>`
    : '';

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- ヘッダー -->
        <tr>
          <td style="background:linear-gradient(135deg,#1d4ed8,#38bdf8);padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">${data.shopName}</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">${applyVars(headerText, data)}</p>
          </td>
        </tr>

        <!-- 本文 -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">${data.customerName} 様</p>
            <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">
              ${applyVars(bodyText, data).replace(/\n/g, '<br>')}
            </p>

            <!-- 注文番号 -->
            <div style="background:#f0f6fe;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
              <span style="font-size:12px;color:#64748b;font-weight:600;">注文番号</span>
              <p style="margin:2px 0 0;font-size:18px;font-weight:800;color:#1d4ed8;letter-spacing:0.02em;">${data.orderNumber}</p>
            </div>

            <!-- 注文明細 -->
            <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#1e293b;">ご注文内容</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:8px;font-size:12px;color:#64748b;text-align:left;border-bottom:2px solid #e2e8f0;">商品</th>
                  <th style="padding:8px;font-size:12px;color:#64748b;text-align:center;border-bottom:2px solid #e2e8f0;">数量</th>
                  <th style="padding:8px;font-size:12px;color:#64748b;text-align:right;border-bottom:2px solid #e2e8f0;">単価</th>
                  <th style="padding:8px;font-size:12px;color:#64748b;text-align:right;border-bottom:2px solid #e2e8f0;">小計</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <!-- 合計 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="font-size:13px;color:#64748b;padding:4px 0;">小計</td>
                <td style="font-size:13px;color:#1e293b;text-align:right;padding:4px 0;">${formatPrice(data.subtotal)}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748b;padding:4px 0;">送料</td>
                <td style="font-size:13px;color:#1e293b;text-align:right;padding:4px 0;">${data.shippingFee === 0 ? '無料' : formatPrice(data.shippingFee)}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748b;padding:4px 0;">消費税</td>
                <td style="font-size:13px;color:#1e293b;text-align:right;padding:4px 0;">${formatPrice(data.tax)}</td>
              </tr>
              <tr style="border-top:2px solid #e2e8f0;">
                <td style="font-size:15px;font-weight:700;color:#1e293b;padding:10px 0 4px;">合計</td>
                <td style="font-size:18px;font-weight:800;color:#1d4ed8;text-align:right;padding:10px 0 4px;">${formatPrice(data.total)}</td>
              </tr>
            </table>

            <!-- お支払い方法 -->
            <div style="display:flex;gap:16px;margin-bottom:24px;">
              <div style="flex:1;background:#f8fafc;border-radius:8px;padding:14px 16px;">
                <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">お支払い方法</p>
                <p style="margin:0;font-size:14px;color:#1e293b;font-weight:600;">${paymentMethodLabel[data.paymentMethod] || data.paymentMethod}</p>
              </div>
            </div>

            ${paymentInstructionsSection}

            <!-- お届け先 -->
            <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#1e293b;">お届け先</p>
            <div style="background:#f8fafc;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1e293b;">${data.customerName}</p>
              <p style="margin:0;font-size:13px;color:#475569;line-height:1.7;">${addressStr}</p>
            </div>

            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.7;border-top:1px solid #f1f5f9;padding-top:20px;">
              ${applyVars(footerText, data).replace(/\n/g, '<br>')}
            </p>
          </td>
        </tr>

        <!-- フッター -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">${data.shopName}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

/**
 * 銀行口座情報
 */
export interface BankInfo {
  bankName?: string;
  branchName?: string;
  accountType?: string;
  accountNumber?: string;
  accountHolder?: string;
  transferDeadlineDays?: number;
  transferDeadline?: string; // 計算済み期限日
}

/**
 * 銀行振込注文確認メール HTML
 */
export function buildBankTransferConfirmationEmail(
  data: OrderEmailData,
  bankInfo: BankInfo,
  custom?: {
    enabled?: boolean;
    subject?: string;
    headerText?: string;
    bodyText?: string;
    footerText?: string;
  }
): { subject: string; html: string } {
  const accountTypeLabel: Record<string, string> = {
    ordinary: '普通', current: '当座', savings: '貯蓄',
  };
  const resolvedAccountType = accountTypeLabel[bankInfo.accountType || 'ordinary'] || bankInfo.accountType || '普通';

  const applyBankVars = (text: string): string =>
    applyVars(text, data)
      .replace(/\{bankName\}/g, bankInfo.bankName || '―')
      .replace(/\{branchName\}/g, bankInfo.branchName || '―')
      .replace(/\{accountType\}/g, resolvedAccountType)
      .replace(/\{accountNumber\}/g, bankInfo.accountNumber || '―')
      .replace(/\{accountHolder\}/g, bankInfo.accountHolder || '―')
      .replace(/\{transferDeadlineDays\}/g, String(bankInfo.transferDeadlineDays ?? 7))
      .replace(/\{transferDeadline\}/g, bankInfo.transferDeadline || '―');

  const subjectTpl =
    custom?.subject ||
    '【{shopName}】ご注文ありがとうございます（注文番号: {orderNumber}）';
  const headerText = custom?.headerText || 'ご注文ありがとうございます';
  const bodyText =
    custom?.bodyText ||
    'この度はご注文いただき、誠にありがとうございます。\n以下の内容でご注文を承りました。\n\n下記口座へのお振込みをお願いいたします。';
  const footerText =
    custom?.footerText ||
    'ご不明な点がございましたら、お気軽にお問い合わせください。\n今後ともよろしくお願いいたします。';

  const subject = applyBankVars(subjectTpl);

  const itemRows = data.items
    .map(
      item => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1e293b;">
          ${item.productName}${item.variantName ? `<br><span style="font-size:12px;color:#64748b;">${item.variantName}</span>` : ''}${item.customFields && Object.keys(item.customFields).length > 0 ? `<br>${Object.entries(item.customFields).map(([k, v]) => `<span style="font-size:12px;color:#64748b;">${k}: ${v}</span>`).join('<br>')}` : ''}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1e293b;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1e293b;text-align:right;">${formatPrice(item.unitPrice)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1e293b;text-align:right;font-weight:600;">${formatPrice(item.totalPrice)}</td>
      </tr>`
    )
    .join('');

  const addr = data.shippingAddress;
  const addressStr = [
    addr.postalCode ? `〒${addr.postalCode}` : '',
    `${addr.prefecture || ''}${addr.city || ''}${addr.line1 || ''}`,
    addr.line2 || '',
    addr.phone ? `TEL: ${addr.phone}` : '',
  ]
    .filter(Boolean)
    .join('<br>');

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- ヘッダー -->
        <tr>
          <td style="background:linear-gradient(135deg,#1d4ed8,#38bdf8);padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">${data.shopName}</p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">${applyBankVars(headerText)}</p>
          </td>
        </tr>

        <!-- 本文 -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">${data.customerName} 様</p>
            <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">
              ${applyBankVars(bodyText).replace(/\n/g, '<br>')}
            </p>

            <!-- 注文番号 -->
            <div style="background:#f0f6fe;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
              <span style="font-size:12px;color:#64748b;font-weight:600;">注文番号</span>
              <p style="margin:2px 0 0;font-size:18px;font-weight:800;color:#1d4ed8;letter-spacing:0.02em;">${data.orderNumber}</p>
            </div>

            <!-- 振込先案内 -->
            <div style="margin-bottom:24px;padding:20px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;">
              <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#92400e;">🏦 振込先のご案内</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="font-size:13px;color:#78350f;padding:3px 0;width:110px;">銀行名</td><td style="font-size:13px;color:#78350f;font-weight:600;padding:3px 0;">${bankInfo.bankName || '―'}</td></tr>
                <tr><td style="font-size:13px;color:#78350f;padding:3px 0;">支店名</td><td style="font-size:13px;color:#78350f;font-weight:600;padding:3px 0;">${bankInfo.branchName || '―'}</td></tr>
                <tr><td style="font-size:13px;color:#78350f;padding:3px 0;">口座種別</td><td style="font-size:13px;color:#78350f;font-weight:600;padding:3px 0;">${resolvedAccountType}</td></tr>
                <tr><td style="font-size:13px;color:#78350f;padding:3px 0;">口座番号</td><td style="font-size:13px;color:#78350f;font-weight:600;padding:3px 0;">${bankInfo.accountNumber || '―'}</td></tr>
                <tr><td style="font-size:13px;color:#78350f;padding:3px 0;">口座名義</td><td style="font-size:13px;color:#78350f;font-weight:600;padding:3px 0;">${bankInfo.accountHolder || '―'}</td></tr>
              </table>
              <div style="margin-top:12px;padding-top:12px;border-top:1px solid #fde68a;">
                <p style="margin:0;font-size:12px;color:#92400e;">お振込み期限: <strong>${bankInfo.transferDeadline || '―'}</strong>（${bankInfo.transferDeadlineDays ?? 7}日以内）</p>
                <p style="margin:4px 0 0;font-size:12px;color:#92400e;">※振込手数料はお客様負担となります</p>
              </div>
            </div>

            <!-- 注文明細 -->
            <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#1e293b;">ご注文内容</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:8px;font-size:12px;color:#64748b;text-align:left;border-bottom:2px solid #e2e8f0;">商品</th>
                  <th style="padding:8px;font-size:12px;color:#64748b;text-align:center;border-bottom:2px solid #e2e8f0;">数量</th>
                  <th style="padding:8px;font-size:12px;color:#64748b;text-align:right;border-bottom:2px solid #e2e8f0;">単価</th>
                  <th style="padding:8px;font-size:12px;color:#64748b;text-align:right;border-bottom:2px solid #e2e8f0;">小計</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <!-- 合計 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="font-size:13px;color:#64748b;padding:4px 0;">小計</td>
                <td style="font-size:13px;color:#1e293b;text-align:right;padding:4px 0;">${formatPrice(data.subtotal)}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748b;padding:4px 0;">送料</td>
                <td style="font-size:13px;color:#1e293b;text-align:right;padding:4px 0;">${data.shippingFee === 0 ? '無料' : formatPrice(data.shippingFee)}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748b;padding:4px 0;">消費税</td>
                <td style="font-size:13px;color:#1e293b;text-align:right;padding:4px 0;">${formatPrice(data.tax)}</td>
              </tr>
              <tr style="border-top:2px solid #e2e8f0;">
                <td style="font-size:15px;font-weight:700;color:#1e293b;padding:10px 0 4px;">合計</td>
                <td style="font-size:18px;font-weight:800;color:#1d4ed8;text-align:right;padding:10px 0 4px;">${formatPrice(data.total)}</td>
              </tr>
            </table>

            <!-- お届け先 -->
            <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#1e293b;">お届け先</p>
            <div style="background:#f8fafc;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#1e293b;">${data.customerName}</p>
              <p style="margin:0;font-size:13px;color:#475569;line-height:1.7;">${addressStr}</p>
            </div>

            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.7;border-top:1px solid #f1f5f9;padding-top:20px;">
              ${applyBankVars(footerText).replace(/\n/g, '<br>')}
            </p>
          </td>
        </tr>

        <!-- フッター -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">${data.shopName}</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

/**
 * 代理店向け注文通知メール HTML
 */
export interface AgentOrderEmailData {
  orderNumber: string;
  orderDate?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  paymentMethod?: string;
  agentCode: string;
  agentName: string;
  agentCompany: string;
  items: {
    productName: string;
    variantName?: string;
    quantity: number;
    totalPrice: number;
    customFields?: Record<string, string>;
  }[];
  subtotal: number;
  total: number;
  commissionRate: number;
  commissionAmount: number;
  shopName: string;
}

export function buildAgentOrderNotificationEmail(
  data: AgentOrderEmailData,
  custom?: { subject?: string; bodyText?: string }
): { subject: string; html: string } {
  function fmt(n: number) { return `¥${n.toLocaleString('ja-JP')}`; }

  const subjectTpl =
    custom?.subject ||
    '【{shopName}】代理店経由の注文が入りました（{orderNumber}）';

  const bodyTpl =
    custom?.bodyText ||
    'お世話になっております。\nあなたの代理店コード（{agentCode}）経由で新しい注文が入りました。\n\nコミッション: {commission}\n\n引き続きよろしくお願いいたします。';

  const replaceVars = (text: string) =>
    text
      .replace(/\{shopName\}/g, data.shopName)
      .replace(/\{orderNumber\}/g, data.orderNumber)
      .replace(/\{orderDate\}/g, data.orderDate || '')
      .replace(/\{customerName\}/g, data.customerName)
      .replace(/\{customerEmail\}/g, data.customerEmail || '')
      .replace(/\{customerPhone\}/g, data.customerPhone || '')
      .replace(/\{customerAddress\}/g, data.customerAddress || '')
      .replace(/\{paymentMethod\}/g, paymentMethodLabel[data.paymentMethod || ''] || data.paymentMethod || '')
      .replace(/\{agentCode\}/g, data.agentCode)
      .replace(/\{agentName\}/g, data.agentName || '')
      .replace(/\{agentCompany\}/g, data.agentCompany || '')
      .replace(/\{commissionRate\}/g, `${data.commissionRate}%`)
      .replace(/\{commission\}/g, fmt(data.commissionAmount))
      .replace(/\{subtotal\}/g, fmt(data.subtotal))
      .replace(/\{total\}/g, fmt(data.total));

  const subject = replaceVars(subjectTpl);

  const itemRows = data.items
    .map(
      item => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1e293b;">
          ${item.productName}${item.variantName ? `<br><span style="font-size:12px;color:#64748b;">${item.variantName}</span>` : ''}${item.customFields && Object.keys(item.customFields).length > 0 ? `<br>${Object.entries(item.customFields).map(([k, v]) => `<span style="font-size:12px;color:#64748b;">${k}: ${v}</span>`).join('<br>')}` : ''}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1e293b;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1e293b;text-align:right;font-weight:600;">${fmt(item.totalPrice)}</td>
      </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0f172a,#1e3a5f);padding:24px 32px;">
            <p style="margin:0;font-size:13px;font-weight:700;color:#38bdf8;">代理店向け注文通知</p>
            <p style="margin:4px 0 0;font-size:20px;font-weight:800;color:#ffffff;">${data.shopName}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 6px;font-size:15px;color:#1e293b;font-weight:600;">${data.agentCompany} ${data.agentName} 様</p>
            <p style="margin:0 0 24px;font-size:14px;color:#475569;white-space:pre-line;">${replaceVars(bodyTpl)}</p>
            <div style="background:#f0f6fe;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
              <span style="font-size:12px;color:#64748b;font-weight:600;">注文番号</span>
              <p style="margin:2px 0 0;font-size:18px;font-weight:800;color:#1d4ed8;">${data.orderNumber}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#475569;">お客様: ${data.customerName} 様</p>
            </div>
            <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#1e293b;">注文内容</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:8px;font-size:12px;color:#64748b;text-align:left;border-bottom:2px solid #e2e8f0;">商品</th>
                  <th style="padding:8px;font-size:12px;color:#64748b;text-align:center;border-bottom:2px solid #e2e8f0;">数量</th>
                  <th style="padding:8px;font-size:12px;color:#64748b;text-align:right;border-bottom:2px solid #e2e8f0;">小計</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 18px;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:3px 0;">注文合計</td>
                  <td style="font-size:13px;color:#1e293b;text-align:right;padding:3px 0;">${fmt(data.total)}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;padding:3px 0;">コミッション率</td>
                  <td style="font-size:13px;color:#1e293b;text-align:right;padding:3px 0;">${data.commissionRate}%</td>
                </tr>
                <tr style="border-top:1px solid #bbf7d0;">
                  <td style="font-size:15px;font-weight:700;color:#16a34a;padding:8px 0 0;">今回のコミッション</td>
                  <td style="font-size:18px;font-weight:800;color:#16a34a;text-align:right;padding:8px 0 0;">${fmt(data.commissionAmount)}</td>
                </tr>
              </table>
            </div>
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.7;border-top:1px solid #f1f5f9;padding-top:20px;">
              このメールは代理店コード <strong>${data.agentCode}</strong> 宛に自動送信されています。
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">${data.shopName}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
export function buildNewOrderNotificationEmail(
  data: OrderEmailData,
  custom?: CustomTemplateSettings['order_notification']
): { subject: string; html: string } {
  const subjectTpl =
    custom?.subject ||
    '【新規注文】{orderNumber} - {customerName} 様（{total}）';
  const subject = applyVars(subjectTpl, data);

  const itemRows = data.items
    .map(
      item => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1e293b;">
          ${item.productName}${item.variantName ? `<br><span style="font-size:12px;color:#64748b;">${item.variantName}</span>` : ''}${item.customFields && Object.keys(item.customFields).length > 0 ? `<br>${Object.entries(item.customFields).map(([k, v]) => `<span style="font-size:12px;color:#64748b;">${k}: ${v}</span>`).join('<br>')}` : ''}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1e293b;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1e293b;text-align:right;">${formatPrice(item.unitPrice)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#1e293b;text-align:right;font-weight:600;">${formatPrice(item.totalPrice)}</td>
      </tr>`
    )
    .join('');

  const addr = data.shippingAddress;
  const addressStr = [
    addr.postalCode ? `〒${addr.postalCode}` : '',
    `${addr.prefecture || ''}${addr.city || ''}${addr.line1 || ''}`,
    addr.line2 || '',
    addr.phone ? `TEL: ${addr.phone}` : '',
  ]
    .filter(Boolean)
    .join('<br>');

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <!-- ヘッダー -->
        <tr>
          <td style="background:#1e293b;padding:20px 32px;">
            <p style="margin:0;font-size:13px;font-weight:700;color:#38bdf8;">🛒 新規注文が入りました</p>
            <p style="margin:6px 0 0;font-size:24px;font-weight:800;color:#ffffff;">${formatPrice(data.total)}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">${data.orderNumber}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 32px 0;">

            <!-- 注文基本情報 -->
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.05em;">注文情報</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
              <tr style="background:#f8fafc;">
                <td style="font-size:12px;color:#64748b;padding:8px 14px;width:130px;border-bottom:1px solid #e2e8f0;">注文番号</td>
                <td style="font-size:13px;color:#1e293b;font-weight:600;padding:8px 14px;border-bottom:1px solid #e2e8f0;">${data.orderNumber}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#64748b;padding:8px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">お客様</td>
                <td style="font-size:13px;color:#1e293b;padding:8px 14px;border-bottom:1px solid #e2e8f0;">${data.customerName}<br><span style="font-size:12px;color:#64748b;">${data.customerEmail}</span></td>
              </tr>
              <tr style="background:#f8fafc;">
                <td style="font-size:12px;color:#64748b;padding:8px 14px;border-bottom:1px solid #e2e8f0;">支払い方法</td>
                <td style="font-size:13px;color:#1e293b;padding:8px 14px;border-bottom:1px solid #e2e8f0;">${paymentMethodLabel[data.paymentMethod] || data.paymentMethod}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#64748b;padding:8px 14px;background:#f8fafc;vertical-align:top;">お届け先</td>
                <td style="font-size:13px;color:#1e293b;padding:8px 14px;line-height:1.7;">${addressStr || '―'}</td>
              </tr>
            </table>

            <!-- 注文明細 -->
            <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:0.05em;">注文明細</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:8px;font-size:11px;color:#64748b;text-align:left;border-bottom:2px solid #e2e8f0;">商品</th>
                  <th style="padding:8px;font-size:11px;color:#64748b;text-align:center;border-bottom:2px solid #e2e8f0;">数量</th>
                  <th style="padding:8px;font-size:11px;color:#64748b;text-align:right;border-bottom:2px solid #e2e8f0;">単価</th>
                  <th style="padding:8px;font-size:11px;color:#64748b;text-align:right;border-bottom:2px solid #e2e8f0;">小計</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <!-- 合計 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="font-size:12px;color:#64748b;padding:4px 0;">小計</td>
                <td style="font-size:12px;color:#1e293b;text-align:right;padding:4px 0;">${formatPrice(data.subtotal)}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#64748b;padding:4px 0;">送料</td>
                <td style="font-size:12px;color:#1e293b;text-align:right;padding:4px 0;">${data.shippingFee === 0 ? '無料' : formatPrice(data.shippingFee)}</td>
              </tr>
              <tr>
                <td style="font-size:12px;color:#64748b;padding:4px 0;">消費税</td>
                <td style="font-size:12px;color:#1e293b;text-align:right;padding:4px 0;">${formatPrice(data.tax)}</td>
              </tr>
              <tr style="border-top:2px solid #e2e8f0;">
                <td style="font-size:14px;font-weight:700;color:#1e293b;padding:10px 0 4px;">合計</td>
                <td style="font-size:17px;font-weight:800;color:#1d4ed8;text-align:right;padding:10px 0 4px;">${formatPrice(data.total)}</td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- フッター -->
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">このメールは ${data.shopName} の管理者宛に自動送信されています</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

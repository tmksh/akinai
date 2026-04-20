import { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import {
  buildOrderConfirmationEmail,
  buildNewOrderNotificationEmail,
  buildAgentOrderNotificationEmail,
  type OrderEmailData,
  type AgentOrderEmailData,
} from '@/lib/email-templates/order';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = SupabaseClient<any, 'public', any>;

/**
 * 注文確認メール（顧客）+ 新規注文通知（管理者）+ 代理店通知 を送信する。
 * 銀行振込・代引き・Stripe Webhook 完了時のいずれからも呼び出される共通関数。
 */
export async function sendOrderEmails(
  supabase: SupabaseAdmin,
  orderId: string,
  organizationId: string | null
) {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (!order) return;

    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, variant_name, quantity, unit_price, total_price, custom_fields')
      .eq('order_id', orderId);

    if (!items) return;

    const orgId = organizationId || order.organization_id;
    const { data: org } = await supabase
      .from('organizations')
      .select('name, email, mail_from_address, mail_domain_verified, email_templates')
      .eq('id', orgId)
      .single();

    const shopName = org?.name || 'ショップ';
    const customTemplates = (org?.email_templates as Record<string, unknown>) || {};
    const confirmCustom = (customTemplates.order_confirmation as Record<string, unknown>) || {};
    const notifyCustom = (customTemplates.order_notification as Record<string, unknown>) || {};

    // service role で取得済みの org データから from アドレスを組み立てる
    // （sendEmail 内で匿名クライアントを使って再取得すると RLS でブロックされるため）
    const defaultFrom = process.env.EMAIL_FROM || 'noreply@akinai.jp';
    const fromAddress = org?.mail_domain_verified && org?.mail_from_address
      ? (org.name ? `${org.name} <${org.mail_from_address}>` : org.mail_from_address)
      : (org?.name ? `${org.name} <${defaultFrom}>` : defaultFrom);

    const addr = (order.shipping_address as Record<string, string | null>) || {};

    const emailData: OrderEmailData = {
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      items: items.map(i => ({
        productName: i.product_name,
        variantName: i.variant_name || undefined,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        totalPrice: i.total_price,
        customFields: (i.custom_fields as Record<string, string> | null) || undefined,
      })),
      subtotal: order.subtotal,
      shippingFee: order.shipping_cost || 0,
      tax: order.tax || 0,
      total: order.total,
      paymentMethod: order.payment_method || 'credit_card',
      shippingAddress: {
        postalCode: addr.postalCode || undefined,
        prefecture: addr.prefecture || undefined,
        city: addr.city || undefined,
        line1: addr.line1 || undefined,
        line2: addr.line2 || null,
        phone: addr.phone || undefined,
      },
      shopName,
    };

    if (confirmCustom.enabled !== false) {
      const { subject, html } = buildOrderConfirmationEmail(
        emailData,
        confirmCustom as Parameters<typeof buildOrderConfirmationEmail>[1]
      );
      await sendEmail({ to: order.customer_email, subject, html, from: fromAddress });
      console.log(`[Email] Order confirmation sent to ${order.customer_email}`);
    }

    if (notifyCustom.enabled !== false) {
      const adminEmail =
        (notifyCustom.adminEmail as string | undefined) ||
        org?.email ||
        org?.mail_from_address;
      if (adminEmail) {
        const { subject, html } = buildNewOrderNotificationEmail(
          emailData,
          notifyCustom as Parameters<typeof buildNewOrderNotificationEmail>[1]
        );
        await sendEmail({ to: adminEmail, subject, html, from: fromAddress });
        console.log(`[Email] New order notification sent to ${adminEmail}`);
      }
    }

    const agentCustom = (customTemplates.agent_notification as Record<string, unknown>) || {};
    if (agentCustom.enabled !== false && order.agent_id) {
      const { data: agent } = await supabase
        .from('agents')
        .select('email, name, company, code, commission_rate')
        .eq('id', order.agent_id)
        .single();

      if (agent?.email) {
        const agentEmailData: AgentOrderEmailData = {
          orderNumber: order.order_number,
          customerName: order.customer_name,
          agentCode: agent.code,
          agentName: agent.name,
          agentCompany: agent.company || '',
          items: items.map(i => ({
            productName: i.product_name,
            variantName: i.variant_name || undefined,
            quantity: i.quantity,
            totalPrice: i.total_price,
          })),
          subtotal: order.subtotal,
          total: order.total,
          commissionRate: Number(agent.commission_rate),
          commissionAmount: order.agent_commission_amount || 0,
          shopName,
        };
        const { subject, html } = buildAgentOrderNotificationEmail(
          agentEmailData,
          agentCustom as Parameters<typeof buildAgentOrderNotificationEmail>[1]
        );
        await sendEmail({ to: agent.email, subject, html, from: fromAddress });
        console.log(`[Email] Agent notification sent to ${agent.email}`);
      }
    }
  } catch (err) {
    console.error('[Email] Failed to send order emails:', err);
  }
}

/**
 * akinai の内部エンドポイント経由でメール送信をトリガーする。
 * RESEND_API_KEY を持つ akinai サーバー側で実際の送信を行うため、
 * eiwanext など別サーバーから呼び出すときに使用する。
 */
export async function triggerOrderEmails(orderId: string, organizationId: string | null) {
  const akinaiUrl = process.env.AKINAI_API_URL;
  const secret = process.env.INTERNAL_API_SECRET;

  if (!akinaiUrl || !secret) {
    console.warn('[triggerOrderEmails] AKINAI_API_URL or INTERNAL_API_SECRET not configured, skipping');
    return;
  }

  try {
    const res = await fetch(`${akinaiUrl}/api/internal/order-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ orderId, organizationId }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[triggerOrderEmails] Failed:', res.status, text);
    } else {
      console.log('[triggerOrderEmails] Success for order:', orderId);
    }
  } catch (err) {
    console.error('[triggerOrderEmails] Error:', err);
  }
}

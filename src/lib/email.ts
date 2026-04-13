'use server';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;       // 未指定時はデフォルト or 組織ドメインを使用
  replyTo?: string;
  organizationId?: string; // 指定すると組織の認証済みドメインを from に使用
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log('[Email] RESEND_API_KEY not set. Would have sent email:');
    console.log('  To:', payload.to);
    console.log('  Subject:', payload.subject);
    return { success: true };
  }

  // 組織の認証済みドメインを from に使用
  let from = payload.from || process.env.EMAIL_FROM || 'noreply@akinai.jp';

  if (payload.organizationId && !payload.from) {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data: org } = await supabase
        .from('organizations')
        .select('mail_from_address, mail_domain_verified, name')
        .eq('id', payload.organizationId)
        .single();

      if (org?.mail_domain_verified && org?.mail_from_address) {
        // 認証済み: 企業名 <info@example.com> 形式にする
        from = org.name ? `${org.name} <${org.mail_from_address}>` : org.mail_from_address;
      } else if (org?.name) {
        // 未認証: デフォルトドメインで企業名だけ表示
        const defaultAddress = process.env.EMAIL_FROM || 'noreply@akinai.jp';
        from = `${org.name} <${defaultAddress}>`;
      }
    } catch {
      // フォールバック: デフォルトのまま
    }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        ...(payload.replyTo && { reply_to: payload.replyTo }),
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to send email');
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Send failed:', msg);
    return { success: false, error: msg };
  }
}

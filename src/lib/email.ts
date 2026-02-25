'use server';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // 環境変数未設定の場合はログ出力（開発時フォールバック）
    console.log('[Email] RESEND_API_KEY not set. Would have sent email:');
    console.log('  To:', payload.to);
    console.log('  Subject:', payload.subject);
    return { success: true };
  }

  try {
    const from = payload.from || process.env.EMAIL_FROM || 'noreply@akinai.jp';
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

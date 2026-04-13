/**
 * Resend ドメイン管理 API ラッパー
 * https://resend.com/docs/api-reference/domains
 */

const RESEND_API_BASE = 'https://api.resend.com';

function getApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  return key;
}

export interface ResendDnsRecord {
  record: string;   // "CNAME" | "TXT"
  name: string;     // DNS レコード名
  value: string;    // DNS レコード値
  ttl: string;
  status: 'verified' | 'not_started' | 'pending' | 'failure';
  type: 'MX' | 'TXT' | 'CNAME';
  priority?: number;
}

export interface ResendDomain {
  id: string;
  name: string;
  status: 'not_started' | 'pending' | 'verified' | 'failure' | 'temporary_failure';
  created_at: string;
  region: string;
  records: ResendDnsRecord[];
}

/** ドメインを Resend に登録して DNS レコードを取得 */
export async function createResendDomain(domain: string): Promise<{
  data: ResendDomain | null;
  error: string | null;
}> {
  try {
    const res = await fetch(`${RESEND_API_BASE}/domains`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain, region: 'ap-northeast-1' }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { data: null, error: json.message || json.name || 'Resend API error' };
    }
    return { data: json as ResendDomain, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** ドメインの認証ステータスと DNS レコードを取得 */
export async function getResendDomain(domainId: string): Promise<{
  data: ResendDomain | null;
  error: string | null;
}> {
  try {
    const res = await fetch(`${RESEND_API_BASE}/domains/${domainId}`, {
      headers: { Authorization: `Bearer ${getApiKey()}` },
      cache: 'no-store',
    });

    const json = await res.json();
    if (!res.ok) {
      return { data: null, error: json.message || 'Resend API error' };
    }
    return { data: json as ResendDomain, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Resend にドメイン再検証をリクエスト */
export async function verifyResendDomain(domainId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const res = await fetch(`${RESEND_API_BASE}/domains/${domainId}/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getApiKey()}` },
    });

    if (!res.ok) {
      const json = await res.json();
      return { success: false, error: json.message || 'Resend API error' };
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/** Resend からドメインを削除 */
export async function deleteResendDomain(domainId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    const res = await fetch(`${RESEND_API_BASE}/domains/${domainId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getApiKey()}` },
    });

    if (!res.ok) {
      const json = await res.json();
      return { success: false, error: json.message || 'Resend API error' };
    }
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

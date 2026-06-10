import { getResendDomain } from '@/lib/resend-domains';

export interface OrgMailFields {
  name?: string | null;
  mail_from_address?: string | null;
  mail_domain_verified?: boolean | null;
  resend_domain_id?: string | null;
}

/**
 * 注文メール等の送信元アドレスを決定する。
 * DB の mail_domain_verified が古い場合でも、Resend 上で認証済みなら自社ドメインを使う。
 */
export async function resolveFromAddress(org: OrgMailFields): Promise<string> {
  const defaultFrom = process.env.EMAIL_FROM || 'noreply@akinai.jp';
  let domainVerified = !!(org.mail_domain_verified && org.mail_from_address);

  if (!domainVerified && org.mail_from_address && org.resend_domain_id) {
    const { data: resendData } = await getResendDomain(org.resend_domain_id);
    if (resendData?.status === 'verified') {
      domainVerified = true;
    }
  }

  if (domainVerified && org.mail_from_address) {
    return org.name ? `${org.name} <${org.mail_from_address}>` : org.mail_from_address;
  }

  return org.name ? `${org.name} <${defaultFrom}>` : defaultFrom;
}

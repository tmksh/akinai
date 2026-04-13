'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  createResendDomain,
  getResendDomain,
  verifyResendDomain,
  deleteResendDomain,
  type ResendDomain,
} from '@/lib/resend-domains';

export interface EmailDomainStatus {
  domain: string | null;
  fromAddress: string | null;
  domainId: string | null;
  verified: boolean;
  resendStatus: ResendDomain['status'] | null;
  records: ResendDomain['records'];
}

/** 組織のメールドメイン設定を取得 */
export async function getEmailDomainStatus(organizationId: string): Promise<{
  data: EmailDomainStatus;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('mail_from_domain, mail_from_address, resend_domain_id, mail_domain_verified, mail_domain_records')
    .eq('id', organizationId)
    .single();

  if (error) {
    return {
      data: { domain: null, fromAddress: null, domainId: null, verified: false, resendStatus: null, records: [] },
      error: error.message,
    };
  }

  // 登録済みの場合は Resend から最新ステータスを取得
  let resendStatus: ResendDomain['status'] | null = null;
  let records = (data.mail_domain_records as ResendDomain['records']) || [];

  if (data.resend_domain_id) {
    const { data: resendData } = await getResendDomain(data.resend_domain_id);
    if (resendData) {
      resendStatus = resendData.status;
      records = resendData.records;
      // 認証完了していればDBを更新
      if (resendData.status === 'verified' && !data.mail_domain_verified) {
        await supabase
          .from('organizations')
          .update({ mail_domain_verified: true, mail_domain_records: resendData.records })
          .eq('id', organizationId);
      }
    }
  }

  return {
    data: {
      domain: data.mail_from_domain,
      fromAddress: data.mail_from_address,
      domainId: data.resend_domain_id,
      verified: data.mail_domain_verified ?? false,
      resendStatus,
      records,
    },
    error: null,
  };
}

/** ドメインを登録して DNS レコードを返す */
export async function registerEmailDomain(
  organizationId: string,
  domain: string,
  fromAddress: string
): Promise<{ data: EmailDomainStatus | null; error: string | null }> {
  // ドメインの簡易バリデーション
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return { data: null, error: '有効なドメイン名を入力してください（例: example.com）' };
  }
  if (!fromAddress.endsWith(`@${domain}`)) {
    return { data: null, error: `メールアドレスは @${domain} で終わる必要があります` };
  }

  const supabase = await createClient();

  // 既存のResendドメインIDがあれば先に削除
  const { data: existing } = await supabase
    .from('organizations')
    .select('resend_domain_id')
    .eq('id', organizationId)
    .single();

  if (existing?.resend_domain_id) {
    await deleteResendDomain(existing.resend_domain_id);
  }

  // Resend にドメイン登録
  const { data: resendData, error: resendError } = await createResendDomain(domain);
  if (resendError || !resendData) {
    return { data: null, error: resendError || 'Resend へのドメイン登録に失敗しました' };
  }

  // DB に保存
  const { error: dbError } = await supabase
    .from('organizations')
    .update({
      mail_from_domain: domain,
      mail_from_address: fromAddress,
      resend_domain_id: resendData.id,
      mail_domain_verified: false,
      mail_domain_records: resendData.records,
    })
    .eq('id', organizationId);

  if (dbError) {
    return { data: null, error: dbError.message };
  }

  revalidatePath('/settings/email-domain');

  return {
    data: {
      domain,
      fromAddress,
      domainId: resendData.id,
      verified: false,
      resendStatus: resendData.status,
      records: resendData.records,
    },
    error: null,
  };
}

/** DNS 設定後に認証チェックを実行 */
export async function checkEmailDomainVerification(organizationId: string): Promise<{
  verified: boolean;
  status: ResendDomain['status'] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('organizations')
    .select('resend_domain_id')
    .eq('id', organizationId)
    .single();

  if (!data?.resend_domain_id) {
    return { verified: false, status: null, error: 'ドメインが登録されていません' };
  }

  // Resend に再検証リクエスト
  await verifyResendDomain(data.resend_domain_id);

  // 最新ステータスを取得
  const { data: resendData, error } = await getResendDomain(data.resend_domain_id);
  if (error || !resendData) {
    return { verified: false, status: null, error: error || 'ステータス取得に失敗しました' };
  }

  const verified = resendData.status === 'verified';
  await supabase
    .from('organizations')
    .update({
      mail_domain_verified: verified,
      mail_domain_records: resendData.records,
    })
    .eq('id', organizationId);

  revalidatePath('/settings/email-domain');
  return { verified, status: resendData.status, error: null };
}

/** ドメイン設定を削除 */
export async function removeEmailDomain(organizationId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('organizations')
    .select('resend_domain_id')
    .eq('id', organizationId)
    .single();

  if (data?.resend_domain_id) {
    await deleteResendDomain(data.resend_domain_id);
  }

  await supabase
    .from('organizations')
    .update({
      mail_from_domain: null,
      mail_from_address: null,
      resend_domain_id: null,
      mail_domain_verified: false,
      mail_domain_records: null,
    })
    .eq('id', organizationId);

  revalidatePath('/settings/email-domain');
  return { success: true, error: null };
}

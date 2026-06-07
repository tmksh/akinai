import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * アクセストークン(JWT)からユーザーを解決する。
 *
 * getClaims() は非対称署名鍵(JWKS)を使ってJWTを「ローカル検証」するため、
 * Auth サーバーへのネットワーク往復が発生しない（getUser は毎回往復し200〜700ms要する）。
 * 画面遷移ごとに必ず実行される処理なので、ここのコストが体感速度を大きく左右する。
 *
 * ローカル検証できない構成（対称鍵など）では getClaims が自動的に getUser へ
 * フォールバックするが、念のため明示フォールバックも用意し退行を防ぐ。
 */
async function resolveUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<{ id: string; email: string; user_metadata: Record<string, unknown> } | null> {
  try {
    if (typeof supabase.auth.getClaims === 'function') {
      const { data, error } = await supabase.auth.getClaims();
      const claims = data?.claims;
      if (!error && claims?.sub) {
        return {
          id: claims.sub as string,
          email: (claims.email as string) ?? '',
          user_metadata: (claims.user_metadata as Record<string, unknown>) ?? {},
        };
      }
    }
  } catch {
    // getClaims 失敗時は getUser にフォールバック
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? '',
    user_metadata: (user.user_metadata as Record<string, unknown>) ?? {},
  };
}

/**
 * 同一リクエスト内で auth + user profile + organization を1回だけ取得する。
 * React の cache() により、layout / page から何度呼んでも実際のDB呼び出しは1回。
 *
 * クエリフロー:
 *   1. getClaims() — JWTローカル検証（ネットワーク往復なし）
 *   2. users SELECT (current_organization_id, name, avatar) — 1クエリで全取得
 *   3. organizations SELECT (*) — 1クエリで全取得
 * 合計: DB 2回（並列）+ org 1回。Auth サーバー往復なし。
 */
export const getAuthOrganization = cache(async () => {
  const supabase = await createClient();
  const user = await resolveUser(supabase);

  if (!user) return {
    user: null,
    organizationId: null,
    orgSettings: null,
    userProfile: null,
    orgRow: null,
    supabase,
  };

  const { data: userRow } = await supabase
    .from('users')
    .select('current_organization_id, name, avatar')
    .eq('id', user.id)
    .maybeSingle();

  const userProfile = userRow
    ? { name: userRow.name, avatar: userRow.avatar }
    : null;

  let organizationId = (userRow?.current_organization_id as string | null) ?? null;

  // current_organization_id 未設定時のみメンバーシップを照会（大半のリクエストで1クエリ削減）
  if (!organizationId) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    organizationId = (membership?.organization_id as string | null) ?? null;

    if (membership?.organization_id) {
      await supabase
        .from('users')
        .update({
          current_organization_id: membership.organization_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }
  }

  // organizations テーブルから全カラムを1クエリで取得
  let orgRow: Record<string, unknown> | null = null;
  let orgSettings: Record<string, unknown> | null = null;

  if (organizationId) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name, slug, logo, email, phone, website, address, frontend_url, frontend_api_key, plan, settings, owner_id, is_active, created_at, updated_at, subscription_status, trial_ends_at')
      .eq('id', organizationId)
      .single();
    if (orgData) {
      orgRow = orgData;
      orgSettings = (orgData.settings as Record<string, unknown>) || null;
    }
  }

  return {
    user,
    organizationId,
    orgSettings,
    userProfile,
    orgRow,
    supabase,
  };
});

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * 同一リクエスト内で auth + user profile + organization を1回だけ取得する。
 * React の cache() により、layout / page から何度呼んでも実際のDB呼び出しは1回。
 *
 * クエリフロー:
 *   1. auth.getUser() — Supabase Auth検証（1回だけ）
 *   2. users SELECT (current_organization_id, name, avatar) — 1クエリで全取得
 *   3. organizations SELECT (*) — 1クエリで全取得
 * 合計: auth 1回 + DB 2回（並列）
 */
export const getAuthOrganization = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return {
    user: null,
    organizationId: null,
    orgSettings: null,
    userProfile: null,
    orgRow: null,
    supabase,
  };

  // users テーブルと organization_members を並列取得
  const [userRes, membershipRes] = await Promise.all([
    supabase
      .from('users')
      .select('current_organization_id, name, avatar')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
  ]);

  const userProfile = userRes.data
    ? { name: userRes.data.name, avatar: userRes.data.avatar }
    : null;

  // current_organization_id が未設定でもメンバーシップから組織IDを補完する
  const organizationId = (userRes.data?.current_organization_id as string | null)
    ?? (membershipRes.data?.organization_id as string | null)
    ?? null;

  // current_organization_id が未設定の場合はここで更新する
  if (
    !userRes.data?.current_organization_id &&
    membershipRes.data?.organization_id
  ) {
    await supabase
      .from('users')
      .update({
        current_organization_id: membershipRes.data.organization_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
  }

  // organizations テーブルから全カラムを1クエリで取得
  let orgRow: Record<string, unknown> | null = null;
  let orgSettings: Record<string, unknown> | null = null;

  if (organizationId) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id, name, slug, logo, email, phone, website, address, frontend_url, frontend_api_key, plan, settings, owner_id, is_active, created_at, updated_at')
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

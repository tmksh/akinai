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

  // users テーブルから org_id + profile を1クエリで取得
  const { data: userData } = await supabase
    .from('users')
    .select('current_organization_id, name, avatar')
    .eq('id', user.id)
    .single();

  const organizationId = userData?.current_organization_id as string | null;
  const userProfile = userData ? { name: userData.name, avatar: userData.avatar } : null;

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

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * 同一リクエスト内で auth.getUser() + organizationId + settings を1回だけ取得する。
 * React の cache() により、layout / page / component から何度呼んでも実際のDB呼び出しは1回。
 */
export const getAuthOrganization = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { user: null, organizationId: null, orgSettings: null, supabase };

  const { data: userData } = await supabase
    .from('users')
    .select('current_organization_id')
    .eq('id', user.id)
    .single();

  const organizationId = userData?.current_organization_id as string | null;

  // organizationIdがある場合、settingsも一緒に取得（追加クエリなし）
  let orgSettings: Record<string, unknown> | null = null;
  if (organizationId) {
    const { data: orgData } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();
    orgSettings = (orgData?.settings as Record<string, unknown>) || null;
  }

  return {
    user,
    organizationId,
    orgSettings,
    supabase,
  };
});

import { redirect } from 'next/navigation';
import ContentsClient from './contents-client';
import { getContents, getContentStats } from '@/lib/actions/contents';
import { getEnabledContentTypes } from '@/lib/actions/settings';
import { ensureDefaultOrganization } from '@/lib/actions/onboarding';
import { getAuthOrganization } from '@/lib/auth-helpers';

export default async function ContentsPage() {
  const { user, organizationId } = await getAuthOrganization();

  if (!user) {
    redirect('/login');
  }

  if (!organizationId) {
    await ensureDefaultOrganization();
    redirect('/contents');
  }

  const [s, t] = await Promise.all([
    getContentStats(organizationId),
    getEnabledContentTypes(organizationId),
  ]);

  const enabledTypes = t.data || [];

  // タイプ別に独立してフェッチ（全件一括だと Supabase の 1000 行上限で他タイプが消える）
  const perTypeResults = await Promise.all(
    enabledTypes.map((type) => getContents(organizationId, { type, limit: 2000 }))
  );
  const allContents = perTypeResults.flatMap((r) => r.data || []);

  return (
    <ContentsClient
      initialContents={allContents}
      stats={s || { total: 0, published: 0, draft: 0, scheduled: 0 }}
      organizationId={organizationId}
      enabledContentTypes={enabledTypes}
    />
  );
}

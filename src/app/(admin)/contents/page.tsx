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

  const [c, s, t] = await Promise.all([
    getContents(organizationId, { limit: 100 }),
    getContentStats(organizationId),
    getEnabledContentTypes(organizationId),
  ]);

  return (
    <ContentsClient
      initialContents={c.data || []}
      stats={s || { total: 0, published: 0, draft: 0, scheduled: 0 }}
      organizationId={organizationId}
      enabledContentTypes={t.data || []}
    />
  );
}

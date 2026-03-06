import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getContents, getContentStats } from '@/lib/actions/contents';
import { getEnabledContentTypes } from '@/lib/actions/settings';
import { getAuthOrganization } from '@/lib/auth-helpers';
import ContentsClient from './contents-client';

const getCachedContents = (orgId: string) =>
  unstable_cache(
    () => Promise.all([
      getContents(orgId, { limit: 50 }),
      getContentStats(orgId),
      getEnabledContentTypes(orgId),
    ]),
    ['contents', orgId],
    { revalidate: 15 }
  )();

export default async function ContentsPage() {
  const { user, organizationId } = await getAuthOrganization();

  if (!user) {
    redirect('/login');
  }
  
  if (!organizationId) {
    return (
      <ContentsClient 
        initialContents={[]} 
        stats={{ total: 0, published: 0, draft: 0, scheduled: 0 }}
        organizationId=""
        enabledContentTypes={[]}
      />
    );
  }
  
  const [contentsRes, stats, enabledTypesRes] = await getCachedContents(organizationId);

  return (
    <ContentsClient 
      initialContents={contentsRes.data || []} 
      stats={stats || { total: 0, published: 0, draft: 0, scheduled: 0 }}
      organizationId={organizationId}
      enabledContentTypes={enabledTypesRes.data || []}
    />
  );
}

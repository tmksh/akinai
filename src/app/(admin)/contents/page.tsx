import { redirect } from 'next/navigation';
import { getContents, getContentStats } from '@/lib/actions/contents';
import { getEnabledContentTypes } from '@/lib/actions/settings';
import { getAuthOrganization } from '@/lib/auth-helpers';
import ContentsClient from './contents-client';

export const dynamic = 'force-dynamic';

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
  
  const [contentsRes, stats, enabledTypesRes] = await Promise.all([
    getContents(organizationId, { limit: 50 }),
    getContentStats(organizationId),
    getEnabledContentTypes(organizationId),
  ]);

  return (
    <ContentsClient 
      initialContents={contentsRes.data || []} 
      stats={stats || { total: 0, published: 0, draft: 0, scheduled: 0 }}
      organizationId={organizationId}
      enabledContentTypes={enabledTypesRes.data || []}
    />
  );
}

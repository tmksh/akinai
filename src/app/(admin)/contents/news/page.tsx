import { redirect } from 'next/navigation';
import NewsClient from './news-client';
import { getContents } from '@/lib/actions/contents';
import { ensureDefaultOrganization } from '@/lib/actions/onboarding';
import { getAuthOrganization } from '@/lib/auth-helpers';

export default async function NewsPage() {
  const { user, organizationId } = await getAuthOrganization();

  if (!user) redirect('/login');
  if (!organizationId) {
    await ensureDefaultOrganization();
    redirect('/contents/news');
  }

  const { data } = await getContents(organizationId, { type: 'news' });

  return (
    <NewsClient
      organizationId={organizationId}
      initialNews={data ?? []}
    />
  );
}

import { redirect } from 'next/navigation';
import FeaturesClient from './features-client';
import { getContents } from '@/lib/actions/contents';
import { ensureDefaultOrganization } from '@/lib/actions/onboarding';
import { getAuthOrganization } from '@/lib/auth-helpers';

export default async function FeaturesPage() {
  const { user, organizationId } = await getAuthOrganization();

  if (!user) redirect('/login');
  if (!organizationId) {
    await ensureDefaultOrganization();
    redirect('/contents/features');
  }

  const { data } = await getContents(organizationId, { type: 'feature' });

  return (
    <FeaturesClient
      organizationId={organizationId}
      initialFeatures={data ?? []}
    />
  );
}

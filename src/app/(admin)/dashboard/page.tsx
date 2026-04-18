import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';
import { getDashboardData } from '@/lib/actions/dashboard';
import { ensureDefaultOrganization } from '@/lib/actions/onboarding';
import { getAuthOrganization } from '@/lib/auth-helpers';

export default async function DashboardPage() {
  const { user, organizationId } = await getAuthOrganization();

  if (!user) {
    redirect('/login');
  }

  if (!organizationId) {
    await ensureDefaultOrganization();
    redirect('/dashboard');
  }

  const data = await getDashboardData(organizationId);

  return <DashboardClient initialData={data} organizationId={organizationId} />;
}

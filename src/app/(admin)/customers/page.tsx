import { redirect } from 'next/navigation';
import CustomersClient from './customers-client';
import { getCustomers, getCustomerStats } from '@/lib/actions/customers';
import { getCustomerRoleLabels } from '@/lib/actions/settings';
import { ensureDefaultOrganization } from '@/lib/actions/onboarding';
import { getAuthOrganization } from '@/lib/auth-helpers';

export default async function CustomersPage() {
  const { user, organizationId } = await getAuthOrganization();

  if (!user) {
    redirect('/login');
  }

  if (!organizationId) {
    await ensureDefaultOrganization();
    redirect('/customers');
  }

  const [customersResult, statsResult, labelsResult] = await Promise.all([
    getCustomers(organizationId),
    getCustomerStats(organizationId),
    getCustomerRoleLabels(organizationId),
  ]);

  return (
    <CustomersClient
      initialCustomers={customersResult.data || []}
      initialStats={statsResult.data || null}
      initialRoleLabels={labelsResult.data}
    />
  );
}

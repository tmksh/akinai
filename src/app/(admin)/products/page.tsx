import { redirect } from 'next/navigation';
import ProductsClient from './products-client';
import { getProducts, getCategories } from '@/lib/actions/products';
import { ensureDefaultOrganization } from '@/lib/actions/onboarding';
import { getAuthOrganization } from '@/lib/auth-helpers';

export default async function ProductsPage() {
  const { user, organizationId } = await getAuthOrganization();

  if (!user) {
    redirect('/login');
  }

  if (!organizationId) {
    await ensureDefaultOrganization();
    redirect('/products');
  }

  const [p, c] = await Promise.all([
    getProducts(organizationId, { limit: 100 }),
    getCategories(organizationId),
  ]);

  return (
    <ProductsClient
      initialProducts={p.data || []}
      initialCategories={c.data || []}
      organizationId={organizationId}
      totalProducts={p.total}
    />
  );
}

import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { getProducts, getCategories } from '@/lib/actions/products';
import { getAuthOrganization } from '@/lib/auth-helpers';
import ProductsClient from './products-client';

const getCachedProducts = (orgId: string) =>
  unstable_cache(
    () => Promise.all([getProducts(orgId, { limit: 50 }), getCategories(orgId)]),
    ['products', orgId],
    { revalidate: 15 }
  )();

export default async function ProductsPage() {
  const { user, organizationId } = await getAuthOrganization();

  if (!user) {
    redirect('/login');
  }

  if (!organizationId) {
    return (
      <ProductsClient
        initialProducts={[]}
        initialCategories={[]}
        organizationId=""
        totalProducts={0}
      />
    );
  }

  const [productsRes, categoriesRes] = await getCachedProducts(organizationId);

  return (
    <ProductsClient
      initialProducts={productsRes.data || []}
      initialCategories={categoriesRes.data || []}
      organizationId={organizationId}
      totalProducts={productsRes.total}
    />
  );
}

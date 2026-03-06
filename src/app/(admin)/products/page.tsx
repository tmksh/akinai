import { redirect } from 'next/navigation';
import { getProducts, getCategories } from '@/lib/actions/products';
import { getAuthOrganization } from '@/lib/auth-helpers';
import ProductsClient from './products-client';

export const dynamic = 'force-dynamic';

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

  const [productsRes, categoriesRes] = await Promise.all([
    getProducts(organizationId, { limit: 50 }),
    getCategories(organizationId),
  ]);

  return (
    <ProductsClient
      initialProducts={productsRes.data || []}
      initialCategories={categoriesRes.data || []}
      organizationId={organizationId}
      totalProducts={productsRes.total}
    />
  );
}

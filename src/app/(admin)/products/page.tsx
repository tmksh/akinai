import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProducts, getCategories } from '@/lib/actions/products';
import ProductsClient from './products-client';

export default async function ProductsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('current_organization_id')
    .eq('id', user.id)
    .single();

  const organizationId = userData?.current_organization_id;

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

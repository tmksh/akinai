'use client';

import { useEffect, useState } from 'react';
import { useOrganization } from '@/components/providers/organization-provider';
import { getProducts, getCategories, type ProductWithRelations } from '@/lib/actions/products';
import type { Database } from '@/types/database';
import ProductsClient from './products-client';
import { Loader2 } from 'lucide-react';

type Category = Database['public']['Tables']['categories']['Row'];

export default function ProductsPage() {
  const { organization } = useOrganization();
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;
    Promise.all([
      getProducts(organization.id, { limit: 30 }),
      getCategories(organization.id),
    ]).then(([p, c]) => {
      if (cancelled) return;
      setProducts(p.data || []);
      setTotal(p.total);
      setCategories(c.data || []);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [organization?.id]);

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        <p className="text-sm text-muted-foreground">商品データを読み込み中...</p>
      </div>
    );
  }

  return (
    <ProductsClient
      initialProducts={products}
      initialCategories={categories}
      organizationId={organization?.id || ''}
      totalProducts={total}
    />
  );
}

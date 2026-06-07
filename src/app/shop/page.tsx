import ShopHomeClient from './shop-home-client';
import {
  getShopProducts,
  getShopCategories,
  getShopContents,
} from '@/lib/actions/shop';

export default async function StorePage() {
  const [
    featuredRes,
    newRes,
    categoriesRes,
    popularRes,
    contentsRes,
  ] = await Promise.all([
    getShopProducts({ featured: true, limit: 4 }),
    getShopProducts({ sortBy: 'new', limit: 4 }),
    getShopCategories(),
    getShopProducts({ sortBy: 'popular', limit: 4 }),
    getShopContents({ limit: 5 }),
  ]);

  const featured = featuredRes.data;
  const featuredProducts =
    featured && featured.length > 0 ? featured : newRes.data || [];

  return (
    <ShopHomeClient
      initialData={{
        featuredProducts,
        categories: categoriesRes.data || [],
        popularProducts: popularRes.data || [],
        contents: contentsRes.data || [],
      }}
    />
  );
}

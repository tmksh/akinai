import ShopLayoutClient from './shop-layout-client';
import { getShopOrganizationId } from '@/lib/actions/shop';
import { getShopTheme } from '@/lib/actions/settings';
import { DEFAULT_SHOP_THEME } from '@/types';

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgId = await getShopOrganizationId();
  const { data: theme } = orgId ? await getShopTheme(orgId) : { data: null };

  return (
    <ShopLayoutClient initialTheme={theme ?? DEFAULT_SHOP_THEME}>
      {children}
    </ShopLayoutClient>
  );
}

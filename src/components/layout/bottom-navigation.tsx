'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    title: 'ホーム',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    title: '商品',
    icon: Package,
    href: '/products',
  },
  {
    title: '注文',
    icon: ShoppingCart,
    href: '/orders',
  },
  {
    title: '顧客',
    icon: Users,
    href: '/customers',
  },
  {
    title: 'その他',
    icon: MoreHorizontal,
    href: '#more',
    isMore: true,
  },
];

export function BottomNavigation() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* フローティングボトムナビ */}
      <div className="mx-3 mb-3 rounded-2xl bg-background/95 backdrop-blur-lg border shadow-lg">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.isMore ? '#' : item.href}
                className={cn(
                  'flex flex-col items-center justify-center min-w-[4rem] py-1 px-2 rounded-xl transition-all',
                  active
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <item.icon className={cn('h-5 w-5', active && 'text-white')} />
                <span className={cn('text-[10px] mt-0.5 font-medium', active && 'text-white')}>
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom bg-transparent" />
    </nav>
  );
}



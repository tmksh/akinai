'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MoreHorizontal,
  X,
  Warehouse,
  FileText,
  FileQuestion,
  Building2,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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

const moreMenuItems = [
  {
    title: '在庫管理',
    icon: Warehouse,
    href: '/inventory',
    color: 'text-orange-500',
  },
  {
    title: 'コンテンツ',
    icon: FileText,
    href: '/contents',
    color: 'text-orange-500',
  },
  {
    title: '見積管理',
    icon: FileQuestion,
    href: '/quotes',
    color: 'text-orange-500',
  },
  {
    title: '代理店管理',
    icon: Building2,
    href: '/agents',
    color: 'text-orange-500',
  },
  {
    title: 'レポート',
    icon: BarChart3,
    href: '/reports',
    color: 'text-orange-500',
  },
  {
    title: '設定',
    icon: Settings,
    href: '/settings',
    color: 'text-slate-500',
  },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  // その他メニュー内のアイテムがアクティブかチェック
  const isMoreActive = moreMenuItems.some((item) => isActive(item.href));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* フローティングボトムナビ */}
        <div className="mx-3 mb-3 rounded-2xl bg-background/95 backdrop-blur-lg border shadow-lg">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const active = item.isMore ? isMoreActive : isActive(item.href);
              
              if (item.isMore) {
                return (
                  <button
                    key={item.href}
                    onClick={() => setIsMoreOpen(true)}
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
                  </button>
                );
              }
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
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

      {/* その他メニューシート */}
      <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-0 pb-safe">
          <SheetHeader className="px-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg font-bold">メニュー</SheetTitle>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </SheetHeader>
          
          <div className="grid grid-cols-3 gap-2 p-4">
            {moreMenuItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMoreOpen(false)}
                  className={cn(
                    'flex flex-col items-center justify-center p-4 rounded-2xl transition-all',
                    active
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md'
                      : 'bg-muted/50 hover:bg-muted'
                  )}
                >
                  <item.icon className={cn('h-6 w-6 mb-2', active ? 'text-white' : item.color)} />
                  <span className={cn('text-xs font-medium text-center', active && 'text-white')}>
                    {item.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}




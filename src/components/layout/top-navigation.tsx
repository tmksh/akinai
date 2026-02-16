'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  IoHome,
  IoCube,
  IoDocument,
  IoCart,
  IoBusiness,
  IoSettings,
  IoMenu,
  IoClose,
  IoNotifications,
  IoSunny,
  IoMoon,
  IoLogOut,
  IoPerson,
  IoChevronDown,
} from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOrganization } from '@/components/providers/organization-provider';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { IconType } from 'react-icons';

const navigationItems: {
  title: string;
  icon: IconType;
  href: string;
  badge?: number;
}[] = [
  { title: 'ホーム', icon: IoHome, href: '/dashboard' },
  { title: '商品管理', icon: IoCube, href: '/products' },
  { title: 'お知らせ', icon: IoDocument, href: '/contents' },
  { title: '注文管理', icon: IoCart, href: '/orders', badge: 3 },
  { title: '代理店', icon: IoBusiness, href: '/agents' },
  { title: '設定', icon: IoSettings, href: '/settings' },
];

function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <IoSunny className="h-4 w-4 rotate-0 scale-100 transition-all text-muted-foreground dark:-rotate-90 dark:scale-0" />
          <IoMoon className="absolute h-4 w-4 rotate-90 scale-0 transition-all text-muted-foreground dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          ライト
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          ダーク
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          システム
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ナビゲーションアイテムコンポーネント
function NavItem({ 
  item, 
  isActive, 
  size = 'default' 
}: { 
  item: typeof navigationItems[0]; 
  isActive: boolean;
  size?: 'default' | 'compact';
}) {
  const Icon = item.icon;
  const isCompact = size === 'compact';
  
  return (
    <Link
      href={item.href}
      className={cn(
        'flex flex-col items-center rounded-xl transition-all duration-200 relative group shrink-0',
        isCompact
          ? 'gap-1 px-2 py-2'
          : 'gap-1.5 px-3 py-2.5',
        isActive
          ? 'bg-orange-50 dark:bg-orange-950/30'
          : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
      )}
    >
      <div className="relative">
        <Icon className={cn(
          'transition-all',
          isCompact ? 'h-5 w-5' : 'h-6 w-6',
          isActive 
            ? 'text-orange-500 scale-110' 
            : 'text-slate-500 dark:text-slate-400 group-hover:text-orange-500'
        )} />
        {item.badge && (
          <Badge
            variant="destructive"
            className="absolute -right-2 -top-2 h-4 w-4 rounded-full p-0 text-[9px] flex items-center justify-center shadow-sm"
          >
            {item.badge}
          </Badge>
        )}
      </div>
      <span className={cn(
        'font-medium text-center leading-tight transition-colors',
        isCompact ? 'text-xs' : 'text-sm',
        isActive 
          ? 'text-orange-600 dark:text-orange-400' 
          : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
      )}>
        {item.title}
      </span>
      {isActive && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full" />
      )}
    </Link>
  );
}

export function TopNavigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser } = useOrganization();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        {/* メインヘッダー */}
        <div className="flex items-center justify-between h-16 md:h-20 px-3 md:px-4 lg:px-6">
          {/* ロゴ */}
          <Link href="/dashboard" className="flex items-center shrink-0">
            <img
              src="/logo-shou.png?v=2"
              alt="AKINAI"
              className="h-10 w-10 md:h-12 md:w-12 object-contain drop-shadow-md"
            />
          </Link>

          {/* デスクトップナビゲーション - xl (1280px以上) */}
          <nav className="hidden xl:flex items-center gap-0.5 flex-1 justify-center mx-4">
            {navigationItems.map((item) => (
              <NavItem 
                key={item.href} 
                item={item} 
                isActive={isActive(item.href)} 
                size="default"
              />
            ))}
          </nav>

          {/* タブレット/中画面ナビゲーション - lg (1024px〜1279px) */}
          <nav className="hidden lg:flex xl:hidden items-center gap-0.5 flex-1 justify-center mx-4">
            {navigationItems.map((item) => (
              <NavItem 
                key={item.href} 
                item={item} 
                isActive={isActive(item.href)} 
                size="compact"
              />
            ))}
          </nav>

          {/* 小タブレットナビゲーション - md (768px〜1023px) */}
          <nav className="hidden md:flex lg:hidden items-center gap-0.5 flex-1 justify-center mx-2 overflow-x-auto scrollbar-none">
            {navigationItems.map((item) => (
              <NavItem 
                key={item.href} 
                item={item} 
                isActive={isActive(item.href)} 
                size="compact"
              />
            ))}
          </nav>

          {/* 右側のアクション */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {/* 通知 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 md:h-9 md:w-9">
                  <IoNotifications className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-[9px] flex items-center justify-center"
                  >
                    3
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <span className="text-sm font-semibold">通知</span>
                  <Button variant="ghost" size="sm" className="text-xs text-orange-600 h-auto p-1">
                    既読にする
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                    <span className="text-sm font-medium">新規注文</span>
                    <span className="text-xs text-muted-foreground">AK-2024-0003</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
                    <span className="text-sm font-medium">在庫少</span>
                    <span className="text-xs text-muted-foreground">革財布 残り5点</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* テーマ切り替え - md以上で表示 */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            {/* ユーザーメニュー */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-1 md:gap-2 h-8 md:h-9 px-1.5 md:px-2">
                  <Avatar className="h-6 w-6 md:h-7 md:w-7">
                    <AvatarImage src={currentUser?.avatar ?? undefined} />
                    <AvatarFallback className="bg-orange-500 text-white text-[10px] md:text-xs">
                      {currentUser ? currentUser.name.slice(0, 2) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <IoChevronDown className="h-3 w-3 text-muted-foreground hidden lg:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b">
                  <p className="font-medium text-sm">{currentUser?.name ?? 'ユーザー'}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.email ?? ''}</p>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <IoPerson className="mr-2 h-4 w-4" />
                    プロフィール
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <IoSettings className="mr-2 h-4 w-4" />
                    アカウント設定
                  </Link>
                </DropdownMenuItem>
                {/* モバイルでのみテーマ切り替えを表示 */}
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem className="md:hidden" onClick={() => {}}>
                  <IoSunny className="mr-2 h-4 w-4" />
                  テーマ切り替え
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action="/auth/signout" method="post">
                  <button type="submit" className="w-full">
                    <DropdownMenuItem className="text-destructive cursor-pointer">
                      <IoLogOut className="mr-2 h-4 w-4" />
                      ログアウト
                    </DropdownMenuItem>
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* モバイルメニューボタン */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <IoClose className="h-5 w-5" />
              ) : (
                <IoMenu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* モバイルナビゲーション */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-4 gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all duration-200 relative',
                      active
                        ? 'bg-orange-50 dark:bg-orange-950/30'
                        : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                    )}
                  >
                    <div className="relative">
                      <Icon className={cn(
                        "h-5 w-5 transition-all",
                        active 
                          ? 'text-orange-500 scale-110' 
                          : 'text-slate-500 dark:text-slate-400'
                      )} />
                      {item.badge && (
                        <Badge
                          variant="destructive"
                          className="absolute -right-2 -top-2 h-3.5 w-3.5 rounded-full p-0 text-[8px] flex items-center justify-center shadow-sm"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium text-center leading-tight",
                      active 
                        ? 'text-orange-600 dark:text-orange-400' 
                        : 'text-slate-600 dark:text-slate-400'
                    )}>
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}

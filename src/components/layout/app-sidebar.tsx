'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Package,
  FileText,
  ShoppingCart,
  Users,
  FileQuestion,
  Settings,
  BarChart3,
  Warehouse,
  Newspaper,
  Star,
  ChevronDown,
  LogOut,
  User,
  Bell,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { currentUser } from '@/lib/mock-data';

const navigationItems = [
  {
    title: 'ダッシュボード',
    icon: LayoutDashboard,
    href: '/dashboard',
    color: 'text-rose-500',
    hoverClass: 'sidebar-hover-rose',
  },
  {
    title: '商品管理',
    icon: Package,
    href: '/products',
    color: 'text-orange-500',
    hoverClass: 'sidebar-hover-orange',
    items: [
      { title: '商品一覧', href: '/products' },
      { title: '商品登録', href: '/products/new' },
      { title: 'カテゴリー', href: '/products/categories' },
    ],
  },
  {
    title: '在庫管理',
    icon: Warehouse,
    href: '/inventory',
    color: 'text-amber-500',
    hoverClass: 'sidebar-hover-amber',
  },
  {
    title: 'コンテンツ',
    icon: FileText,
    href: '/contents',
    color: 'text-emerald-500',
    hoverClass: 'sidebar-hover-emerald',
    items: [
      { title: '記事一覧', href: '/contents' },
      { title: '記事作成', href: '/contents/new' },
      { title: 'ニュース', href: '/contents/news' },
      { title: '特集', href: '/contents/features' },
    ],
  },
  {
    title: '注文管理',
    icon: ShoppingCart,
    href: '/orders',
    color: 'text-teal-500',
    hoverClass: 'sidebar-hover-teal',
  },
  {
    title: '見積管理',
    icon: FileQuestion,
    href: '/quotes',
    color: 'text-cyan-500',
    hoverClass: 'sidebar-hover-cyan',
  },
  {
    title: '顧客管理',
    icon: Users,
    href: '/customers',
    color: 'text-blue-500',
    hoverClass: 'sidebar-hover-blue',
  },
];

const analyticsItems = [
  {
    title: 'レポート',
    icon: BarChart3,
    href: '/reports',
    color: 'text-violet-500',
    hoverClass: 'sidebar-hover-violet',
  },
];

const settingsItems = [
  {
    title: '設定',
    icon: Settings,
    href: '/settings',
    color: 'text-slate-500',
    hoverClass: 'sidebar-hover-slate',
    items: [
      { title: '基本設定', href: '/settings' },
      { title: 'ユーザー管理', href: '/settings/users' },
      { title: '機能設定', href: '/settings/features' },
    ],
  },
];

function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all text-muted-foreground dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all text-muted-foreground dark:rotate-0 dark:scale-100" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top">
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

export function AppSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="sidebar-accent-line">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand shadow-md">
            <Star className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              商い
            </span>
            <span className="text-xs text-muted-foreground">
              Akinai CMS
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel>メイン</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) =>
                item.items ? (
                  <Collapsible
                    key={item.href}
                    defaultOpen={isActive(item.href)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={isActive(item.href)}
                          className={item.hoverClass}
                        >
                          <item.icon className={`h-5 w-5 ${item.color}`} />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.href}
                                className={item.hoverClass}
                              >
                                <Link href={subItem.href}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive(item.href)}
                      className={item.hoverClass}
                    >
                      <Link href={item.href}>
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>分析</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.href)}
                    className={item.hoverClass}
                  >
                    <Link href={item.href}>
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>システム</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) =>
                item.items ? (
                  <Collapsible
                    key={item.href}
                    defaultOpen={isActive(item.href)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={isActive(item.href)}
                          className={item.hoverClass}
                        >
                          <item.icon className={`h-5 w-5 ${item.color}`} />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === subItem.href}
                                className={item.hoverClass}
                              >
                                <Link href={subItem.href}>{subItem.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive(item.href)}
                      className={item.hoverClass}
                    >
                      <Link href={item.href}>
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {/* 通知・テーマ切り替え */}
        <div className="flex items-center justify-between px-2 py-2 group-data-[collapsible=icon]:justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-4 w-4 rounded-full p-0 text-[9px] group-data-[collapsible=icon]:hidden"
                >
                  3
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-72">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-sm font-semibold">通知</span>
                <Button variant="ghost" size="sm" className="text-xs text-primary h-auto p-1">
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
          
          <ThemeToggle />
        </div>
        
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {currentUser.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm group-data-[collapsible=icon]:hidden">
                    <span className="font-medium">{currentUser.name}</span>
                    <span className="text-xs text-sidebar-foreground/60">
                      {currentUser.email}
                    </span>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  プロフィール
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  アカウント設定
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}


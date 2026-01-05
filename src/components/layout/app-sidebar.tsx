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
  Star,
  ChevronDown,
  LogOut,
  User,
  Bell,
  Moon,
  Sun,
  Building2,
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
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { currentUser } from '@/lib/mock-data';

const navigationItems = [
  {
    title: 'ダッシュボード',
    icon: LayoutDashboard,
    href: '/dashboard',
    color: 'text-zinc-600',
    hoverClass: 'sidebar-hover-slate',
  },
  {
    title: '商品管理',
    icon: Package,
    href: '/products',
    color: 'text-zinc-600',
    hoverClass: 'sidebar-hover-slate',
  },
  {
    title: '在庫管理',
    icon: Warehouse,
    href: '/inventory',
    color: 'text-zinc-600',
    hoverClass: 'sidebar-hover-slate',
  },
  {
    title: 'コンテンツ',
    icon: FileText,
    href: '/contents',
    color: 'text-zinc-600',
    hoverClass: 'sidebar-hover-slate',
  },
  {
    title: '注文管理',
    icon: ShoppingCart,
    href: '/orders',
    color: 'text-zinc-600',
    hoverClass: 'sidebar-hover-slate',
  },
  {
    title: '見積管理',
    icon: FileQuestion,
    href: '/quotes',
    color: 'text-zinc-600',
    hoverClass: 'sidebar-hover-slate',
  },
  {
    title: '顧客管理',
    icon: Users,
    href: '/customers',
    color: 'text-zinc-600',
    hoverClass: 'sidebar-hover-slate',
  },
  {
    title: '代理店管理',
    icon: Building2,
    href: '/agents',
    color: 'text-zinc-600',
    hoverClass: 'sidebar-hover-slate',
  },
];

const analyticsItems = [
  {
    title: 'レポート',
    icon: BarChart3,
    href: '/reports',
    color: 'text-zinc-600',
    hoverClass: 'sidebar-hover-slate',
  },
];

const settingsItems = [
  {
    title: '設定',
    icon: Settings,
    href: '/settings',
    color: 'text-slate-500',
    hoverClass: 'sidebar-hover-slate',
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
              アキナイ
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
              {navigationItems.map((item) => (
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
              {settingsItems.map((item) => (
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
                <form action="/auth/signout" method="post">
                  <button type="submit" className="w-full">
                    <DropdownMenuItem className="text-destructive cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      ログアウト
                    </DropdownMenuItem>
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}


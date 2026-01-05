'use client';

import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { setTheme, theme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b header-gradient px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-6" />
      
      {title && (
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      )}

      <div className="flex flex-1 items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <form className="ml-auto flex-1 sm:flex-initial">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="検索..."
              className="w-full bg-muted/50 pl-8 sm:w-[200px] md:w-[300px]"
            />
          </div>
        </form>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px]"
              >
                3
              </Badge>
              <span className="sr-only">通知</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <span className="font-semibold">通知</span>
              <Button variant="ghost" size="sm" className="text-xs text-primary">
                すべて既読にする
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-4">
                <span className="font-medium">新規注文がありました</span>
                <span className="text-xs text-muted-foreground">
                  注文番号 AK-2024-0003 が作成されました
                </span>
                <span className="text-xs text-muted-foreground">5分前</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-4">
                <span className="font-medium">在庫が少なくなっています</span>
                <span className="text-xs text-muted-foreground">
                  手作り革財布（ブラウン）の在庫が残り5点です
                </span>
                <span className="text-xs text-muted-foreground">1時間前</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 p-4">
                <span className="font-medium">見積が承認されました</span>
                <span className="text-xs text-muted-foreground">
                  QT-2024-0001 が株式会社サンプルに承認されました
                </span>
                <span className="text-xs text-muted-foreground">3時間前</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">テーマ切り替え</span>
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
      </div>
    </header>
  );
}


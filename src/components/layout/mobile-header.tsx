'use client';

import Link from 'next/link';
import { Star, Bell } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:hidden">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-9 w-9" />
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand shadow-sm">
            <Star className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
            アキナイ
          </span>
        </Link>
      </div>
      
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <Badge
                variant="destructive"
                className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[9px]"
              >
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
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
      </div>
    </header>
  );
}



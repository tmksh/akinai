'use client';

import { Users, Plus, Search, MoreHorizontal, Shield, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockUsers } from '@/lib/mock-data';

export default function UsersSettingsPage() {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'editor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理者';
      case 'editor':
        return '編集者';
      default:
        return '閲覧者';
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ユーザー管理</h1>
          <p className="text-muted-foreground">
            システムユーザーの管理を行います
          </p>
        </div>
        <Button className="gradient-brand text-white">
          <Plus className="mr-2 h-4 w-4" />
          ユーザーを招待
        </Button>
      </div>

      {/* 統計 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総ユーザー数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockUsers.length}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">管理者</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockUsers.filter((u) => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">アクティブ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {mockUsers.filter((u) => u.status === 'active').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ユーザー一覧 */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>ユーザー一覧</CardTitle>
          <CardDescription>登録されているユーザーを管理します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="ユーザー名・メールで検索..." className="pl-10" />
            </div>
          </div>

          <div className="space-y-4">
            {mockUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {user.name}
                      {user.role === 'admin' && (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleLabel(user.role)}
                  </Badge>
                  <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                    {user.status === 'active' ? 'アクティブ' : '無効'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>編集</DropdownMenuItem>
                      <DropdownMenuItem>権限変更</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



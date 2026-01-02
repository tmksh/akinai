'use client';

import { useState } from 'react';
import {
  Shield,
  Plus,
  MoreHorizontal,
  Users,
  Crown,
  UserCog,
  User,
  Eye,
  Pencil,
  Trash2,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageTabs } from '@/components/layout/page-tabs';
import { cn } from '@/lib/utils';

const settingsTabs = [
  { label: '基本設定', href: '/settings', exact: true },
  { label: '組織設定', href: '/settings/organization' },
  { label: 'ユーザー管理', href: '/settings/users' },
  { label: 'ロール管理', href: '/settings/roles' },
  { label: '権限マトリクス', href: '/settings/permissions' },
  { label: '機能設定', href: '/settings/features' },
  { label: '決済設定', href: '/settings/payments' },
];

// モックデータ
const mockRoles = [
  {
    id: '1',
    name: 'オーナー',
    description: '組織の全権限を持つ最上位ロール',
    color: 'from-amber-500 to-orange-500',
    icon: Crown,
    userCount: 1,
    isSystem: true,
    permissions: ['all'],
  },
  {
    id: '2',
    name: '管理者',
    description: '課金以外の全機能にアクセス可能',
    color: 'from-purple-500 to-violet-500',
    icon: Shield,
    userCount: 2,
    isSystem: true,
    permissions: ['products', 'orders', 'inventory', 'customers', 'contents', 'settings', 'users'],
  },
  {
    id: '3',
    name: 'マネージャー',
    description: '日常業務の管理を行うロール',
    color: 'from-blue-500 to-cyan-500',
    icon: UserCog,
    userCount: 3,
    isSystem: false,
    permissions: ['products', 'orders', 'inventory', 'customers'],
  },
  {
    id: '4',
    name: 'スタッフ',
    description: '注文処理と在庫確認のみ',
    color: 'from-emerald-500 to-teal-500',
    icon: User,
    userCount: 5,
    isSystem: false,
    permissions: ['orders.view', 'orders.process', 'inventory.view'],
  },
  {
    id: '5',
    name: '閲覧者',
    description: 'データの閲覧のみ可能',
    color: 'from-slate-400 to-slate-500',
    icon: Eye,
    userCount: 2,
    isSystem: false,
    permissions: ['*.view'],
  },
];

const permissionLabels: Record<string, string> = {
  all: 'すべての権限',
  products: '商品管理',
  orders: '注文管理',
  inventory: '在庫管理',
  customers: '顧客管理',
  contents: 'コンテンツ',
  settings: '設定',
  users: 'ユーザー管理',
  'orders.view': '注文閲覧',
  'orders.process': '注文処理',
  'inventory.view': '在庫閲覧',
  '*.view': '全データ閲覧',
};

export default function RolesSettingsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">設定</h1>
          <p className="text-muted-foreground">
            ユーザーの権限グループを管理します
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="btn-premium">
              <Plus className="mr-2 h-4 w-4" />
              新規ロール作成
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>新規ロール作成</DialogTitle>
              <DialogDescription>
                新しいロールを作成して、権限を設定します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">ロール名</Label>
                <Input id="name" placeholder="例: カスタマーサポート" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  placeholder="このロールの役割を説明してください"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>ベースロール（権限をコピー）</Label>
                <div className="grid grid-cols-2 gap-2">
                  {mockRoles.filter(r => !r.isSystem || r.name !== 'オーナー').map((role) => (
                    <Button
                      key={role.id}
                      variant="outline"
                      className="justify-start h-auto py-3"
                    >
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br mr-3",
                        role.color
                      )}>
                        <role.icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{role.name}</p>
                        <p className="text-xs text-muted-foreground">{role.userCount}人</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                キャンセル
              </Button>
              <Button className="btn-premium">
                作成して権限を設定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={settingsTabs} />

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="h-[100px] rounded-xl relative overflow-hidden bg-gradient-to-br from-violet-500 via-purple-500 to-purple-600 p-4 shadow-lg">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <Shield className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-medium">総ロール数</p>
            </div>
            <div className="text-2xl font-bold text-white">{mockRoles.length}</div>
          </div>
        </div>
        <div className="h-[100px] rounded-xl relative overflow-hidden bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-500 p-4 shadow-lg">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <Users className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-medium">総ユーザー数</p>
            </div>
            <div className="text-2xl font-bold text-white">
              {mockRoles.reduce((acc, r) => acc + r.userCount, 0)}
            </div>
          </div>
        </div>
        <div className="h-[100px] rounded-xl relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 p-4 shadow-lg">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <Crown className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-medium">システムロール</p>
            </div>
            <div className="text-2xl font-bold text-white">
              {mockRoles.filter(r => r.isSystem).length}
            </div>
          </div>
        </div>
        <div className="h-[100px] rounded-xl relative overflow-hidden bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500 p-4 shadow-lg">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
                <UserCog className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-medium">カスタムロール</p>
            </div>
            <div className="text-2xl font-bold text-white">
              {mockRoles.filter(r => !r.isSystem).length}
            </div>
          </div>
        </div>
      </div>

      {/* ロール一覧 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockRoles.map((role) => (
          <Card key={role.id} className="group overflow-hidden hover:shadow-lg transition-all">
            <div className={cn("h-2 bg-gradient-to-r", role.color)} />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                    role.color
                  )}>
                    <role.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {role.name}
                      {role.isSystem && (
                        <Badge variant="secondary" className="text-xs">
                          システム
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {role.description}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil className="mr-2 h-4 w-4" />
                      編集
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      複製
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Users className="mr-2 h-4 w-4" />
                      ユーザーを表示
                    </DropdownMenuItem>
                    {!role.isSystem && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          削除
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* ユーザー数 */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">割り当てユーザー</span>
                  <Badge variant="outline" className="font-semibold">
                    {role.userCount}人
                  </Badge>
                </div>

                {/* 権限タグ */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">付与権限</p>
                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.slice(0, 4).map((perm) => (
                      <Badge
                        key={perm}
                        variant="secondary"
                        className="text-xs font-normal"
                      >
                        {permissionLabels[perm] || perm}
                      </Badge>
                    ))}
                    {role.permissions.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{role.permissions.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* アクションボタン */}
                <Button variant="outline" className="w-full" size="sm">
                  権限を編集
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}



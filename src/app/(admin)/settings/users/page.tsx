'use client';

import { useState } from 'react';
import { Users, Plus, Search, MoreHorizontal, Shield, Mail, Check, Minus, X, Key, UserCog } from 'lucide-react';
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
import { mockUsers, mockRoles } from '@/lib/mock-data';
import { PageTabs } from '@/components/layout/page-tabs';
import { cn } from '@/lib/utils';

const settingsTabs = [
  { label: '基本設定', href: '/settings', exact: true },
  { label: '組織設定', href: '/settings/organization' },
  { label: 'ユーザー・権限', href: '/settings/users' },
  { label: '決済設定', href: '/settings/payments' },
];

type SubTabType = 'users' | 'roles' | 'permissions';

// 権限マトリクスデータ
const permissionCategories = [
  {
    name: '商品管理',
    permissions: [
      { id: 'products.view', name: '商品閲覧' },
      { id: 'products.create', name: '商品作成' },
      { id: 'products.edit', name: '商品編集' },
      { id: 'products.delete', name: '商品削除' },
    ],
  },
  {
    name: '注文管理',
    permissions: [
      { id: 'orders.view', name: '注文閲覧' },
      { id: 'orders.process', name: '注文処理' },
      { id: 'orders.cancel', name: '注文キャンセル' },
    ],
  },
  {
    name: '顧客管理',
    permissions: [
      { id: 'customers.view', name: '顧客閲覧' },
      { id: 'customers.edit', name: '顧客編集' },
    ],
  },
  {
    name: 'コンテンツ管理',
    permissions: [
      { id: 'content.view', name: 'コンテンツ閲覧' },
      { id: 'content.create', name: 'コンテンツ作成' },
      { id: 'content.publish', name: '公開設定' },
    ],
  },
  {
    name: 'システム設定',
    permissions: [
      { id: 'settings.view', name: '設定閲覧' },
      { id: 'settings.edit', name: '設定変更' },
      { id: 'users.manage', name: 'ユーザー管理' },
    ],
  },
];

const rolePermissions: Record<string, Record<string, 'full' | 'partial' | 'none'>> = {
  admin: {
    'products.view': 'full', 'products.create': 'full', 'products.edit': 'full', 'products.delete': 'full',
    'orders.view': 'full', 'orders.process': 'full', 'orders.cancel': 'full',
    'customers.view': 'full', 'customers.edit': 'full',
    'content.view': 'full', 'content.create': 'full', 'content.publish': 'full',
    'settings.view': 'full', 'settings.edit': 'full', 'users.manage': 'full',
  },
  editor: {
    'products.view': 'full', 'products.create': 'full', 'products.edit': 'full', 'products.delete': 'partial',
    'orders.view': 'full', 'orders.process': 'full', 'orders.cancel': 'partial',
    'customers.view': 'full', 'customers.edit': 'partial',
    'content.view': 'full', 'content.create': 'full', 'content.publish': 'partial',
    'settings.view': 'full', 'settings.edit': 'none', 'users.manage': 'none',
  },
  viewer: {
    'products.view': 'full', 'products.create': 'none', 'products.edit': 'none', 'products.delete': 'none',
    'orders.view': 'full', 'orders.process': 'none', 'orders.cancel': 'none',
    'customers.view': 'full', 'customers.edit': 'none',
    'content.view': 'full', 'content.create': 'none', 'content.publish': 'none',
    'settings.view': 'partial', 'settings.edit': 'none', 'users.manage': 'none',
  },
};

export default function UsersSettingsPage() {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('users');
  const [permissions, setPermissions] = useState(rolePermissions);

  const subTabs = [
    { key: 'users' as SubTabType, label: 'ユーザー管理', icon: Users },
    { key: 'roles' as SubTabType, label: 'ロール管理', icon: UserCog },
    { key: 'permissions' as SubTabType, label: '権限マトリクス', icon: Key },
  ];

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'editor': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '管理者';
      case 'editor': return '編集者';
      default: return '閲覧者';
    }
  };

  const handlePermissionToggle = (roleId: string, permissionId: string) => {
    setPermissions(prev => {
      const current = prev[roleId]?.[permissionId] || 'none';
      const next = current === 'full' ? 'partial' : current === 'partial' ? 'none' : 'full';
      return {
        ...prev,
        [roleId]: { ...prev[roleId], [permissionId]: next },
      };
    });
  };

  const getPermissionIcon = (status: 'full' | 'partial' | 'none') => {
    switch (status) {
      case 'full': return <Check className="h-4 w-4 text-emerald-500" />;
      case 'partial': return <Minus className="h-4 w-4 text-amber-500" />;
      case 'none': return <X className="h-4 w-4 text-slate-300" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">設定</h1>
          <p className="text-muted-foreground">
            ユーザーと権限の管理を行います
          </p>
        </div>
        {activeSubTab === 'users' && (
          <Button className="btn-premium">
            <Plus className="mr-2 h-4 w-4" />
            ユーザー登録
          </Button>
        )}
        {activeSubTab === 'roles' && (
          <Button className="btn-premium">
            <Plus className="mr-2 h-4 w-4" />
            ロール作成
          </Button>
        )}
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={settingsTabs} />

      {/* サブタブ */}
      <div className="flex items-center gap-2 border-b">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors",
                activeSubTab === tab.key
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ユーザー管理タブ */}
      {activeSubTab === 'users' && (
        <>
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
                  {mockUsers.filter((u) => u.isActive).length}
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
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'アクティブ' : '無効'}
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
        </>
      )}

      {/* ロール管理タブ */}
      {activeSubTab === 'roles' && (
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>ロール一覧</CardTitle>
            <CardDescription>システムで使用できるロールを管理します</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      role.id === 'admin' ? "bg-orange-100 text-orange-600" :
                      role.id === 'editor' ? "bg-blue-100 text-blue-600" :
                      "bg-slate-100 text-slate-600"
                    )}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{role.name}</div>
                      <div className="text-sm text-muted-foreground">{role.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary">
                      {mockUsers.filter(u => u.role === role.id).length}人
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>編集</DropdownMenuItem>
                        <DropdownMenuItem>権限を設定</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">削除</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 権限マトリクスタブ */}
      {activeSubTab === 'permissions' && (
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>権限マトリクス</CardTitle>
            <CardDescription>各ロールの権限設定を一覧で確認・編集できます（クリックで切り替え）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">権限</th>
                    {mockRoles.map(role => (
                      <th key={role.id} className="text-center py-3 px-4 font-medium min-w-[100px]">
                        {role.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionCategories.map((category) => (
                    <>
                      <tr key={category.name} className="bg-muted/30">
                        <td colSpan={mockRoles.length + 1} className="py-2 px-4 font-semibold text-sm">
                          {category.name}
                        </td>
                      </tr>
                      {category.permissions.map((permission) => (
                        <tr key={permission.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 text-sm">{permission.name}</td>
                          {mockRoles.map(role => (
                            <td key={role.id} className="text-center py-3 px-4">
                              <button
                                onClick={() => handlePermissionToggle(role.id, permission.id)}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                              >
                                {getPermissionIcon(permissions[role.id]?.[permission.id] || 'none')}
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>フルアクセス</span>
              </div>
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-amber-500" />
                <span>一部制限</span>
              </div>
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-slate-300" />
                <span>アクセス不可</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}




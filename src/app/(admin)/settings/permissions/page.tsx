'use client';

import { useState } from 'react';
import {
  Shield,
  Check,
  X,
  Minus,
  Package,
  ShoppingCart,
  Warehouse,
  Users,
  FileText,
  Settings,
  CreditCard,
  BarChart3,
  Crown,
  UserCog,
  User,
  Eye,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ロール定義
const roles = [
  { id: 'owner', name: 'オーナー', icon: Crown, color: 'from-amber-500 to-orange-500' },
  { id: 'admin', name: '管理者', icon: Shield, color: 'from-purple-500 to-violet-500' },
  { id: 'manager', name: 'マネージャー', icon: UserCog, color: 'from-blue-500 to-cyan-500' },
  { id: 'staff', name: 'スタッフ', icon: User, color: 'from-emerald-500 to-teal-500' },
  { id: 'viewer', name: '閲覧者', icon: Eye, color: 'from-slate-400 to-slate-500' },
];

// 権限カテゴリ
const permissionCategories = [
  {
    id: 'products',
    name: '商品管理',
    icon: Package,
    permissions: [
      { id: 'products.view', name: '閲覧' },
      { id: 'products.create', name: '作成' },
      { id: 'products.edit', name: '編集' },
      { id: 'products.delete', name: '削除' },
    ],
  },
  {
    id: 'orders',
    name: '注文管理',
    icon: ShoppingCart,
    permissions: [
      { id: 'orders.view', name: '閲覧' },
      { id: 'orders.process', name: '処理' },
      { id: 'orders.edit', name: '編集' },
      { id: 'orders.cancel', name: 'キャンセル' },
      { id: 'orders.refund', name: '返金' },
    ],
  },
  {
    id: 'inventory',
    name: '在庫管理',
    icon: Warehouse,
    permissions: [
      { id: 'inventory.view', name: '閲覧' },
      { id: 'inventory.adjust', name: '調整' },
      { id: 'inventory.transfer', name: '移動' },
    ],
  },
  {
    id: 'customers',
    name: '顧客管理',
    icon: Users,
    permissions: [
      { id: 'customers.view', name: '閲覧' },
      { id: 'customers.create', name: '作成' },
      { id: 'customers.edit', name: '編集' },
      { id: 'customers.delete', name: '削除' },
    ],
  },
  {
    id: 'contents',
    name: 'コンテンツ',
    icon: FileText,
    permissions: [
      { id: 'contents.view', name: '閲覧' },
      { id: 'contents.create', name: '作成' },
      { id: 'contents.edit', name: '編集' },
      { id: 'contents.publish', name: '公開' },
      { id: 'contents.delete', name: '削除' },
    ],
  },
  {
    id: 'analytics',
    name: 'レポート',
    icon: BarChart3,
    permissions: [
      { id: 'analytics.view', name: '閲覧' },
      { id: 'analytics.export', name: 'エクスポート' },
    ],
  },
  {
    id: 'settings',
    name: '設定',
    icon: Settings,
    permissions: [
      { id: 'settings.view', name: '閲覧' },
      { id: 'settings.edit', name: '編集' },
      { id: 'settings.users', name: 'ユーザー管理' },
      { id: 'settings.roles', name: 'ロール管理' },
    ],
  },
  {
    id: 'billing',
    name: '課金',
    icon: CreditCard,
    permissions: [
      { id: 'billing.view', name: '閲覧' },
      { id: 'billing.manage', name: '管理' },
    ],
  },
];

// 権限マトリクス（モックデータ）
const permissionMatrix: Record<string, Record<string, 'full' | 'partial' | 'none'>> = {
  owner: {
    'products.view': 'full', 'products.create': 'full', 'products.edit': 'full', 'products.delete': 'full',
    'orders.view': 'full', 'orders.process': 'full', 'orders.edit': 'full', 'orders.cancel': 'full', 'orders.refund': 'full',
    'inventory.view': 'full', 'inventory.adjust': 'full', 'inventory.transfer': 'full',
    'customers.view': 'full', 'customers.create': 'full', 'customers.edit': 'full', 'customers.delete': 'full',
    'contents.view': 'full', 'contents.create': 'full', 'contents.edit': 'full', 'contents.publish': 'full', 'contents.delete': 'full',
    'analytics.view': 'full', 'analytics.export': 'full',
    'settings.view': 'full', 'settings.edit': 'full', 'settings.users': 'full', 'settings.roles': 'full',
    'billing.view': 'full', 'billing.manage': 'full',
  },
  admin: {
    'products.view': 'full', 'products.create': 'full', 'products.edit': 'full', 'products.delete': 'full',
    'orders.view': 'full', 'orders.process': 'full', 'orders.edit': 'full', 'orders.cancel': 'full', 'orders.refund': 'full',
    'inventory.view': 'full', 'inventory.adjust': 'full', 'inventory.transfer': 'full',
    'customers.view': 'full', 'customers.create': 'full', 'customers.edit': 'full', 'customers.delete': 'full',
    'contents.view': 'full', 'contents.create': 'full', 'contents.edit': 'full', 'contents.publish': 'full', 'contents.delete': 'full',
    'analytics.view': 'full', 'analytics.export': 'full',
    'settings.view': 'full', 'settings.edit': 'full', 'settings.users': 'full', 'settings.roles': 'partial',
    'billing.view': 'full', 'billing.manage': 'none',
  },
  manager: {
    'products.view': 'full', 'products.create': 'full', 'products.edit': 'full', 'products.delete': 'partial',
    'orders.view': 'full', 'orders.process': 'full', 'orders.edit': 'full', 'orders.cancel': 'full', 'orders.refund': 'partial',
    'inventory.view': 'full', 'inventory.adjust': 'full', 'inventory.transfer': 'full',
    'customers.view': 'full', 'customers.create': 'full', 'customers.edit': 'full', 'customers.delete': 'none',
    'contents.view': 'full', 'contents.create': 'full', 'contents.edit': 'full', 'contents.publish': 'partial', 'contents.delete': 'none',
    'analytics.view': 'full', 'analytics.export': 'partial',
    'settings.view': 'partial', 'settings.edit': 'none', 'settings.users': 'none', 'settings.roles': 'none',
    'billing.view': 'none', 'billing.manage': 'none',
  },
  staff: {
    'products.view': 'full', 'products.create': 'none', 'products.edit': 'none', 'products.delete': 'none',
    'orders.view': 'full', 'orders.process': 'full', 'orders.edit': 'partial', 'orders.cancel': 'none', 'orders.refund': 'none',
    'inventory.view': 'full', 'inventory.adjust': 'partial', 'inventory.transfer': 'none',
    'customers.view': 'full', 'customers.create': 'none', 'customers.edit': 'none', 'customers.delete': 'none',
    'contents.view': 'full', 'contents.create': 'none', 'contents.edit': 'none', 'contents.publish': 'none', 'contents.delete': 'none',
    'analytics.view': 'partial', 'analytics.export': 'none',
    'settings.view': 'none', 'settings.edit': 'none', 'settings.users': 'none', 'settings.roles': 'none',
    'billing.view': 'none', 'billing.manage': 'none',
  },
  viewer: {
    'products.view': 'full', 'products.create': 'none', 'products.edit': 'none', 'products.delete': 'none',
    'orders.view': 'full', 'orders.process': 'none', 'orders.edit': 'none', 'orders.cancel': 'none', 'orders.refund': 'none',
    'inventory.view': 'full', 'inventory.adjust': 'none', 'inventory.transfer': 'none',
    'customers.view': 'full', 'customers.create': 'none', 'customers.edit': 'none', 'customers.delete': 'none',
    'contents.view': 'full', 'contents.create': 'none', 'contents.edit': 'none', 'contents.publish': 'none', 'contents.delete': 'none',
    'analytics.view': 'full', 'analytics.export': 'none',
    'settings.view': 'none', 'settings.edit': 'none', 'settings.users': 'none', 'settings.roles': 'none',
    'billing.view': 'none', 'billing.manage': 'none',
  },
};

// 権限表示コンポーネント
function PermissionCell({ status, onClick }: { status: 'full' | 'partial' | 'none'; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
        status === 'full' && "bg-emerald-100 text-emerald-600 hover:bg-emerald-200",
        status === 'partial' && "bg-amber-100 text-amber-600 hover:bg-amber-200",
        status === 'none' && "bg-slate-100 text-slate-400 hover:bg-slate-200",
      )}
    >
      {status === 'full' && <Check className="h-4 w-4" />}
      {status === 'partial' && <Minus className="h-4 w-4" />}
      {status === 'none' && <X className="h-4 w-4" />}
    </button>
  );
}

export default function PermissionsSettingsPage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">権限マトリクス</h1>
          <p className="text-muted-foreground">
            各ロールの詳細な権限を管理します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedRole || ''} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="ロールを選択..." />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  <div className="flex items-center gap-2">
                    <div className={cn("h-4 w-4 rounded bg-gradient-to-br", role.color)} />
                    {role.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline">変更を保存</Button>
        </div>
      </div>

      {/* 凡例 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
                <Check className="h-3 w-3 text-emerald-600" />
              </div>
              <span>フルアクセス</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center">
                <Minus className="h-3 w-3 text-amber-600" />
              </div>
              <span>制限付き</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                <X className="h-3 w-3 text-slate-400" />
              </div>
              <span>アクセス不可</span>
            </div>
            <div className="ml-auto flex items-center gap-1 text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>セルをクリックして権限を変更</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 権限マトリクステーブル */}
      <Card>
        <CardHeader>
          <CardTitle>権限一覧</CardTitle>
          <CardDescription>各機能に対するロールごとのアクセス権限</CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground w-[200px]">
                      機能
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground w-[120px]">
                      権限
                    </th>
                    {roles.map((role) => (
                      <th key={role.id} className="text-center py-3 px-2 min-w-[80px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex flex-col items-center gap-1 cursor-help">
                              <div className={cn(
                                "h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
                                role.color
                              )}>
                                <role.icon className="h-4 w-4 text-white" />
                              </div>
                              <span className="text-xs font-medium">{role.name}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{role.name}ロールの権限</p>
                          </TooltipContent>
                        </Tooltip>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissionCategories.map((category, categoryIndex) => (
                    <>
                      {category.permissions.map((permission, permIndex) => (
                        <tr
                          key={permission.id}
                          className={cn(
                            "border-b last:border-0 hover:bg-muted/30 transition-colors",
                            permIndex === 0 && categoryIndex > 0 && "border-t-2"
                          )}
                        >
                          {permIndex === 0 && (
                            <td
                              rowSpan={category.permissions.length}
                              className="py-3 px-4 align-top border-r bg-muted/20"
                            >
                              <div className="flex items-center gap-2">
                                <category.icon className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{category.name}</span>
                              </div>
                            </td>
                          )}
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {permission.name}
                          </td>
                          {roles.map((role) => (
                            <td key={`${role.id}-${permission.id}`} className="py-3 px-2 text-center">
                              <div className="flex justify-center">
                                <PermissionCell
                                  status={permissionMatrix[role.id][permission.id]}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* ロール別サマリー */}
      <div className="grid gap-4 md:grid-cols-5">
        {roles.map((role) => {
          const fullCount = Object.values(permissionMatrix[role.id]).filter(v => v === 'full').length;
          const partialCount = Object.values(permissionMatrix[role.id]).filter(v => v === 'partial').length;
          const totalPerms = Object.keys(permissionMatrix[role.id]).length;
          const percentage = Math.round((fullCount + partialCount * 0.5) / totalPerms * 100);

          return (
            <Card key={role.id} className="overflow-hidden">
              <div className={cn("h-1.5 bg-gradient-to-r", role.color)} />
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn(
                    "h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
                    role.color
                  )}>
                    <role.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{role.name}</p>
                    <p className="text-xs text-muted-foreground">アクセス率 {percentage}%</p>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full bg-gradient-to-r", role.color)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span className="text-emerald-600">{fullCount} フル</span>
                  <span className="text-amber-600">{partialCount} 制限</span>
                  <span>{totalPerms - fullCount - partialCount} 不可</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


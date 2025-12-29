'use client';

import { useState } from 'react';
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Upload,
  Trash2,
  Users,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// モックデータ
const organization = {
  id: 'org_123',
  name: '商い サンプルストア',
  slug: 'sample-store',
  logo: null,
  email: 'contact@sample-store.jp',
  phone: '03-1234-5678',
  website: 'https://sample-store.jp',
  address: '東京都渋谷区神宮前1-2-3',
  plan: 'pro',
  createdAt: '2024-01-15',
  ownerId: 'user_1',
  ownerName: '山田 太郎',
  ownerEmail: 'yamada@sample-store.jp',
  memberCount: 8,
  memberLimit: 10,
};

const plans = [
  {
    id: 'starter',
    name: 'スターター',
    price: 0,
    description: '個人や小規模ビジネス向け',
    icon: Zap,
    color: 'from-slate-400 to-slate-500',
    features: ['ユーザー2名まで', '商品100件まで', '基本レポート', 'メールサポート'],
  },
  {
    id: 'pro',
    name: 'プロ',
    price: 4980,
    description: '成長中のビジネス向け',
    icon: Sparkles,
    color: 'from-blue-500 to-cyan-500',
    popular: true,
    features: ['ユーザー10名まで', '商品無制限', '高度なレポート', '優先サポート', 'API アクセス'],
  },
  {
    id: 'enterprise',
    name: 'エンタープライズ',
    price: 19800,
    description: '大規模組織向け',
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    features: ['ユーザー無制限', '全機能アクセス', 'カスタムレポート', '専任サポート', 'SLA保証', 'SSO対応'],
  },
];

const usageStats = {
  users: { current: 8, limit: 10 },
  products: { current: 156, limit: null },
  orders: { current: 1234, limit: null },
  storage: { current: 2.4, limit: 10, unit: 'GB' },
};

export default function OrganizationSettingsPage() {
  const [isEditing, setIsEditing] = useState(false);

  const currentPlan = plans.find(p => p.id === organization.plan);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">組織設定</h1>
          <p className="text-muted-foreground">
            組織の基本情報とプランを管理します
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左カラム: 組織情報 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>基本情報</CardTitle>
                  <CardDescription>組織の基本的な情報を設定します</CardDescription>
                </div>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? '保存' : '編集'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ロゴ */}
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20 rounded-xl">
                  <AvatarImage src={organization.logo || undefined} />
                  <AvatarFallback className="rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 text-white text-2xl">
                    {organization.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">組織ロゴ</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={!isEditing}>
                      <Upload className="mr-2 h-4 w-4" />
                      アップロード
                    </Button>
                    <Button variant="ghost" size="sm" disabled={!isEditing}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* フォーム */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">組織名</Label>
                  <Input
                    id="name"
                    defaultValue={organization.name}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL スラッグ</Label>
                  <div className="flex items-center">
                    <span className="text-sm text-muted-foreground mr-1">akinai.jp/</span>
                    <Input
                      id="slug"
                      defaultValue={organization.slug}
                      disabled={!isEditing}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      defaultValue={organization.email}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">電話番号</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      defaultValue={organization.phone}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">ウェブサイト</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      defaultValue={organization.website}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">住所</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="address"
                      defaultValue={organization.address}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* オーナー情報 */}
          <Card>
            <CardHeader>
              <CardTitle>オーナー情報</CardTitle>
              <CardDescription>組織のオーナーアカウント</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200/50">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{organization.ownerName}</p>
                    <p className="text-sm text-muted-foreground">{organization.ownerEmail}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  オーナー変更
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 危険な操作 */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">危険な操作</CardTitle>
              <CardDescription>これらの操作は取り消しできません</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div>
                  <p className="font-medium">組織を削除</p>
                  <p className="text-sm text-muted-foreground">
                    すべてのデータが完全に削除されます
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  組織を削除
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右カラム: プランと使用状況 */}
        <div className="space-y-6">
          {/* 現在のプラン */}
          <Card className="overflow-hidden">
            <div className={cn("h-2 bg-gradient-to-r", currentPlan?.color)} />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                現在のプラン
                <Badge className={cn("bg-gradient-to-r text-white border-0", currentPlan?.color)}>
                  {currentPlan?.name}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">¥{currentPlan?.price.toLocaleString()}</span>
                <span className="text-muted-foreground">/月</span>
              </div>
              <div className="space-y-2">
                {currentPlan?.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full" variant="outline">
                プランを変更
              </Button>
            </CardContent>
          </Card>

          {/* 使用状況 */}
          <Card>
            <CardHeader>
              <CardTitle>使用状況</CardTitle>
              <CardDescription>今月の利用状況</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ユーザー数 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">ユーザー</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {usageStats.users.current} / {usageStats.users.limit}
                  </span>
                </div>
                <Progress
                  value={(usageStats.users.current / usageStats.users.limit) * 100}
                  className="h-2"
                />
                {usageStats.users.current >= usageStats.users.limit * 0.8 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    上限に近づいています
                  </p>
                )}
              </div>

              {/* ストレージ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">ストレージ</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {usageStats.storage.current} / {usageStats.storage.limit} {usageStats.storage.unit}
                  </span>
                </div>
                <Progress
                  value={(usageStats.storage.current / usageStats.storage.limit) * 100}
                  className="h-2"
                />
              </div>

              <Separator />

              {/* 統計 */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{usageStats.products.current}</p>
                  <p className="text-xs text-muted-foreground">商品数</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{usageStats.orders.current.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">今月の注文</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 請求情報 */}
          <Card>
            <CardHeader>
              <CardTitle>請求情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">次回請求日</span>
                <span className="font-medium">2025年1月15日</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">支払い方法</span>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span>•••• 4242</span>
                </div>
              </div>
              <Button variant="outline" className="w-full" size="sm">
                請求履歴を見る
              </Button>
            </CardContent>
          </Card>

          {/* 組織作成日 */}
          <div className="text-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 inline-block mr-1" />
            作成日: {new Date(organization.createdAt).toLocaleDateString('ja-JP')}
          </div>
        </div>
      </div>
    </div>
  );
}


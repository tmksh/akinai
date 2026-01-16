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
  Link2,
  Key,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
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
import { PageTabs } from '@/components/layout/page-tabs';
import { cn } from '@/lib/utils';

const settingsTabs = [
  { label: '基本設定', href: '/settings', exact: true },
  { label: '組織設定', href: '/settings/organization' },
  { label: 'ユーザー・権限', href: '/settings/users' },
  { label: '決済設定', href: '/settings/payments' },
];

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
  // フロントエンド連携
  frontendUrl: 'https://shop.sample-store.jp',
  frontendApiKey: 'sk_live_xxxxxxxxxxxxxxxxxxxx',
  // プラン
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
  const [showApiKey, setShowApiKey] = useState(false);
  const [frontendUrl, setFrontendUrl] = useState(organization.frontendUrl);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'success' | 'error'>('none');

  const currentPlan = plans.find(p => p.id === organization.plan);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('none');
    // 実際にはAPIで接続テストを行う
    await new Promise(resolve => setTimeout(resolve, 1500));
    setConnectionStatus('success');
    setIsTestingConnection(false);
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(organization.frontendApiKey);
    // トースト通知を出す（実装省略）
  };

  const handleRegenerateApiKey = () => {
    // 確認ダイアログを表示して再生成
    if (confirm('APIキーを再生成しますか？既存の連携が切断されます。')) {
      // API呼び出し
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">設定</h1>
          <p className="text-muted-foreground">
            組織の基本情報とプランを管理します
          </p>
        </div>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={settingsTabs} />

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

          {/* フロントエンド連携 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-orange-500" />
                    フロントエンド連携
                  </CardTitle>
                  <CardDescription>ECサイトとの連携設定を管理します</CardDescription>
                </div>
                {connectionStatus === 'success' && (
                  <Badge className="bg-emerald-500 text-white">接続済み</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* フロントエンドURL */}
              <div className="space-y-2">
                <Label htmlFor="frontendUrl">フロントエンドURL</Label>
                <p className="text-xs text-muted-foreground">
                  商品・コンテンツのプレビュー表示に使用されます
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="frontendUrl"
                      value={frontendUrl}
                      onChange={(e) => setFrontendUrl(e.target.value)}
                      placeholder="https://your-shop.com"
                      className="pl-10"
                    />
                  </div>
                  {frontendUrl && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={frontendUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              {/* APIキー */}
              <div className="space-y-2">
                <Label htmlFor="apiKey">APIキー</Label>
                <p className="text-xs text-muted-foreground">
                  フロントエンドからのAPI認証に使用します。外部に公開しないでください。
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={organization.frontendApiKey}
                      readOnly
                      className="pl-10 pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button variant="outline" size="icon" onClick={handleCopyApiKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleRegenerateApiKey}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* 接続テスト */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border">
                <div>
                  <p className="font-medium">接続テスト</p>
                  <p className="text-sm text-muted-foreground">
                    フロントエンドとの接続状態を確認します
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {connectionStatus === 'success' && (
                    <span className="text-sm text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      接続成功
                    </span>
                  )}
                  {connectionStatus === 'error' && (
                    <span className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      接続失敗
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection || !frontendUrl}
                  >
                    {isTestingConnection ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        テスト中...
                      </>
                    ) : (
                      'テスト実行'
                    )}
                  </Button>
                </div>
              </div>

              {/* 使用方法ヒント */}
              <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                  プレビュー機能について
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  商品やコンテンツの編集画面で「プレビュー」を有効にすると、
                  ここで設定したフロントエンドURLに接続して実際の表示を確認できます。
                  フロントエンド側で <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">/preview/products/[id]</code> と
                  <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">/preview/contents/[id]</code> エンドポイントを実装してください。
                </p>
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




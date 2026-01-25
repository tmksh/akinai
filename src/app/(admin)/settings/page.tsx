'use client';

import { Building2, Key, Users, Bell, Palette, CreditCard, ExternalLink, Store, User, Webhook } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/components/providers/organization-provider';

const settingsCategories = [
  {
    title: '組織設定',
    description: '店舗名、住所、ロゴなどの基本情報を設定',
    href: '/settings/organization',
    icon: Building2,
    badge: null,
  },
  {
    title: 'ショップテーマ',
    description: 'ショップのデザイン・レイアウトをカスタマイズ',
    href: '/settings/shop-theme',
    icon: Store,
    badge: 'NEW',
  },
  {
    title: 'アカウント設定',
    description: 'パスワード変更、通知設定、セキュリティ',
    href: '/account',
    icon: User,
    badge: null,
  },
  {
    title: 'API設定',
    description: '外部連携用のAPIキーを発行・管理',
    href: '/settings/api',
    icon: Key,
    badge: '重要',
  },
  {
    title: 'メンバー管理',
    description: 'チームメンバーの招待・権限管理',
    href: '/settings/members',
    icon: Users,
    badge: null,
  },
  {
    title: '通知設定',
    description: 'メール通知やアラートの設定',
    href: '/settings/notifications',
    icon: Bell,
    badge: null,
  },
  {
    title: 'Webhook設定',
    description: '外部サービスへのイベント通知',
    href: '/settings/webhooks',
    icon: Webhook,
    badge: null,
  },
  {
    title: '管理画面テーマ',
    description: '管理画面のカラーテーマを変更',
    href: '/settings/theme',
    icon: Palette,
    badge: null,
  },
  {
    title: '請求・プラン',
    description: 'プランの確認・変更、請求履歴',
    href: '/settings/billing',
    icon: CreditCard,
    badge: null,
  },
];

export default function SettingsPage() {
  const { organization } = useOrganization();

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-muted-foreground">
          {organization?.name || 'ストア'}の各種設定を管理します
        </p>
      </div>

      {/* 設定カテゴリー */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsCategories.map((category) => {
          const Icon = category.icon;

          return (
            <Link key={category.href} href={category.href}>
              <Card className="card-hover h-full cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base">{category.title}</CardTitle>
                    </div>
                    {category.badge && (
                      <Badge variant="default" className="text-xs bg-orange-500">
                        {category.badge}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="flex items-center gap-1">
                    {category.description}
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 現在のプラン情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">現在のプラン</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium capitalize">{organization?.plan || 'Starter'} プラン</p>
              <p className="text-sm text-muted-foreground">
                すべての基本機能が利用可能です
              </p>
            </div>
            <Badge variant="outline" className="capitalize">
              {organization?.plan || 'starter'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

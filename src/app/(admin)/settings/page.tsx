'use client';

import { Building2, Key, Users, CreditCard, ExternalLink, ToggleLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/components/providers/organization-provider';

const settingsCategories = [
  {
    section: 'ストア設定',
    items: [
      {
        title: '組織設定',
        description: '店舗名・住所・ロゴ・テーマなど基本情報を設定',
        href: '/settings/organization',
        icon: Building2,
        badge: null,
      },
      {
        title: '機能設定',
        description: '通知BOX・紹介コード・コンテンツタイプなど機能のON/OFFを管理',
        href: '/settings/features',
        icon: ToggleLeft,
        badge: null,
      },
    ],
  },
  {
    section: 'チーム・アカウント',
    items: [
      {
        title: 'メンバー管理',
        description: 'チームメンバーの招待・権限管理',
        href: '/settings/members',
        icon: Users,
        badge: null,
      },
    ],
  },
  {
    section: 'メール・通知',
    items: [
      {
        title: 'メール設定',
        description: 'ドメイン認証・テンプレート・通知アラートをまとめて管理',
        href: '/settings/notifications',
        icon: Mail,
        badge: null,
      },
    ],
  },
  {
    section: '連携・開発',
    items: [
      {
        title: 'API・Webhook',
        description: 'APIキーの発行・管理、外部サービスへのイベント通知',
        href: '/settings/api',
        icon: Key,
        badge: '重要',
      },
    ],
  },
  {
    section: '決済',
    items: [
      {
        title: '決済設定',
        description: 'Stripe連携・決済方法・銀行振込口座の設定',
        href: '/settings/payments',
        icon: CreditCard,
        badge: null,
      },
    ],
  },
];

export default function SettingsPage() {
  const { organization } = useOrganization();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-muted-foreground">
          {organization?.name || 'ストア'}の各種設定を管理します
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsCategories.flatMap((section) =>
          section.items.map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.href!} href={category.href!}>
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
                        <Badge variant="default" className="text-xs bg-sky-500">
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
          })
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ArrowLeft, CreditCard, Check, Zap, Crown, Building2, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrganization } from '@/components/providers/organization-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    description: '個人や小規模ビジネス向け',
    price: 0,
    priceLabel: '無料',
    icon: Zap,
    features: [
      '商品登録 50件まで',
      '月間注文 100件まで',
      'メンバー 1人',
      '基本的なサポート',
    ],
    limitations: [
      'API連携なし',
      '代理店機能なし',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: '成長中のビジネス向け',
    price: 2980,
    priceLabel: '¥2,980/月',
    icon: Crown,
    popular: true,
    features: [
      '商品登録 無制限',
      '月間注文 無制限',
      'メンバー 5人まで',
      'API連携',
      '優先サポート',
      '分析レポート',
    ],
    limitations: [],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: '大規模ビジネス向け',
    price: 9800,
    priceLabel: '¥9,800/月',
    icon: Building2,
    features: [
      'Proのすべての機能',
      'メンバー 無制限',
      '代理店機能',
      'カスタムドメイン',
      '専任サポート',
      'SLA保証',
    ],
    limitations: [],
  },
];

const invoices = [
  { id: 'INV-2026-001', date: '2026-01-01', amount: 2980, status: '支払済み' },
  { id: 'INV-2025-012', date: '2025-12-01', amount: 2980, status: '支払済み' },
  { id: 'INV-2025-011', date: '2025-11-01', amount: 2980, status: '支払済み' },
  { id: 'INV-2025-010', date: '2025-10-01', amount: 2980, status: '支払済み' },
];

export default function BillingSettingsPage() {
  const { organization } = useOrganization();
  const currentPlan = organization?.plan || 'starter';
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    toast.success(`${plans.find(p => p.id === planId)?.name}プランへのアップグレードを開始します`);
  };

  const handleDownload = (invoiceId: string) => {
    toast.success(`請求書 ${invoiceId} をダウンロードします`);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">請求・プラン</h1>
          <p className="text-muted-foreground">プランの確認・変更、請求履歴</p>
        </div>
      </div>

      {/* 現在のプラン */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>現在のプラン</CardTitle>
            </div>
            <Badge variant="secondary" className="capitalize">
              {currentPlan}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold capitalize">
                {plans.find(p => p.id === currentPlan)?.name}
              </p>
              <p className="text-muted-foreground">
                {plans.find(p => p.id === currentPlan)?.description}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {plans.find(p => p.id === currentPlan)?.priceLabel}
              </p>
              {currentPlan !== 'starter' && (
                <p className="text-sm text-muted-foreground">
                  次回請求日: 2026年2月1日
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* プラン比較 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">プランを変更</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = plan.id === currentPlan;

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative',
                  plan.popular && 'border-primary shadow-lg',
                  isCurrent && 'bg-muted/50'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">人気</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'p-2 rounded-lg',
                      plan.popular ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      <Icon className={cn(
                        'h-5 w-5',
                        plan.popular ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {plan.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold">{plan.priceLabel}</p>
                  </div>

                  <ul className="space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation) => (
                      <li key={limitation} className="flex items-center gap-2 text-muted-foreground">
                        <span className="h-4 w-4 flex items-center justify-center flex-shrink-0">−</span>
                        <span>{limitation}</span>
                      </li>
                    ))}
                  </ul>

                  <Separator />

                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      現在のプラン
                    </Button>
                  ) : plan.id === 'starter' && currentPlan !== 'starter' ? (
                    <Button variant="outline" className="w-full" onClick={() => handleUpgrade(plan.id)}>
                      ダウングレード
                    </Button>
                  ) : (
                    <Button
                      className={cn('w-full', plan.popular && 'btn-premium')}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      アップグレード
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 支払い方法 */}
      <Card>
        <CardHeader>
          <CardTitle>支払い方法</CardTitle>
          <CardDescription>
            請求に使用するクレジットカード情報
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentPlan === 'starter' ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                無料プランでは支払い方法の登録は不要です
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">•••• •••• •••• 4242</p>
                  <p className="text-sm text-muted-foreground">有効期限: 12/2027</p>
                </div>
              </div>
              <Button variant="outline">変更</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 請求履歴 */}
      <Card>
        <CardHeader>
          <CardTitle>請求履歴</CardTitle>
          <CardDescription>
            過去の請求書と支払い状況
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentPlan === 'starter' ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                無料プランでは請求履歴はありません
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>請求書番号</TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>
                      {new Date(invoice.date).toLocaleDateString('ja-JP')}
                    </TableCell>
                    <TableCell>¥{invoice.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(invoice.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* サポート */}
      <Card>
        <CardHeader>
          <CardTitle>請求に関するサポート</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            請求に関するご質問やプランの詳細については、サポートまでお問い合わせください。
          </p>
          <Button variant="outline" asChild>
            <Link href="/support">
              <ExternalLink className="mr-2 h-4 w-4" />
              サポートに連絡
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

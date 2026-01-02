'use client';

import { useState } from 'react';
import {
  CreditCard,
  Building2,
  Wallet,
  CheckCircle2,
  XCircle,
  Settings,
  ExternalLink,
  Key,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { PageTabs } from '@/components/layout/page-tabs';
import { cn } from '@/lib/utils';

const settingsTabs = [
  { label: '基本設定', href: '/settings', exact: true },
  { label: '組織設定', href: '/settings/organization' },
  { label: 'ユーザー・権限', href: '/settings/users' },
  { label: '決済設定', href: '/settings/payments' },
];

// 決済プロバイダー
const paymentProviders = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'クレジットカード、デビットカード、その他多数の決済方法に対応',
    icon: CreditCard,
    status: 'connected',
    features: ['クレジットカード', 'Apple Pay', 'Google Pay', '銀行振込'],
    color: 'from-indigo-500 to-purple-500',
  },
  {
    id: 'payjp',
    name: 'PAY.JP',
    description: '日本国内向けの決済サービス。クレジットカード決済に対応',
    icon: CreditCard,
    status: 'available',
    features: ['クレジットカード', 'コンビニ決済', '銀行振込'],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'gmopg',
    name: 'GMOペイメントゲートウェイ',
    description: '大規模ECサイト向けの総合決済サービス',
    icon: Building2,
    status: 'available',
    features: ['クレジットカード', 'コンビニ決済', 'キャリア決済', '後払い'],
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'paypay',
    name: 'PayPay',
    description: 'QRコード決済サービス。国内利用者数No.1',
    icon: Wallet,
    status: 'available',
    features: ['QRコード決済', 'ポイント還元'],
    color: 'from-red-500 to-pink-500',
  },
];

// 決済方法
const paymentMethods = [
  {
    id: 'credit_card',
    name: 'クレジットカード',
    description: 'Visa, Mastercard, JCB, American Express',
    enabled: true,
    provider: 'Stripe',
  },
  {
    id: 'bank_transfer',
    name: '銀行振込',
    description: '注文後に振込先を案内',
    enabled: true,
    provider: '手動',
  },
  {
    id: 'convenience',
    name: 'コンビニ決済',
    description: '全国のコンビニエンスストアで支払い',
    enabled: false,
    provider: '未設定',
  },
  {
    id: 'cod',
    name: '代金引換',
    description: '商品お届け時に現金でお支払い',
    enabled: true,
    provider: '手動',
  },
];

export default function PaymentsSettingsPage() {
  const [showStripeDialog, setShowStripeDialog] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [methods, setMethods] = useState(paymentMethods);

  const toggleMethod = (id: string) => {
    setMethods(methods.map(m => 
      m.id === id ? { ...m, enabled: !m.enabled } : m
    ));
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">設定</h1>
          <p className="text-muted-foreground">
            決済プロバイダーと決済方法を管理します
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">テストモード</span>
            <Switch
              checked={testMode}
              onCheckedChange={setTestMode}
            />
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={settingsTabs} />

      {/* テストモードの警告 */}
      {testMode && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">テストモードが有効です</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            テスト用の決済情報を使用しています。本番環境に移行する前にテストモードを無効にしてください。
          </AlertDescription>
        </Alert>
      )}

      {/* 決済プロバイダー */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">決済プロバイダー</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {paymentProviders.map((provider) => (
            <Card key={provider.id} className="card-hover overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br",
                      provider.color
                    )}>
                      <provider.icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                      <Badge
                        variant={provider.status === 'connected' ? 'default' : 'secondary'}
                        className="mt-1"
                      >
                        {provider.status === 'connected' ? (
                          <><CheckCircle2 className="mr-1 h-3 w-3" />接続済み</>
                        ) : (
                          '利用可能'
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {provider.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {provider.features.map((feature) => (
                    <Badge key={feature} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
                {provider.status === 'connected' ? (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="mr-2 h-3 w-3" />
                      設定
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Dialog open={showStripeDialog && provider.id === 'stripe'} onOpenChange={setShowStripeDialog}>
                    <DialogTrigger asChild>
                      <Button className="w-full btn-premium" size="sm">
                        接続する
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{provider.name}と接続</DialogTitle>
                        <DialogDescription>
                          APIキーを入力して{provider.name}と連携します
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>公開キー</Label>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-10" placeholder="pk_test_..." />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>シークレットキー</Label>
                          <div className="relative">
                            <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input className="pl-10" type="password" placeholder="sk_test_..." />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            シークレットキーは安全に暗号化して保存されます
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowStripeDialog(false)}>
                          キャンセル
                        </Button>
                        <Button className="btn-premium">
                          接続を確認
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 決済方法 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">有効な決済方法</h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {methods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      method.enabled ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-slate-100 dark:bg-slate-800"
                    )}>
                      {method.enabled ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-muted-foreground">{method.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-xs">
                      {method.provider}
                    </Badge>
                    <Switch
                      checked={method.enabled}
                      onCheckedChange={() => toggleMethod(method.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 決済手数料 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">決済手数料</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-sm text-muted-foreground">クレジットカード</div>
                  <div className="text-2xl font-bold mt-1">3.6%</div>
                  <div className="text-xs text-muted-foreground">+ ¥0/件</div>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-sm text-muted-foreground">銀行振込</div>
                  <div className="text-2xl font-bold mt-1">¥0</div>
                  <div className="text-xs text-muted-foreground">手数料なし</div>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="text-sm text-muted-foreground">代金引換</div>
                  <div className="text-2xl font-bold mt-1">¥330</div>
                  <div className="text-xs text-muted-foreground">1件あたり</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                ※ 手数料はプロバイダーや契約内容により異なる場合があります。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


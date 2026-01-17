'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CreditCard,
  Building2,
  Wallet,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertCircle,
  Loader2,
  Unlink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

// Stripe接続状態の型
interface StripeStatus {
  connected: boolean;
  status: 'not_connected' | 'pending' | 'active' | 'restricted';
  onboardingComplete: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

// 決済方法
const paymentMethods = [
  {
    id: 'credit_card',
    name: 'クレジットカード',
    description: 'Visa, Mastercard, JCB, American Express',
    requiresStripe: true,
  },
  {
    id: 'bank_transfer',
    name: '銀行振込',
    description: '注文後に振込先を案内',
    requiresStripe: false,
  },
  {
    id: 'convenience',
    name: 'コンビニ決済',
    description: '全国のコンビニエンスストアで支払い',
    requiresStripe: true,
  },
  {
    id: 'cod',
    name: '代金引換',
    description: '商品お届け時に現金でお支払い',
    requiresStripe: false,
  },
];

function PaymentsSettingsContent() {
  const searchParams = useSearchParams();
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [enabledMethods, setEnabledMethods] = useState<Record<string, boolean>>({
    credit_card: true,
    bank_transfer: true,
    convenience: false,
    cod: true,
  });

  // URL パラメータからのメッセージ処理
  const stripeParam = searchParams.get('stripe');
  const errorParam = searchParams.get('error');

  // Stripe接続状態を取得
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/stripe/status');
        if (res.ok) {
          const data = await res.json();
          setStripeStatus(data);
        }
      } catch (error) {
        console.error('Failed to fetch Stripe status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
  }, [stripeParam]);

  // Stripe連携開始
  const handleConnectStripe = () => {
    setIsConnecting(true);
    window.location.href = '/api/stripe/connect';
  };

  // Stripe連携解除
  const handleDisconnectStripe = async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch('/api/stripe/status', { method: 'DELETE' });
      if (res.ok) {
        setStripeStatus({
          connected: false,
          status: 'not_connected',
          onboardingComplete: false,
        });
        setShowDisconnectDialog(false);
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const toggleMethod = (id: string) => {
    setEnabledMethods(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isStripeConnected = stripeStatus?.connected && stripeStatus?.onboardingComplete;

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

      {/* 成功メッセージ */}
      {stripeParam === 'connected' && (
        <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-800 dark:text-emerald-200">Stripe連携が完了しました！</AlertTitle>
          <AlertDescription className="text-emerald-700 dark:text-emerald-300">
            クレジットカード決済が利用可能になりました。
          </AlertDescription>
        </Alert>
      )}

      {/* エラーメッセージ */}
      {errorParam && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800 dark:text-red-200">エラーが発生しました</AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-300">
            {errorParam === 'stripe_denied' && 'Stripe連携がキャンセルされました。'}
            {errorParam === 'expired' && 'セッションの有効期限が切れました。もう一度お試しください。'}
            {errorParam === 'config_error' && 'システム設定エラーが発生しました。管理者にお問い合わせください。'}
            {!['stripe_denied', 'expired', 'config_error'].includes(errorParam) && '予期しないエラーが発生しました。'}
          </AlertDescription>
        </Alert>
      )}

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

      {/* Stripe Connect カード */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">決済プロバイダー</h2>
        
        <Card className="card-hover overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Stripe</CardTitle>
                  <CardDescription>
                    クレジットカード、Apple Pay、Google Pay など多数の決済方法に対応
                  </CardDescription>
                </div>
              </div>
              {!isLoading && stripeStatus && (
                <Badge
                  variant={isStripeConnected ? 'default' : stripeStatus.status === 'pending' ? 'secondary' : 'outline'}
                  className={cn(
                    isStripeConnected && 'bg-emerald-500 hover:bg-emerald-600'
                  )}
                >
                  {isStripeConnected ? (
                    <><CheckCircle2 className="mr-1 h-3 w-3" />連携済み</>
                  ) : stripeStatus.status === 'pending' ? (
                    <><Loader2 className="mr-1 h-3 w-3 animate-spin" />設定中</>
                  ) : (
                    '未連携'
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : isStripeConnected ? (
              // 連携済みの場合
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-800 dark:text-emerald-200">
                        クレジットカード決済が有効です
                      </p>
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        アカウントID: {stripeStatus.accountId}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Stripeダッシュボード
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowDisconnectDialog(true)}
                  >
                    <Unlink className="mr-2 h-4 w-4" />
                    連携解除
                  </Button>
                </div>
              </div>
            ) : stripeStatus?.status === 'pending' ? (
              // オンボーディング中の場合
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Stripeの設定を完了してください
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        本人確認や銀行口座の登録が必要です
                      </p>
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={handleConnectStripe}
                  disabled={isConnecting}
                  className="w-full btn-premium"
                >
                  {isConnecting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />設定を続ける...</>
                  ) : (
                    '設定を続ける'
                  )}
                </Button>
              </div>
            ) : (
              // 未連携の場合
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {['クレジットカード', 'Apple Pay', 'Google Pay', '銀行振込'].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {feature}
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={handleConnectStripe}
                  disabled={isConnecting}
                  className="w-full btn-premium"
                  size="lg"
                >
                  {isConnecting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Stripeに接続中...</>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-5 w-5" />
                      Stripeと連携する（ワンクリック）
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  ボタンをクリックするとStripeの認証ページに移動します。
                  Stripeアカウントをお持ちでない場合は、その場で作成できます。
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* その他の決済プロバイダー（Coming Soon） */}
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { id: 'payjp', name: 'PAY.JP', icon: CreditCard, color: 'from-blue-500 to-cyan-500' },
            { id: 'paypay', name: 'PayPay', icon: Wallet, color: 'from-red-500 to-pink-500' },
          ].map((provider) => (
            <Card key={provider.id} className="opacity-60">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br",
                    provider.color
                  )}>
                    <provider.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      Coming Soon
                    </Badge>
                  </div>
                </div>
              </CardHeader>
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
              {paymentMethods.map((method) => {
                const isEnabled = enabledMethods[method.id];
                const needsStripe = method.requiresStripe && !isStripeConnected;
                
                return (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        isEnabled && !needsStripe ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-slate-100 dark:bg-slate-800"
                      )}>
                        {isEnabled && !needsStripe ? (
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
                      {needsStripe && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                          Stripe連携が必要
                        </Badge>
                      )}
                      <Switch
                        checked={isEnabled && !needsStripe}
                        onCheckedChange={() => toggleMethod(method.id)}
                        disabled={needsStripe}
                      />
                    </div>
                  </div>
                );
              })}
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

      {/* 連携解除ダイアログ */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stripe連携を解除しますか？</DialogTitle>
            <DialogDescription>
              連携を解除すると、クレジットカード決済が利用できなくなります。
              既存の注文や払い戻しには影響しません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisconnectDialog(false)}>
              キャンセル
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDisconnectStripe}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />解除中...</>
              ) : (
                '連携を解除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PaymentsSettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <PaymentsSettingsContent />
    </Suspense>
  );
}

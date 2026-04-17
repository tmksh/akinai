'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Check, Zap, Crown, Building2, ExternalLink, Loader2, AlertCircle, Gift } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
    limitations: ['API連携なし', '代理店機能なし'],
  },
  {
    id: 'light',
    name: 'ライト',
    description: '小規模ショップやはじめての方に',
    price: 3000,
    priceLabel: '¥3,300/月（税込）',
    icon: Crown,
    popular: false,
    features: [
      '商品 50件まで',
      '月間 100注文まで',
      'メンバー 1人',
      'ECショップ機能',
      'メールサポート',
      '見積管理',
      'API / Webhook',
    ],
    limitations: [],
  },
  {
    id: 'standard',
    name: 'スタンダード',
    description: '成長するビジネスに最適',
    price: 10000,
    priceLabel: '¥11,000/月（税込）',
    icon: Building2,
    popular: true,
    features: [
      '商品無制限',
      '注文無制限',
      'メンバー 5人',
      'ECショップ機能',
      '優先サポート',
      '見積管理',
      'API / Webhook',
    ],
    limitations: [],
  },
];

interface SubscriptionInfo {
  plan: string;
  subscription_status: string | null;
  trial_ends_at: string | null;
  subscription_current_period_end: string | null;
  stripe_subscription_id: string | null;
}

export default function BillingSettingsPage() {
  const { organization } = useOrganization();
  const searchParams = useSearchParams();
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const successParam = searchParams.get('subscription');

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch('/api/stripe/subscription');
        if (res.ok) {
          const data = await res.json();
          setSubInfo(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubscription();
  }, [successParam]);

  const currentPlan = subInfo?.plan || organization?.plan || 'starter';
  const subscriptionStatus = subInfo?.subscription_status;
  const isTrialing = subscriptionStatus === 'trialing';
  const isActive = subscriptionStatus === 'active';
  const trialEndsAt = subInfo?.trial_ends_at
    ? new Date(subInfo.trial_ends_at).toLocaleDateString('ja-JP')
    : null;
  const periodEnd = subInfo?.subscription_current_period_end
    ? new Date(subInfo.subscription_current_period_end).toLocaleDateString('ja-JP')
    : null;

  const handleUpgrade = async (planId: string) => {
    if (planId === 'starter') return;
    setUpgradingPlan(planId);
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'エラーが発生しました');
      }
    } catch {
      toast.error('エラーが発生しました');
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleCancel = async () => {
    setIsCanceling(true);
    try {
      const res = await fetch('/api/stripe/subscription', { method: 'DELETE' });
      if (res.ok) {
        toast.success('サブスクリプションを解約しました。期間終了まで引き続きご利用いただけます。');
        setSubInfo(prev => prev ? { ...prev, subscription_status: 'canceled' } : prev);
      } else {
        toast.error('解約に失敗しました');
      }
    } catch {
      toast.error('エラーが発生しました');
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">請求・プラン</h1>
          <p className="text-muted-foreground">プランの確認・変更、請求履歴</p>
        </div>
      </div>

      {/* 成功メッセージ */}
      {successParam === 'success' && (
        <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
          <Check className="h-4 w-4 text-emerald-600" />
          <AlertTitle className="text-emerald-800 dark:text-emerald-200">プランを開始しました！</AlertTitle>
          <AlertDescription className="text-emerald-700 dark:text-emerald-300">
            1ヶ月間の無料トライアルが開始されました。トライアル終了後に自動的に課金が始まります。
          </AlertDescription>
        </Alert>
      )}

      {/* トライアル中の通知 */}
      {isTrialing && trialEndsAt && (
        <Alert className="border-sky-200 bg-sky-50 dark:bg-sky-950/30">
          <Gift className="h-4 w-4 text-sky-600" />
          <AlertTitle className="text-sky-800 dark:text-sky-200">無料トライアル中</AlertTitle>
          <AlertDescription className="text-sky-700 dark:text-sky-300">
            {trialEndsAt} まで無料でご利用いただけます。それ以降は自動的に課金が始まります。
          </AlertDescription>
        </Alert>
      )}

      {/* 現在のプラン */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>現在のプラン</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isTrialing && <Badge className="bg-sky-500">トライアル中</Badge>}
              {isActive && <Badge className="bg-emerald-500">有効</Badge>}
              <Badge variant="secondary" className="capitalize">{currentPlan}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {plans.find(p => p.id === currentPlan)?.name || currentPlan}
                </p>
                <p className="text-muted-foreground">
                  {plans.find(p => p.id === currentPlan)?.description}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {plans.find(p => p.id === currentPlan)?.priceLabel}
                </p>
                {(isActive || isTrialing) && periodEnd && (
                  <p className="text-sm text-muted-foreground">
                    {isTrialing ? `トライアル終了: ${trialEndsAt}` : `次回請求日: ${periodEnd}`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 解約ボタン */}
          {(isActive || isTrialing) && subscriptionStatus !== 'canceled' && (
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleCancel}
                disabled={isCanceling}
              >
                {isCanceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                サブスクリプションを解約
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* プラン比較 */}
      <div>
        <h2 className="text-lg font-semibold mb-2">プランを選択</h2>
        <p className="text-sm text-muted-foreground mb-4">
          <Gift className="inline h-4 w-4 mr-1 text-sky-500" />
          全プラン <strong>1ヶ月無料トライアル</strong> 付き。クレジットカードは登録後の請求から。
        </p>
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
                    <Badge className="bg-primary">おすすめ</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className={cn('p-2 rounded-lg', plan.popular ? 'bg-primary/10' : 'bg-muted')}>
                      <Icon className={cn('h-5 w-5', plan.popular ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <CardDescription className="text-xs">{plan.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold">{plan.priceLabel}</p>
                    {plan.price > 0 && (
                      <p className="text-xs text-sky-600 font-medium">最初の1ヶ月無料</p>
                    )}
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
                  ) : plan.id === 'starter' ? (
                    <Button variant="outline" className="w-full" disabled>
                      無料プラン
                    </Button>
                  ) : (
                    <Button
                      className={cn('w-full', plan.popular && 'btn-premium')}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={upgradingPlan === plan.id}
                    >
                      {upgradingPlan === plan.id ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />処理中...</>
                      ) : (
                        '1ヶ月無料で始める'
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

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
            <Link href="/contact">
              <ExternalLink className="mr-2 h-4 w-4" />
              サポートに連絡
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

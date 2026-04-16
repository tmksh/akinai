'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Bell,
  Megaphone,
  Gift,
  Mail,
  MessageSquare,
  ClipboardCheck,
  Save,
  Loader2,
  Info,
  LayoutGrid,
} from 'lucide-react';
import {
  IoHome,
  IoCube,
  IoDocument,
  IoCart,
  IoBusiness,
  IoSettings,
  IoPeople,
  IoClipboard,
  IoMegaphone,
} from 'react-icons/io5';
import { IconType } from 'react-icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { PageTabs } from '@/components/layout/page-tabs';
import { useOrganization } from '@/components/providers/organization-provider';
import { toast } from 'sonner';
import {
  getOrganizationFeatures,
  updateOrganizationFeatures,
  getEnabledNavItems,
  updateEnabledNavItems,
} from '@/lib/actions/settings';
import {
  OrganizationFeatures,
  DEFAULT_ORGANIZATION_FEATURES,
} from '@/types/database';

const settingsTabs = [
  { label: '基本設定', href: '/settings', exact: true },
  { label: '組織設定', href: '/settings/organization' },
  { label: 'ユーザー管理', href: '/settings/users' },
  { label: 'ロール管理', href: '/settings/roles' },
  { label: '権限マトリクス', href: '/settings/permissions' },
  { label: '機能設定', href: '/settings/features' },
  { label: '決済設定', href: '/settings/payments' },
];

const ALL_NAV_ITEMS: { key: string; title: string; icon: IconType; required?: boolean }[] = [
  { key: 'dashboard',  title: 'ホーム',           icon: IoHome,      required: true },
  { key: 'products',   title: '商品管理',          icon: IoCube },
  { key: 'contents',   title: 'コンテンツ管理',    icon: IoDocument },
  { key: 'orders',     title: '注文管理',          icon: IoCart },
  { key: 'customers',  title: '顧客管理',          icon: IoPeople },
  { key: 'quotes',     title: '見積管理',          icon: IoClipboard },
  { key: 'agents',     title: '代理店',            icon: IoBusiness },
  { key: 'marketing',  title: 'マーケティング',    icon: IoMegaphone },
  { key: 'settings',   title: '設定',              icon: IoSettings,  required: true },
];

interface FeatureRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}

function FeatureToggleRow({
  icon,
  title,
  description,
  badge,
  checked,
  onCheckedChange,
}: FeatureRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-muted/60">{icon}</div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">{title}</Label>
            {badge && (
              <Badge variant="secondary" className="text-xs">
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function FeaturesSettingsPage() {
  const { organization } = useOrganization();

  // 機能フラグ
  const [features, setFeatures] = useState<OrganizationFeatures>(DEFAULT_ORGANIZATION_FEATURES);
  const [newsletterLimit, setNewsletterLimit] = useState('');
  const [messageLimit, setMessageLimit] = useState('');
  const [isPending, startTransition] = useTransition();

  // ナビゲーション設定
  const [navKeys, setNavKeys] = useState<string[]>(ALL_NAV_ITEMS.map((i) => i.key));
  const [navLoading, setNavLoading] = useState(true);
  const [isNavPending, startNavTransition] = useTransition();

  useEffect(() => {
    if (!organization?.id) return;

    getOrganizationFeatures(organization.id).then(({ data }) => {
      setFeatures(data);
      setNewsletterLimit(
        data.newsletter_frequency_limit != null ? String(data.newsletter_frequency_limit) : ''
      );
      setMessageLimit(
        data.message_monthly_limit != null ? String(data.message_monthly_limit) : ''
      );
    });

    getEnabledNavItems(organization.id).then(({ data }) => {
      const required = ALL_NAV_ITEMS.filter((i) => i.required).map((i) => i.key);
      if (data !== null) {
        setNavKeys([...new Set([...data, ...required])]);
      } else {
        setNavKeys(ALL_NAV_ITEMS.map((i) => i.key));
      }
      setNavLoading(false);
    });
  }, [organization?.id]);

  const handleToggle = (key: keyof OrganizationFeatures, value: boolean) => {
    setFeatures((prev) => ({ ...prev, [key]: value }));
  };

  const toggleNavKey = (key: string, required?: boolean) => {
    if (required) return;
    setNavKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    if (!organization?.id) return;
    const nl = newsletterLimit.trim();
    const ml = messageLimit.trim();

    const next: OrganizationFeatures = {
      ...features,
      newsletter_frequency_limit: nl === '' ? null : Number(nl) > 0 ? Number(nl) : null,
      message_monthly_limit:      ml === '' ? null : Number(ml) > 0 ? Number(ml) : null,
    };

    startTransition(async () => {
      const { error } = await updateOrganizationFeatures(organization.id, next);
      if (error) {
        toast.error('保存に失敗しました');
      } else {
        setFeatures(next);
        toast.success('機能設定を保存しました');
      }
    });
  };

  const handleNavSave = () => {
    if (!organization?.id) return;
    startNavTransition(async () => {
      const { error } = await updateEnabledNavItems(organization.id, navKeys);
      if (error) {
        toast.error('ナビゲーション設定の保存に失敗しました');
      } else {
        toast.success('ナビゲーション設定を保存しました');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">設定</h1>
          <p className="text-muted-foreground">
            アカウントごとに有効にする機能を管理します
          </p>
        </div>
        <Button onClick={handleSave} disabled={isPending} className="btn-premium">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              設定を保存
            </>
          )}
        </Button>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={settingsTabs} />

      {/* 会員・通知機能 */}
      <Card>
        <CardHeader>
          <CardTitle>会員・通知機能</CardTitle>
          <CardDescription>
            会員向けの通知・紹介コード機能を設定します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <FeatureToggleRow
            icon={<Bell className="h-4 w-4 text-sky-500" />}
            title="通知BOX機能"
            description="会員の通知履歴を管理するAPIを有効化します（メッセージ受信・イベント告知・商品審査完了など）"
            checked={features.notification_box}
            onCheckedChange={(v) => handleToggle('notification_box', v)}
          />
          <Separator />
          <FeatureToggleRow
            icon={<Megaphone className="h-4 w-4 text-orange-500" />}
            title="イベント告知 → 通知配信"
            description="POST /events 実行時に条件に合うサプライヤーの通知BOXへも記録します（notifiedCount をレスポンスに含む）"
            checked={features.event_notification}
            onCheckedChange={(v) => handleToggle('event_notification', v)}
          />
          <Separator />
          <FeatureToggleRow
            icon={<Gift className="h-4 w-4 text-emerald-500" />}
            title="紹介コード（アフィリエイト）機能"
            description="会員登録時に referral_code を自動生成。紹介経由登録数のカウントと累計紹介数に応じた特典ロジックを有効化します"
            checked={features.referral_code}
            onCheckedChange={(v) => handleToggle('referral_code', v)}
          />
        </CardContent>
      </Card>

      {/* 配信・送信制限 */}
      <Card>
        <CardHeader>
          <CardTitle>配信・送信制限</CardTitle>
          <CardDescription>
            メルマガとメッセージの送信上限を設定します（空欄＝無制限）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-muted/60">
                <Mail className="h-4 w-4 text-violet-500" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">メルマガ配信頻度制限</Label>
                <p className="text-xs text-muted-foreground">
                  POST /newsletters/send を月に何回まで許可するか設定します
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Input
                type="number"
                min="1"
                placeholder="無制限"
                value={newsletterLimit}
                onChange={(e) => setNewsletterLimit(e.target.value)}
                className="w-24 text-right"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">回 / 月</span>
            </div>
          </div>
          <Separator />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-muted/60">
                <MessageSquare className="h-4 w-4 text-teal-500" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">メッセージ月間送信上限</Label>
                <p className="text-xs text-muted-foreground">
                  POST /messages で月に送信できる宛先社数の上限を設定します
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Input
                type="number"
                min="1"
                placeholder="無制限"
                value={messageLimit}
                onChange={(e) => setMessageLimit(e.target.value)}
                className="w-24 text-right"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">社 / 月</span>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>制限値を空欄にすると無制限になります。月初（1日 00:00 JST）にカウントはリセットされます。</span>
          </div>
        </CardContent>
      </Card>

      {/* 商品審査フロー */}
      <Card>
        <CardHeader>
          <CardTitle>商品審査フロー</CardTitle>
          <CardDescription>
            商品登録後に「審査中 → 承認 → 公開」のワークフローを有効化します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeatureToggleRow
            icon={<ClipboardCheck className="h-4 w-4 text-amber-500" />}
            title="公開承認ワークフロー"
            description="ONにすると、商品登録時に approval_status=pending がセットされ、管理者の承認後に公開されます。OFFの場合は従来どおり status=published で即時公開"
            badge="審査"
            checked={features.product_approval_flow}
            onCheckedChange={(v) => handleToggle('product_approval_flow', v)}
          />
        </CardContent>
      </Card>

      {/* EC機能 */}
      <Card>
        <CardHeader>
          <CardTitle>EC機能</CardTitle>
          <CardDescription>Eコマース関連の機能を設定します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <FeatureToggleRow
            icon={<span className="text-sm">🛒</span>}
            title="ゲストチェックアウト"
            description="会員登録なしで購入を許可する"
            checked={!!(features as unknown as Record<string, unknown>).enableGuestCheckout}
            onCheckedChange={(v) =>
              setFeatures((prev) => ({ ...prev, enableGuestCheckout: v } as unknown as OrganizationFeatures))
            }
          />
          <Separator />
          <FeatureToggleRow
            icon={<span className="text-sm">📋</span>}
            title="見積機能"
            description="見積書の作成・管理機能を有効にする"
            checked={(features as unknown as Record<string, unknown>).enableEstimates !== false}
            onCheckedChange={(v) =>
              setFeatures((prev) => ({ ...prev, enableEstimates: v } as unknown as OrganizationFeatures))
            }
          />
          <Separator />
          <FeatureToggleRow
            icon={<span className="text-sm">📦</span>}
            title="高度な在庫管理"
            description="複数倉庫・ロット管理などの高度な在庫機能"
            checked={!!(features as unknown as Record<string, unknown>).enableAdvancedInventory}
            onCheckedChange={(v) =>
              setFeatures((prev) => ({ ...prev, enableAdvancedInventory: v } as unknown as OrganizationFeatures))
            }
          />
        </CardContent>
      </Card>

      {/* ナビゲーション設定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                ナビゲーション設定
              </CardTitle>
              <CardDescription>
                ヘッダーに表示するメニュー項目を選択します。ホームと設定は常に表示されます
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNavSave}
              disabled={isNavPending || navLoading}
            >
              {isNavPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                '保存'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {navLoading ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_NAV_ITEMS.map(({ key, title, icon: Icon, required }) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    required
                      ? 'opacity-60 cursor-not-allowed bg-muted/30'
                      : 'cursor-pointer hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={navKeys.includes(key)}
                    onCheckedChange={() => toggleNavKey(key, required)}
                    disabled={required}
                  />
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{title}</span>
                  {required && (
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded ml-auto">
                      常時表示
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

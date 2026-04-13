'use client';

import { useState, useEffect, useTransition } from 'react';
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useOrganization } from '@/components/providers/organization-provider';
import {
  getCustomerRoleLabels,
  updateCustomerRoleLabels,
} from '@/lib/actions/settings';
import {
  DEFAULT_CUSTOMER_ROLE_LABELS,
  DEFAULT_CUSTOMER_ROLE_ENABLED,
  type CustomerRoleLabels,
  type CustomerRoleEnabled,
} from '@/lib/customer-roles';
import { toast } from 'sonner';

const ROLE_KEYS: (keyof CustomerRoleLabels)[] = ['personal', 'buyer', 'supplier'];

const ROLE_DESCRIPTIONS: Record<keyof CustomerRoleLabels, string> = {
  personal: 'key: personal — 個人向け一般会員',
  buyer:    'key: buyer — 商品を仕入れる側（法人など）',
  supplier: 'key: supplier — 商品を提供する側',
};

export default function CustomerRolesSettingsPage() {
  const { organization } = useOrganization();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [labels, setLabels] = useState<CustomerRoleLabels>({ ...DEFAULT_CUSTOMER_ROLE_LABELS });
  const [enabled, setEnabled] = useState<CustomerRoleEnabled>({ ...DEFAULT_CUSTOMER_ROLE_ENABLED });

  useEffect(() => {
    async function load() {
      if (!organization?.id) return;
      const { data, enabled: enabledData } = await getCustomerRoleLabels(organization.id);
      setLabels(data);
      setEnabled(enabledData);
      setIsLoading(false);
    }
    load();
  }, [organization?.id]);

  const handleChange = (key: keyof CustomerRoleLabels, value: string) => {
    setLabels((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggle = (key: keyof CustomerRoleEnabled, value: boolean) => {
    // 最低1つは有効にしておく
    const willBeEnabled = { ...enabled, [key]: value };
    const anyEnabled = Object.values(willBeEnabled).some(Boolean);
    if (!anyEnabled) {
      toast.error('少なくとも1つの会員種別を有効にしてください');
      return;
    }
    setEnabled(willBeEnabled);
  };

  const handleReset = () => {
    setLabels({ ...DEFAULT_CUSTOMER_ROLE_LABELS });
    setEnabled({ ...DEFAULT_CUSTOMER_ROLE_ENABLED });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) {
      toast.error('組織が設定されていません');
      return;
    }
    const sanitized: CustomerRoleLabels = {
      personal: labels.personal.trim() || DEFAULT_CUSTOMER_ROLE_LABELS.personal,
      buyer:    labels.buyer.trim()    || DEFAULT_CUSTOMER_ROLE_LABELS.buyer,
      supplier: labels.supplier.trim() || DEFAULT_CUSTOMER_ROLE_LABELS.supplier,
    };
    setLabels(sanitized);
    startTransition(async () => {
      const { error } = await updateCustomerRoleLabels(organization.id, sanitized, enabled);
      if (error) { toast.error(error); return; }
      toast.success('会員種別の設定を保存しました');
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">会員種別の設定</h1>
          <p className="text-muted-foreground">
            使用する会員種別の有効/無効と表示名を設定できます
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">種別の有効化と名称編集</CardTitle>
            <CardDescription>
              使わない種別はオフにすると顧客登録フォームに表示されなくなります。名称は空欄にするとデフォルト名に戻ります。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {ROLE_KEYS.map((key) => (
              <div key={key} className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <input
                    id={key}
                    value={labels[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={DEFAULT_CUSTOMER_ROLE_LABELS[key]}
                    disabled={!enabled[key]}
                    className="flex-1 text-sm font-medium bg-transparent rounded-md px-2 py-0.5 border border-transparent hover:border-border focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-muted-foreground/50"
                  />
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4 text-muted-foreground shrink-0">
                    {key}
                  </Badge>
                  <Switch
                    id={`toggle-${key}`}
                    checked={enabled[key]}
                    onCheckedChange={(v) => handleToggle(key, v)}
                  />
                </div>
                <p className="text-xs text-muted-foreground pl-0.5">{ROLE_DESCRIPTIONS[key]}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* プレビュー */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">プレビュー</CardTitle>
            <CardDescription>顧客登録画面での表示イメージ（有効な種別のみ）</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ROLE_KEYS.filter((key) => enabled[key]).map((key) => (
                <Badge key={key} variant="outline" className="px-3 py-1 text-sm">
                  {labels[key] || DEFAULT_CUSTOMER_ROLE_LABELS[key]}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            デフォルトに戻す
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href="/settings">キャンセル</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

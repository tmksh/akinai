'use client';

import { useState, useEffect, useTransition } from 'react';
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/components/providers/organization-provider';
import {
  getCustomerRoleLabels,
  updateCustomerRoleLabels,
} from '@/lib/actions/settings';
import { DEFAULT_CUSTOMER_ROLE_LABELS, type CustomerRoleLabels } from '@/lib/customer-roles';
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

  useEffect(() => {
    async function load() {
      if (!organization?.id) return;
      const { data } = await getCustomerRoleLabels(organization.id);
      setLabels(data);
      setIsLoading(false);
    }
    load();
  }, [organization?.id]);

  const handleChange = (key: keyof CustomerRoleLabels, value: string) => {
    setLabels((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setLabels({ ...DEFAULT_CUSTOMER_ROLE_LABELS });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) {
      toast.error('組織が設定されていません');
      return;
    }
    // 空欄はデフォルトに戻す
    const sanitized: CustomerRoleLabels = {
      personal: labels.personal.trim() || DEFAULT_CUSTOMER_ROLE_LABELS.personal,
      buyer:    labels.buyer.trim()    || DEFAULT_CUSTOMER_ROLE_LABELS.buyer,
      supplier: labels.supplier.trim() || DEFAULT_CUSTOMER_ROLE_LABELS.supplier,
    };
    setLabels(sanitized);
    startTransition(async () => {
      const { error } = await updateCustomerRoleLabels(organization.id, sanitized);
      if (error) { toast.error(error); return; }
      toast.success('会員種別の表示名を保存しました');
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
          <h1 className="text-2xl font-bold">会員種別の表示名</h1>
          <p className="text-muted-foreground">
            顧客管理画面で表示される会員種別の名称を変更できます
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">種別名の編集</CardTitle>
            <CardDescription>
              ここで設定した名称が顧客登録・一覧・詳細画面に反映されます。空欄にするとデフォルト名に戻ります。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {ROLE_KEYS.map((key) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor={key}>{DEFAULT_CUSTOMER_ROLE_LABELS[key]}</Label>
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4 text-muted-foreground">
                    {key}
                  </Badge>
                </div>
                <Input
                  id={key}
                  value={labels[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={DEFAULT_CUSTOMER_ROLE_LABELS[key]}
                />
                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[key]}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* プレビュー */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">プレビュー</CardTitle>
            <CardDescription>顧客登録画面での表示イメージ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ROLE_KEYS.map((key) => (
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

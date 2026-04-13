'use client';

import { useState, useEffect, useTransition } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import {
  IoHome,
  IoCube,
  IoDocument,
  IoCart,
  IoBusiness,
  IoSettings,
  IoPeople,
  IoClipboard,
} from 'react-icons/io5';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrganization } from '@/components/providers/organization-provider';
import { getEnabledNavItems, updateEnabledNavItems } from '@/lib/actions/settings';
import { toast } from 'sonner';
import { IconType } from 'react-icons';

const ALL_NAV_ITEMS: { key: string; title: string; icon: IconType; href: string; required?: boolean }[] = [
  { key: 'dashboard', title: 'ホーム', icon: IoHome, href: '/dashboard', required: true },
  { key: 'products', title: '商品管理', icon: IoCube, href: '/products' },
  { key: 'contents', title: 'コンテンツ管理', icon: IoDocument, href: '/contents' },
  { key: 'orders', title: '注文管理', icon: IoCart, href: '/orders' },
  { key: 'customers', title: '顧客管理', icon: IoPeople, href: '/customers' },
  { key: 'quotes', title: '見積管理', icon: IoClipboard, href: '/quotes' },
  { key: 'agents', title: '代理店', icon: IoBusiness, href: '/agents' },
  { key: 'settings', title: '設定', icon: IoSettings, href: '/settings', required: true },
];

export default function NavigationSettingsPage() {
  const { organization } = useOrganization();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(ALL_NAV_ITEMS.map((i) => i.key));

  useEffect(() => {
    async function load() {
      if (!organization?.id) return;
      const { data } = await getEnabledNavItems(organization.id);
      if (data !== null) {
        const required = ALL_NAV_ITEMS.filter((i) => i.required).map((i) => i.key);
        setSelectedKeys([...new Set([...data, ...required])]);
      } else {
        setSelectedKeys(ALL_NAV_ITEMS.map((i) => i.key));
      }
      setIsLoading(false);
    }
    load();
  }, [organization?.id]);

  const toggleKey = (key: string, required?: boolean) => {
    if (required) return;
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) {
      toast.error('組織が設定されていません');
      return;
    }
    startTransition(async () => {
      const { error } = await updateEnabledNavItems(organization.id, selectedKeys);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('ナビゲーション設定を保存しました');
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
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">ナビゲーション設定</h1>
          <p className="text-muted-foreground">
            ヘッダーに表示するメニュー項目を選択します
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">表示するメニュー項目</CardTitle>
            <CardDescription>
              チェックを外した項目はナビゲーションバーに表示されなくなります。ホームと設定は常に表示されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ALL_NAV_ITEMS.map(({ key, title, icon: Icon, required }) => (
              <label
                key={key}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  required
                    ? 'opacity-60 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={selectedKeys.includes(key)}
                  onCheckedChange={() => toggleKey(key, required)}
                  disabled={required}
                />
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{title}</span>
                {required && (
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded ml-auto">
                    常時表示
                  </span>
                )}
              </label>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/settings">設定トップへ</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

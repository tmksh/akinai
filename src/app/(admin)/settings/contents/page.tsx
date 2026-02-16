'use client';

import { useState, useEffect, useTransition } from 'react';
import { ArrowLeft, Save, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrganization } from '@/components/providers/organization-provider';
import { getEnabledContentTypes, updateEnabledContentTypes } from '@/lib/actions/settings';
import { toast } from 'sonner';
import { contentTypeConfig } from '@/lib/content-types';

export default function ContentsSettingsPage() {
  const { organization } = useOrganization();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      if (!organization?.id) return;
      const { data } = await getEnabledContentTypes(organization.id);
      setSelectedTypes(data || []);
      setIsLoading(false);
    }
    load();
  }, [organization?.id]);

  const toggleType = (typeKey: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeKey)
        ? prev.filter((k) => k !== typeKey)
        : [...prev, typeKey]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) {
      toast.error('組織が設定されていません');
      return;
    }
    startTransition(async () => {
      const { data, error } = await updateEnabledContentTypes(organization.id, selectedTypes);
      if (error) {
        toast.error(error);
        return;
      }
      toast.success('お知らせで使うタイプを保存しました');
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
          <h1 className="text-2xl font-bold">お知らせで使うタイプ</h1>
          <p className="text-muted-foreground">
            ここで選んだタイプだけがお知らせ一覧に表示され、新規作成で使えます
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">コンテンツタイプを選択</CardTitle>
            <CardDescription>
              使いたいタイプにチェックを入れて保存してください。未選択のタイプでは新規作成できません。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(contentTypeConfig).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <label
                  key={key}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedTypes.includes(key)}
                    onCheckedChange={() => toggleType(key)}
                  />
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{config.label}</span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded ml-auto">
                    {key}
                  </span>
                </label>
              );
            })}
            <p className="text-xs text-muted-foreground pt-1">
              右の値（news, article など）がAPIの type です。フロントでは ?type=この値 で一覧を取得します。
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/contents">お知らせ一覧へ</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Plus, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageTabs } from '@/components/layout/page-tabs';
import { useOrganization } from '@/components/providers/organization-provider';
import { getContents } from '@/lib/actions/contents';
import type { ContentData } from '@/lib/actions/contents';

const contentTabs = [
  { label: '記事一覧', href: '/contents', exact: true },
  { label: '記事作成', href: '/contents/new' },
  { label: 'ニュース', href: '/contents/news' },
  { label: '特集', href: '/contents/features' },
];

export default function FeaturesPage() {
  const { organization } = useOrganization();
  const [featureItems, setFeatureItems] = useState<ContentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeatures = useCallback(async () => {
    if (!organization?.id) return;
    const { data } = await getContents(organization.id, { type: 'feature' });
    setFeatureItems(data ?? []);
    setIsLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">コンテンツ管理</h1>
          <p className="text-muted-foreground">特集記事の管理を行います</p>
        </div>
        <Button className="btn-premium" asChild>
          <Link href="/contents/new">
            <Plus className="mr-2 h-4 w-4" />
            特集を作成
          </Link>
        </Button>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={contentTabs} />

      {/* 検索 */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>特集一覧</CardTitle>
          <CardDescription>公開中の特集記事</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="特集を検索..." className="pl-10" />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : featureItems.length > 0 ? (
            <div className="space-y-4">
              {featureItems.map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Sparkles className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{feature.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {feature.publishedAt ? new Date(feature.publishedAt).toLocaleDateString('ja-JP') : '-'} • {feature.authorName ?? feature.authorId ?? '-'}
                    </div>
                  </div>
                  <Badge variant={feature.status === 'published' ? 'default' : 'secondary'}>
                    {feature.status === 'published' ? '公開中' : '下書き'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">特集がありません</h3>
              <p className="text-muted-foreground mb-4">
                最初の特集記事を作成しましょう
              </p>
              <Button className="btn-premium" asChild>
                <Link href="/contents/new">
                  <Plus className="mr-2 h-4 w-4" />
                  特集を作成
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




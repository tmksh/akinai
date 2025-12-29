'use client';

import { Sparkles, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockContents } from '@/lib/mock-data';

export default function FeaturesPage() {
  const featureItems = mockContents.filter((content) => content.type === 'feature');

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">特集</h1>
          <p className="text-muted-foreground">特集記事の管理を行います</p>
        </div>
        <Button className="gradient-brand text-white" asChild>
          <Link href="/contents/new">
            <Plus className="mr-2 h-4 w-4" />
            特集を作成
          </Link>
        </Button>
      </div>

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

          {featureItems.length > 0 ? (
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
                      {new Date(feature.publishedAt).toLocaleDateString('ja-JP')} • {feature.author}
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
              <Button className="gradient-brand text-white" asChild>
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


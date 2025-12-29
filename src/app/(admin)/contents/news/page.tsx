'use client';

import { Newspaper, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockContents } from '@/lib/mock-data';

export default function NewsPage() {
  const newsItems = mockContents.filter((content) => content.type === 'news');

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ニュース</h1>
          <p className="text-muted-foreground">ニュース記事の管理を行います</p>
        </div>
        <Button className="gradient-brand text-white" asChild>
          <Link href="/contents/new">
            <Plus className="mr-2 h-4 w-4" />
            ニュースを作成
          </Link>
        </Button>
      </div>

      {/* 検索 */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>ニュース一覧</CardTitle>
          <CardDescription>公開中のニュース記事</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="ニュースを検索..." className="pl-10" />
            </div>
          </div>

          {newsItems.length > 0 ? (
            <div className="space-y-4">
              {newsItems.map((news) => (
                <div
                  key={news.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <Newspaper className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{news.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(news.publishedAt).toLocaleDateString('ja-JP')} • {news.author}
                    </div>
                  </div>
                  <Badge variant={news.status === 'published' ? 'default' : 'secondary'}>
                    {news.status === 'published' ? '公開中' : '下書き'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Newspaper className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">ニュースがありません</h3>
              <p className="text-muted-foreground mb-4">
                最初のニュース記事を作成しましょう
              </p>
              <Button className="gradient-brand text-white" asChild>
                <Link href="/contents/new">
                  <Plus className="mr-2 h-4 w-4" />
                  ニュースを作成
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



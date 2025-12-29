'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  Archive,
  FileText,
  Newspaper,
  Star,
  Calendar,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockContents, mockUsers } from '@/lib/mock-data';
import type { ContentType, ContentStatus } from '@/types';

// タイプ設定
const typeConfig: Record<ContentType, { label: string; icon: React.ElementType }> = {
  article: { label: '記事', icon: FileText },
  news: { label: 'ニュース', icon: Newspaper },
  page: { label: '固定ページ', icon: FileText },
  feature: { label: '特集', icon: Star },
};

// ステータス設定
const statusConfig: Record<ContentStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: '下書き', variant: 'outline' },
  review: { label: 'レビュー中', variant: 'secondary' },
  published: { label: '公開中', variant: 'default' },
  archived: { label: 'アーカイブ', variant: 'destructive' },
};

// 日付フォーマット
const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function ContentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // フィルタリング
  const filteredContents = mockContents.filter((content) => {
    const matchesSearch = content.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || content.status === statusFilter;
    const matchesType = typeFilter === 'all' || content.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // 著者を取得
  const getAuthor = (authorId: string) => {
    return mockUsers.find((u) => u.id === authorId);
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">コンテンツ管理</h1>
          <p className="text-muted-foreground">
            記事・ニュース・特集などのコンテンツを管理します
          </p>
        </div>
        <Button asChild className="gradient-brand text-white hover:opacity-90">
          <Link href="/contents/new">
            <Plus className="mr-2 h-4 w-4" />
            コンテンツを作成
          </Link>
        </Button>
      </div>

      {/* タブナビゲーション */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="article">記事</TabsTrigger>
          <TabsTrigger value="news">ニュース</TabsTrigger>
          <TabsTrigger value="feature">特集</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* 統計カード */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="widget-card-blue border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription className="text-white/80">全コンテンツ</CardDescription>
                <CardTitle className="text-3xl font-bold text-white">{mockContents.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="widget-card-green border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription className="text-white/80">公開中</CardDescription>
                <CardTitle className="text-3xl font-bold text-white">
                  {mockContents.filter((c) => c.status === 'published').length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="widget-card-amber border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription className="text-white/80">下書き</CardDescription>
                <CardTitle className="text-3xl font-bold text-white">
                  {mockContents.filter((c) => c.status === 'draft').length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="widget-card-purple border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription className="text-white/80">予約公開</CardDescription>
                <CardTitle className="text-3xl font-bold text-white">
                  {mockContents.filter((c) => c.scheduledAt).length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* フィルター・検索 */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="タイトルで検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="ステータス" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="published">公開中</SelectItem>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="review">レビュー中</SelectItem>
                      <SelectItem value="archived">アーカイブ</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="タイプ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="article">記事</SelectItem>
                      <SelectItem value="news">ニュース</SelectItem>
                      <SelectItem value="feature">特集</SelectItem>
                      <SelectItem value="page">固定ページ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">画像</TableHead>
                      <TableHead>タイトル</TableHead>
                      <TableHead>タイプ</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>著者</TableHead>
                      <TableHead>公開日</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          該当するコンテンツがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContents.map((content) => {
                        const author = getAuthor(content.authorId);
                        const TypeIcon = typeConfig[content.type].icon;
                        return (
                          <TableRow key={content.id}>
                            <TableCell>
                              <div className="relative h-12 w-16 overflow-hidden rounded-md bg-muted">
                                {content.featuredImage ? (
                                  <Image
                                    src={content.featuredImage}
                                    alt={content.title}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    <TypeIcon className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <Link
                                  href={`/contents/${content.id}/edit`}
                                  className="font-medium hover:underline hover:text-orange-600 line-clamp-1"
                                >
                                  {content.title}
                                </Link>
                                {content.excerpt && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {content.excerpt}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {typeConfig[content.type].label}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusConfig[content.status].variant}>
                                {statusConfig[content.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {author && (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={author.avatar} />
                                    <AvatarFallback className="text-xs">
                                      {author.name.slice(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{author.name}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {content.scheduledAt ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  {formatDate(content.scheduledAt)}
                                </div>
                              ) : (
                                <span className="text-sm">
                                  {formatDate(content.publishedAt)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">メニュー</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/contents/${content.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      プレビュー
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/contents/${content.id}/edit`}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      編集
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Copy className="mr-2 h-4 w-4" />
                                    複製
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Archive className="mr-2 h-4 w-4" />
                                    アーカイブ
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    削除
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 他のタブも同様のコンテンツを表示（フィルター適用済み） */}
        {['article', 'news', 'feature'].map((type) => (
          <TabsContent key={type} value={type}>
            <Card>
              <CardContent className="pt-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">画像</TableHead>
                        <TableHead>タイトル</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead>著者</TableHead>
                        <TableHead>公開日</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockContents
                        .filter((c) => c.type === type)
                        .map((content) => {
                          const author = getAuthor(content.authorId);
                          const TypeIcon = typeConfig[content.type].icon;
                          return (
                            <TableRow key={content.id}>
                              <TableCell>
                                <div className="relative h-12 w-16 overflow-hidden rounded-md bg-muted">
                                  {content.featuredImage ? (
                                    <Image
                                      src={content.featuredImage}
                                      alt={content.title}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                      <TypeIcon className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/contents/${content.id}/edit`}
                                  className="font-medium hover:underline hover:text-orange-600"
                                >
                                  {content.title}
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusConfig[content.status].variant}>
                                  {statusConfig[content.status].label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {author && (
                                  <span className="text-sm">{author.name}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {formatDate(content.publishedAt)}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}


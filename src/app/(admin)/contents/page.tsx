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
        <Button asChild className="btn-premium">
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
          {/* 統計カード - オレンジグラデーション */}
          <div className="grid gap-4 md:grid-cols-4">
            {/* 全コンテンツ - 薄いオレンジ */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100/50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/40 border border-orange-100 dark:border-orange-800/30 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
                  <FileText className="h-4 w-4 text-orange-500" />
                </div>
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">全コンテンツ</span>
              </div>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{mockContents.length}</p>
            </div>
            
            {/* 公開中 - やや濃いオレンジ */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-100 via-orange-200/60 to-amber-100 dark:from-orange-900/50 dark:via-orange-800/40 dark:to-amber-900/50 border border-orange-200 dark:border-orange-700/40 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
                  <Eye className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-orange-800 dark:text-orange-200">公開中</span>
              </div>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                {mockContents.filter((c) => c.status === 'published').length}
              </p>
            </div>
            
            {/* 下書き - 濃いオレンジ */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-200 via-orange-300/70 to-amber-200 dark:from-orange-800/60 dark:via-orange-700/50 dark:to-amber-800/60 border border-orange-300 dark:border-orange-600/50 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70">
                  <Edit className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-orange-800 dark:text-orange-200">下書き</span>
              </div>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                {mockContents.filter((c) => c.status === 'draft').length}
              </p>
            </div>
            
            {/* 予約公開 - 最も濃いオレンジ */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 dark:from-orange-600 dark:via-orange-500 dark:to-amber-600 border border-orange-400 dark:border-orange-500 shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/30">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <span className="text-xs font-medium text-white/90">予約公開</span>
              </div>
              <p className="text-3xl font-bold text-white">
                {mockContents.filter((c) => c.scheduledAt).length}
              </p>
            </div>
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


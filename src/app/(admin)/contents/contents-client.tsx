'use client';

import { useState, useTransition } from 'react';
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
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageTabs } from '@/components/layout/page-tabs';
import type { ContentType, ContentStatus } from '@/types';
import type { ContentData } from '@/lib/actions/contents';
import { deleteContent, archiveContent, duplicateContent, publishContent } from '@/lib/actions/contents';
import { toast } from 'sonner';

const contentTabs = [
  { label: '一覧', href: '/contents', exact: true },
];

// デフォルトのタイプ設定
const defaultTypeConfig: Record<string, { label: string; icon: React.ElementType }> = {
  article: { label: '記事', icon: FileText },
  news: { label: 'ニュース', icon: Newspaper },
  page: { label: '固定ページ', icon: FileText },
  feature: { label: '特集', icon: Star },
  qa: { label: 'Q&A', icon: FileText },
  faq: { label: 'FAQ', icon: FileText },
  guide: { label: 'ガイド', icon: FileText },
  announcement: { label: 'お知らせ', icon: Newspaper },
};

// タイプ設定を取得（未知のタイプにもフォールバック）
const getTypeConfig = (type: string) => {
  return defaultTypeConfig[type] || { label: type, icon: FileText };
};

// ステータス設定
const statusConfig: Record<ContentStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: '下書き', variant: 'outline' },
  review: { label: 'レビュー中', variant: 'secondary' },
  published: { label: '公開中', variant: 'default' },
  archived: { label: 'アーカイブ', variant: 'destructive' },
};

// 日付フォーマット
const formatDate = (dateString?: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

interface ContentsClientProps {
  initialContents: ContentData[];
  stats: {
    total: number;
    published: number;
    draft: number;
    scheduled: number;
  };
  organizationId: string;
}

export default function ContentsClient({ initialContents, stats, organizationId }: ContentsClientProps) {
  const [contents, setContents] = useState<ContentData[]>(initialContents);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<ContentData | null>(null);
  const [isPending, startTransition] = useTransition();

  // フィルタリング
  const filteredContents = contents.filter((content) => {
    const matchesSearch = content.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || content.status === statusFilter;
    const matchesType = typeFilter === 'all' || content.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // 削除処理
  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    startTransition(async () => {
      const { success, error } = await deleteContent(deleteTarget.id, organizationId);
      if (success) {
        setContents(contents.filter(c => c.id !== deleteTarget.id));
        toast.success(`「${deleteTarget.title}」を削除しました`);
      } else {
        toast.error(error || '削除に失敗しました');
      }
      setDeleteTarget(null);
    });
  };

  // アーカイブ処理
  const handleArchive = async (content: ContentData) => {
    startTransition(async () => {
      const { success, error } = await archiveContent(content.id, organizationId);
      if (success) {
        setContents(contents.map(c => 
          c.id === content.id ? { ...c, status: 'archived' as ContentStatus } : c
        ));
        toast.success(`「${content.title}」をアーカイブしました`);
      } else {
        toast.error(error || 'アーカイブに失敗しました');
      }
    });
  };

  // 複製処理
  const handleDuplicate = async (content: ContentData) => {
    startTransition(async () => {
      const { data, error } = await duplicateContent(content.id, organizationId);
      if (data) {
        setContents([data, ...contents]);
        toast.success(`「${content.title}」を複製しました`);
      } else {
        toast.error(error || '複製に失敗しました');
      }
    });
  };

  // 公開処理
  const handlePublish = async (content: ContentData) => {
    startTransition(async () => {
      const { success, error } = await publishContent(content.id, organizationId);
      if (success) {
        setContents(contents.map(c => 
          c.id === content.id ? { ...c, status: 'published' as ContentStatus, publishedAt: new Date().toISOString() } : c
        ));
        toast.success(`「${content.title}」を公開しました`);
      } else {
        toast.error(error || '公開に失敗しました');
      }
    });
  };

  // コンテンツ行をレンダリング
  const renderContentRow = (content: ContentData) => {
    const typeInfo = getTypeConfig(content.type);
    const TypeIcon = typeInfo.icon;
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
              {typeInfo.label}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={statusConfig[content.status].variant}>
            {statusConfig[content.status].label}
          </Badge>
        </TableCell>
        <TableCell>
          {content.authorName && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={content.authorAvatar || undefined} />
                <AvatarFallback className="text-xs">
                  {content.authorName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{content.authorName}</span>
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
              <Button variant="ghost" size="icon" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
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
              <DropdownMenuItem onClick={() => handleDuplicate(content)}>
                <Copy className="mr-2 h-4 w-4" />
                複製
              </DropdownMenuItem>
              {content.status === 'draft' && (
                <DropdownMenuItem onClick={() => handlePublish(content)}>
                  <Eye className="mr-2 h-4 w-4" />
                  公開する
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {content.status !== 'archived' && (
                <DropdownMenuItem onClick={() => handleArchive(content)}>
                  <Archive className="mr-2 h-4 w-4" />
                  アーカイブ
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => setDeleteTarget(content)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">お知らせ</h1>
          <p className="text-muted-foreground">
            記事・ニュース・特集などを作成・管理します
          </p>
        </div>
        <Button asChild className="btn-premium">
          <Link href="/contents/new">
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Link>
        </Button>
      </div>

      {/* ページタブナビゲーション */}
      <PageTabs tabs={contentTabs} />

      {/* フィルタータブ（実際に使用されているタイプから動的生成） */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">すべて</TabsTrigger>
          {[...new Set(contents.map(c => c.type))].map((type) => {
            const info = getTypeConfig(type);
            return (
              <TabsTrigger key={type} value={type}>{info.label}</TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* 統計バー */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs text-muted-foreground">全件</span>
              <span className="text-sm font-semibold">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <Eye className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-700 dark:text-emerald-300">公開中</span>
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{stats.published}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
              <Edit className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs text-amber-700 dark:text-amber-300">下書き</span>
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{stats.draft}</span>
            </div>
            {stats.scheduled > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs text-blue-700 dark:text-blue-300">予約</span>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{stats.scheduled}</span>
              </div>
            )}
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
                          {contents.length === 0 
                            ? 'コンテンツがありません。「コンテンツを作成」から新しいコンテンツを追加してください。'
                            : '該当するコンテンツがありません'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredContents.map(renderContentRow)
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 他のタブも同様のコンテンツを表示（フィルター適用済み） */}
        {[...new Set(contents.map(c => c.type))].map((type) => (
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
                      {contents
                        .filter((c) => c.type === type)
                        .map((content) => {
                          const TypeIcon = getTypeConfig(content.type).icon;
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
                                {content.authorName && (
                                  <span className="text-sm">{content.authorName}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {formatDate(content.publishedAt)}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" disabled={isPending}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Link href={`/contents/${content.id}/edit`}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        編集
                                      </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicate(content)}>
                                      <Copy className="mr-2 h-4 w-4" />
                                      複製
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      className="text-destructive"
                                      onClick={() => setDeleteTarget(content)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      削除
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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

      {/* 削除確認ダイアログ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>コンテンツを削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{deleteTarget?.title}」を削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


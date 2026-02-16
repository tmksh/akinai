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
  Calendar,
  Loader2,
  Settings,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
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
import { contentTypeConfig, getContentTypeConfig } from '@/lib/content-types';

const contentTabs = [
  { label: '一覧', href: '/contents', exact: true },
  { label: 'カテゴリ', href: '/contents/categories' },
];

// タイプ設定を取得（共通設定から）
const getTypeConfig = (type: string) => {
  const config = getContentTypeConfig(type);
  return { label: config.label, icon: config.icon };
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
  /** 設定で「使う」にしたタイプのみ。空のときは新規作成不可・タイプフィルターはすべて非表示 */
  enabledContentTypes: string[];
}

export default function ContentsClient({ initialContents, stats, organizationId, enabledContentTypes }: ContentsClientProps) {
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

  // コンテンツカードをレンダリング
  const renderContentCard = (content: ContentData) => {
    const typeInfo = getTypeConfig(content.type);
    const TypeIcon = typeInfo.icon;
    const statusInfo = statusConfig[content.status];

    return (
      <Card key={content.id} className="group relative overflow-hidden transition-shadow hover:shadow-md">
        {/* サムネイル */}
        <Link href={`/contents/${content.id}/edit`} className="block">
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            {content.featuredImage ? (
              <Image
                src={content.featuredImage}
                alt={content.title}
                fill
                sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
                loading="lazy"
                className="object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                <TypeIcon className="h-8 w-8 opacity-40" />
              </div>
            )}
            {/* ステータス */}
            <div className="absolute top-1.5 left-1.5">
              <Badge variant={statusInfo.variant} className="shadow-sm text-[10px] px-1.5 py-0">
                {statusInfo.label}
              </Badge>
            </div>
            {/* タイプ */}
            <div className="absolute top-1.5 right-1.5">
              <Badge variant="secondary" className="shadow-sm text-[10px] px-1.5 py-0 gap-0.5">
                <TypeIcon className="h-3 w-3" />
                {typeInfo.label}
              </Badge>
            </div>
          </div>
        </Link>

        {/* 情報 */}
        <CardContent className="p-2">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <Link
                href={`/contents/${content.id}/edit`}
                className="font-medium text-xs leading-tight line-clamp-2 hover:underline hover:text-orange-600"
              >
                {content.title}
              </Link>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" disabled={isPending}>
                  <MoreHorizontal className="h-4 w-4" />
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
          </div>
          {/* 日付 */}
          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(content.publishedAt || content.scheduledAt)}</span>
          </div>
        </CardContent>
      </Card>
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
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/contents">
              <Settings className="mr-2 h-4 w-4" />
              タイプ管理
            </Link>
          </Button>
          {enabledContentTypes.length > 0 && (
            <Button asChild className="btn-premium">
              <Link href="/contents/new">
                <Plus className="mr-2 h-4 w-4" />
                新規作成
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ページタブナビゲーション */}
      <PageTabs tabs={contentTabs} />

      {/* フィルタータブ（設定で有効にしたタイプはすべて表示。0件でもタブを出して「このタイプで追加」できる） */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">すべて</TabsTrigger>
          {enabledContentTypes.map((type) => {
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
                  {enabledContentTypes.map((key) => {
                    const config = contentTypeConfig[key];
                    if (!config) return null;
                    return <SelectItem key={key} value={key}>{config.label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* カード一覧 */}
          {filteredContents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {contents.length === 0 ? (
                <>
                  <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-3">
                    {enabledContentTypes.length === 0
                      ? 'お知らせで使うタイプを設定すると、ここでコンテンツを作成できます'
                      : 'コンテンツがまだありません'}
                  </p>
                  {enabledContentTypes.length > 0 ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/contents/new">
                        <Plus className="mr-2 h-4 w-4" />
                        最初のコンテンツを作成
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/settings/contents">
                        <Plus className="mr-2 h-4 w-4" />
                        タイプを設定する
                      </Link>
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Search className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">該当するコンテンツがありません</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredContents.map(renderContentCard)}
            </div>
          )}
        </TabsContent>

        {/* 有効タイプごとのタブ（0件でもタブを表示し、そのタイプで新規作成できる） */}
        {enabledContentTypes.map((type) => {
          const typeContents = contents.filter((c) => c.type === type);
          const typeInfo = getTypeConfig(type);
          return (
            <TabsContent key={type} value={type}>
              {typeContents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-3">このタイプのコンテンツはまだありません</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/contents/new?type=${encodeURIComponent(type)}`}>
                      <Plus className="mr-2 h-4 w-4" />
                      {typeInfo.label}を追加
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {typeContents.map(renderContentCard)}
                </div>
              )}
            </TabsContent>
          );
        })}
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


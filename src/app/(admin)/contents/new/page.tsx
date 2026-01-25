'use client';

import { useState, useMemo, useTransition } from 'react';
import { ArrowLeft, Save, Eye, Smartphone, Monitor, EyeOff, Columns, ExternalLink, RefreshCw, Settings, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageTabs } from '@/components/layout/page-tabs';
import { cn } from '@/lib/utils';
import { useFrontendUrl, useOrganization } from '@/components/providers/organization-provider';
import { createContent } from '@/lib/actions/contents';
import { toast } from 'sonner';
import type { ContentType, ContentStatus } from '@/types';

const contentTabs = [
  { label: '記事一覧', href: '/contents', exact: true },
  { label: '記事作成', href: '/contents/new' },
  { label: 'ニュース', href: '/contents/news' },
  { label: '特集', href: '/contents/features' },
];

export default function NewContentPage() {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentType, setContentType] = useState<ContentType>('article');
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const [tags, setTags] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { organization } = useOrganization();
  const frontendUrl = useFrontendUrl();
  const isFrontendConnected = !!frontendUrl;

  // プレビュー用のデータをURLパラメータとしてエンコード
  const previewData = useMemo(() => {
    return {
      title,
      slug,
      content,
      contentType,
    };
  }, [title, slug, content, contentType]);

  // プレビューURLを生成
  const previewUrl = useMemo(() => {
    if (!frontendUrl) return null;
    const params = new URLSearchParams({
      preview: 'true',
      data: btoa(encodeURIComponent(JSON.stringify(previewData))),
    });
    return `${frontendUrl}/articles/preview?${params.toString()}`;
  }, [frontendUrl, previewData]);

  // iframeを再読み込み
  const refreshPreview = () => {
    setPreviewKey(prev => prev + 1);
  };

  // スラッグを自動生成
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // タイトル変更時にスラッグも自動更新
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value));
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (!organization?.id) {
      toast.error('組織が設定されていません');
      return;
    }

    if (!title.trim()) {
      toast.error('タイトルを入力してください');
      return;
    }

    if (!slug.trim()) {
      toast.error('スラッグを入力してください');
      return;
    }

    // マークダウン風コンテンツをブロック形式に変換
    const blocks = content.split('\n').filter(Boolean).map((line, index) => ({
      id: `block-${index}`,
      type: line.startsWith('#') ? 'heading' : 'paragraph',
      content: line.replace(/^#+\s*/, ''),
      order: index,
    }));

    startTransition(async () => {
      const { data, error } = await createContent({
        type: contentType,
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || undefined,
        blocks,
        status,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        publishedAt: status === 'published' ? new Date().toISOString() : undefined,
      }, organization.id);

      if (data) {
        toast.success(`「${data.title}」を作成しました`);
        router.push('/contents');
      } else {
        toast.error(error || '保存に失敗しました');
      }
    });
  };

  // マークダウン風のシンプルなレンダリング
  const renderContent = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // 見出し
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-bold mt-6 mb-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold mt-6 mb-4">{line.slice(2)}</h1>;
      }
      // 空行
      if (line.trim() === '') {
        return <br key={index} />;
      }
      // 通常のパラグラフ
      return <p key={index} className="mb-2 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">コンテンツ管理</h1>
            <p className="text-muted-foreground">新しい記事を作成します</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-1 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className={cn(!showPreview && "bg-background shadow-sm")}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(true)}
              className={cn(showPreview && "bg-background shadow-sm")}
            >
              <Columns className="h-4 w-4" />
            </Button>
          </div>
          <Button className="btn-premium" onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存
          </Button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={contentTabs} />

      <div className={cn(
        "grid gap-6",
        showPreview ? "lg:grid-cols-2" : "lg:grid-cols-3"
      )}>
        {/* 編集エリア */}
        <div className={cn(showPreview ? "" : "lg:col-span-2", "space-y-6")}>
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">タイトル</Label>
                <Input
                  id="title"
                  placeholder="記事のタイトルを入力"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">スラッグ</Label>
                <Input
                  id="slug"
                  placeholder="article-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">概要</Label>
                <Textarea
                  id="excerpt"
                  placeholder="記事の概要を入力（検索結果等に表示）"
                  className="min-h-[80px]"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">本文</Label>
                <Textarea
                  id="content"
                  placeholder="記事の本文を入力...&#10;&#10;# 見出し1&#10;## 見出し2&#10;### 見出し3&#10;&#10;本文テキスト"
                  className="min-h-[300px] font-mono"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {!showPreview && (
            <div className="space-y-6">
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle>公開設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>ステータス</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                      <SelectTrigger>
                        <SelectValue placeholder="ステータスを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">下書き</SelectItem>
                        <SelectItem value="published">公開</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>記事タイプ</Label>
                    <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                      <SelectTrigger>
                        <SelectValue placeholder="タイプを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="article">記事</SelectItem>
                        <SelectItem value="news">ニュース</SelectItem>
                        <SelectItem value="feature">特集</SelectItem>
                        <SelectItem value="page">ページ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader>
                  <CardTitle>SEO設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>SEOタイトル</Label>
                    <Input
                      placeholder="検索結果に表示されるタイトル"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SEOディスクリプション</Label>
                    <Textarea
                      placeholder="検索結果に表示される説明文"
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* プレビューエリア */}
        {showPreview && (
          <div className="space-y-4">
            {/* プレビューコントロール */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">リアルタイムプレビュー</h3>
                {isFrontendConnected && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    接続済み
                  </Badge>
                )}
                {!isFrontendConnected && (
                  <Link href="/settings/organization" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Settings className="h-3 w-3" />
                    フロントエンド連携を設定
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* フロントエンド接続時の追加コントロール */}
                {isFrontendConnected && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshPreview}
                      className="h-7 px-2"
                      title="プレビューを更新"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => previewUrl && window.open(previewUrl, '_blank')}
                      className="h-7 px-2"
                      title="新しいタブで開く"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                    className={cn(
                      "h-7 px-2",
                      previewMode === 'desktop' && "bg-background shadow-sm"
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                    className={cn(
                      "h-7 px-2",
                      previewMode === 'mobile' && "bg-background shadow-sm"
                    )}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* プレビューフレーム */}
            <div className={cn(
              "border rounded-xl bg-white dark:bg-slate-900 shadow-lg overflow-hidden transition-all duration-300",
              previewMode === 'mobile' ? "max-w-[375px] mx-auto" : ""
            )}>
              {/* モックブラウザバー */}
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center gap-2 border-b">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white dark:bg-slate-700 rounded-md px-3 py-1 text-xs text-muted-foreground truncate">
                    {isFrontendConnected 
                      ? `${frontendUrl}/articles/${slug || 'preview'}`
                      : `https://example.com/${slug || 'article-slug'}`
                    }
                  </div>
                </div>
              </div>

              {/* フロントエンド接続時: iframe表示 */}
              {isFrontendConnected && previewUrl ? (
                <div className={cn(
                  "relative",
                  previewMode === 'mobile' ? "h-[500px]" : "h-[600px]"
                )}>
                  <iframe
                    key={previewKey}
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="記事プレビュー"
                  />
                </div>
              ) : (
                /* フロントエンド未接続時: モックプレビュー */
                <div className={cn(
                  "p-6 min-h-[400px] overflow-auto",
                  previewMode === 'mobile' ? "text-sm" : ""
                )}>
                  {title || content ? (
                    <article className="prose dark:prose-invert max-w-none">
                      {title && (
                        <h1 className={cn(
                          "font-bold mb-4",
                          previewMode === 'mobile' ? "text-xl" : "text-3xl"
                        )}>
                          {title}
                        </h1>
                      )}
                      {content && (
                        <div className="text-slate-600 dark:text-slate-300">
                          {renderContent(content)}
                        </div>
                      )}
                    </article>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                      <Eye className="h-12 w-12 mb-4 opacity-20" />
                      <p className="text-sm">タイトルや本文を入力すると</p>
                      <p className="text-sm">ここにプレビューが表示されます</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* サイドバー設定（プレビュー表示時） */}
            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">公開設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">ステータス</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="ステータスを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="published">公開</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">記事タイプ</Label>
                  <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="タイプを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">記事</SelectItem>
                      <SelectItem value="news">ニュース</SelectItem>
                      <SelectItem value="feature">特集</SelectItem>
                      <SelectItem value="page">ページ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">タグ</CardTitle>
              </CardHeader>
              <CardContent>
                <Input 
                  placeholder="タグを入力（カンマ区切り）" 
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">サムネイル</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    画像をアップロード（保存後に設定可能）
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* プレビュー非表示時のサイドバー */}
        {!showPreview && (
          <div className="space-y-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>サムネイル</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    画像をアップロード（保存後に設定可能）
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardHeader>
                <CardTitle>タグ</CardTitle>
              </CardHeader>
              <CardContent>
                <Input 
                  placeholder="タグを入力（カンマ区切り）" 
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

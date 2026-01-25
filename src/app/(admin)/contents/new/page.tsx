'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Smartphone, 
  Monitor, 
  Loader2,
  Image as ImageIcon,
  Settings2,
  ChevronDown,
  Calendar,
  Tag,
  Globe,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PageTabs } from '@/components/layout/page-tabs';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/components/providers/organization-provider';
import { createContent } from '@/lib/actions/contents';
import { toast } from 'sonner';
import type { ContentType, ContentStatus } from '@/types';

const contentTabs = [
  { label: '一覧', href: '/contents', exact: true },
  { label: '新規作成', href: '/contents/new' },
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
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [tags, setTags] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { organization } = useOrganization();
  
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの高さを自動調整
  const autoResize = (element: HTMLTextAreaElement | null) => {
    if (element) {
      element.style.height = 'auto';
      element.style.height = `${element.scrollHeight}px`;
    }
  };

  useEffect(() => {
    autoResize(titleRef.current);
  }, [title]);

  useEffect(() => {
    autoResize(contentRef.current);
  }, [content]);

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

  // マークダウン風のレンダリング（プレビュー用）
  const renderPreviewContent = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-semibold mt-6 mb-2">{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-bold mt-8 mb-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold mt-8 mb-4">{line.slice(2)}</h1>;
      }
      if (line.trim() === '') {
        return <div key={index} className="h-4" />;
      }
      return <p key={index} className="mb-4 leading-relaxed text-slate-600 dark:text-slate-300">{line}</p>;
    });
  };

  const statusLabel = status === 'draft' ? '下書き' : '公開';
  const typeLabel = {
    article: '記事',
    news: 'ニュース',
    feature: '特集',
    page: 'ページ',
  }[contentType];

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
            <h1 className="text-2xl font-bold">お知らせ</h1>
            <p className="text-muted-foreground">新しい記事を作成します</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* デバイス切り替え */}
          <div className="hidden md:flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
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

          {/* 設定ポップオーバー */}
          <Popover open={showSettings} onOpenChange={setShowSettings}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">設定</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">ステータス</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="published">公開</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">記事タイプ</Label>
                  <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="article">記事</SelectItem>
                      <SelectItem value="news">ニュース</SelectItem>
                      <SelectItem value="feature">特集</SelectItem>
                      <SelectItem value="page">ページ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">スラッグ（URL）</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="article-slug"
                    className="h-9 font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">タグ（カンマ区切り）</Label>
                  <Input 
                    placeholder="タグ1, タグ2, タグ3" 
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="h-9"
                  />
                </div>

                <Separator />

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium">
                    SEO設定
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">SEOタイトル</Label>
                      <Input
                        placeholder="検索結果に表示されるタイトル"
                        value={seoTitle}
                        onChange={(e) => setSeoTitle(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">SEOディスクリプション</Label>
                      <Input
                        placeholder="検索結果に表示される説明文"
                        value={seoDescription}
                        onChange={(e) => setSeoDescription(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </PopoverContent>
          </Popover>

          {/* 保存ボタン */}
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

      {/* メインエディタ（プレビュー一体型） */}
      <div className="flex justify-center">
        <div className={cn(
          "w-full transition-all duration-300",
          previewMode === 'mobile' ? "max-w-[375px]" : "max-w-4xl"
        )}>
          {/* モックブラウザ */}
          <div className="border rounded-xl bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
            {/* ブラウザバー */}
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 flex items-center gap-3 border-b">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1">
                <div className="bg-white dark:bg-slate-700 rounded-md px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  <span className="truncate">yoursite.com/articles/{slug || 'new-article'}</span>
                </div>
              </div>
            </div>

            {/* 記事メタ情報バー */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b flex items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3 w-3" />
                {typeLabel}
              </Badge>
              <Badge variant={status === 'published' ? 'default' : 'secondary'} className="gap-1">
                {status === 'published' ? <Globe className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                {statusLabel}
              </Badge>
              {tags && (
                <div className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  <span>{tags.split(',').length}個のタグ</span>
                </div>
              )}
              <div className="flex items-center gap-1 ml-auto">
                <Calendar className="h-3 w-3" />
                <span>{new Date().toLocaleDateString('ja-JP')}</span>
              </div>
            </div>

            {/* エディタ本体 */}
            <div className={cn(
              "p-6 md:p-10 min-h-[500px]",
              previewMode === 'mobile' && "p-4"
            )}>
              {/* サムネイル追加エリア */}
              <button className="w-full mb-8 border-2 border-dashed rounded-xl p-6 text-center hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors group">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                <p className="text-sm text-muted-foreground group-hover:text-orange-600">
                  アイキャッチ画像を追加
                </p>
              </button>

              {/* タイトル入力 */}
              <textarea
                ref={titleRef}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="タイトルを入力..."
                className={cn(
                  "w-full bg-transparent border-0 outline-none resize-none font-bold placeholder:text-slate-300 dark:placeholder:text-slate-600",
                  previewMode === 'mobile' ? "text-2xl" : "text-4xl",
                  "leading-tight mb-4"
                )}
                rows={1}
              />

              {/* 概要入力 */}
              <input
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="記事の概要を入力（検索結果やSNSシェア時に表示されます）"
                className="w-full bg-transparent border-0 outline-none text-lg text-muted-foreground placeholder:text-slate-300 dark:placeholder:text-slate-600 mb-8"
              />

              <Separator className="mb-8" />

              {/* 本文入力 */}
              <textarea
                ref={contentRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="本文を入力...

# で見出し1
## で見出し2  
### で見出し3

普通のテキストは段落になります。
空行で段落を分けられます。"
                className={cn(
                  "w-full bg-transparent border-0 outline-none resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600 leading-relaxed",
                  previewMode === 'mobile' ? "text-base" : "text-lg"
                )}
                rows={10}
              />

              {/* リアルタイムプレビュー（入力内容をレンダリング） */}
              {content && (
                <>
                  <Separator className="my-8" />
                  <div className="pt-4">
                    <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      プレビュー
                    </p>
                    <article className="prose dark:prose-invert max-w-none">
                      {renderPreviewContent(content)}
                    </article>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ヘルプテキスト */}
          <p className="text-xs text-muted-foreground text-center mt-4">
            タイトルと本文に直接入力してください。「#」で見出し、空行で段落を作成できます。
          </p>
        </div>
      </div>
    </div>
  );
}

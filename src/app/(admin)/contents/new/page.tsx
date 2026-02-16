'use client';

import { useState, useTransition, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Smartphone, 
  Monitor, 
  Loader2,
  Eye,
  EyeOff,
  Columns,
  Settings,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageTabs } from '@/components/layout/page-tabs';
import { CustomFields, type CustomField } from '@/components/products/custom-fields';
import { FieldLabel } from '@/components/products/field-label';
import { cn } from '@/lib/utils';
import { useFrontendUrl, useOrganization } from '@/components/providers/organization-provider';
import { createContent } from '@/lib/actions/contents';
import { toast } from 'sonner';
import type { ContentType, ContentStatus } from '@/types';
import type { QAPairBlock, GalleryItemBlock } from '@/types/content-blocks';
import { getEditorType, contentTypeConfig } from '@/lib/content-types';
import { getEnabledContentTypes } from '@/lib/actions/settings';
import { getContentCategories, setContentCategories, type ContentCategory } from '@/lib/actions/contents';
import { Checkbox } from '@/components/ui/checkbox';
import { QAEditor } from '../_components/qa-editor';
import { GalleryEditor } from '../_components/gallery-editor';
import { RichTextEditor, htmlToBlocks } from '@/components/editor/rich-text-editor';

const contentTabs = [
  { label: '一覧', href: '/contents', exact: true },
];

export default function NewContentPage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [contentType, setContentType] = useState<ContentType>('article');
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [tags, setTags] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [qaPairs, setQaPairs] = useState<QAPairBlock[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItemBlock[]>([]);
  const [enabledContentTypes, setEnabledContentTypes] = useState<string[]>([]);
  const [enabledTypesLoaded, setEnabledTypesLoaded] = useState(false);
  const [allCategories, setAllCategories] = useState<ContentCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [showPreview, setShowPreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { organization } = useOrganization();
  const frontendUrl = useFrontendUrl();
  const isFrontendConnected = !!frontendUrl;

  useEffect(() => {
    if (!organization?.id) return;
    Promise.all([
      getEnabledContentTypes(organization.id),
      getContentCategories(organization.id),
    ]).then(([typeResult, catResult]) => {
      const enabled = typeResult.data || [];
      setEnabledContentTypes(enabled);
      setEnabledTypesLoaded(true);
      setAllCategories(catResult.data || []);

      const typeParam = searchParams.get('type');
      if (typeParam && enabled.includes(typeParam)) {
        setContentType(typeParam as ContentType);
      } else if (enabled.length > 0 && !enabled.includes(contentType)) {
        setContentType(enabled[0] as ContentType);
      }
    });
  }, [organization?.id]);

  // プレビュー用データ・URL
  const previewData = useMemo(() => ({ title, content, contentType }), [title, content, contentType]);
  const previewUrl = useMemo(() => {
    if (!frontendUrl) return null;
    const params = new URLSearchParams({
      preview: 'true',
      data: btoa(encodeURIComponent(JSON.stringify(previewData))),
    });
    return `${frontendUrl}/articles/preview?${params.toString()}`;
  }, [frontendUrl, previewData]);
  const refreshPreview = () => setPreviewKey((k) => k + 1);

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

    // タイプ別にブロックを構築
    const editorType = getEditorType(contentType);
    let blocks: unknown[];
    if (editorType === 'qa') {
      blocks = qaPairs.map((p, i) => ({ ...p, order: i }));
    } else if (editorType === 'gallery') {
      blocks = galleryItems.map((item, i) => ({ ...item, order: i }));
    } else {
      blocks = htmlToBlocks(content);
    }

    // スラッグをタイトルから自動生成
    const autoSlug = title.trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() || `content-${Date.now().toString(36)}`;

    startTransition(async () => {
      const { data, error } = await createContent({
        type: contentType,
        title: title.trim(),
        slug: autoSlug,
        excerpt: excerpt.trim() || undefined,
        blocks,
        status,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        customFields: customFields.length > 0
          ? customFields.map(f => ({ key: f.key, label: f.label, value: f.value, type: f.type, ...(f.options && { options: f.options }) }))
          : undefined,
        publishedAt: status === 'published' ? new Date().toISOString() : undefined,
      }, organization.id);

      if (data) {
        // カテゴリ紐付け
        if (selectedCategoryIds.length > 0) {
          await setContentCategories(data.id, selectedCategoryIds);
        }
        toast.success(`「${data.title}」を作成しました`);
        router.push('/contents');
      } else {
        toast.error(error || '保存に失敗しました');
      }
    });
  };

  const editorType = getEditorType(contentType);

  if (!enabledTypesLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (enabledContentTypes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contents">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">お知らせ</h1>
            <p className="text-muted-foreground">コンテンツを作成するには、まず使うタイプを設定してください</p>
          </div>
        </div>
        <PageTabs tabs={contentTabs} />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground mb-4">設定で「お知らせで使うタイプ」を追加すると、ここでコンテンツを作成できます</p>
            <Button asChild>
              <Link href="/settings/contents">タイプを設定する</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <div className="flex items-center border rounded-lg p-1 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className={cn(!showPreview && 'bg-background shadow-sm')}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(true)}
              className={cn(showPreview && 'bg-background shadow-sm')}
            >
              <Columns className="h-4 w-4" />
            </Button>
          </div>
          <Button className="btn-premium" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            保存
          </Button>
        </div>
      </div>

      <PageTabs tabs={contentTabs} />

      {/* 左: 入力エリア / 右: プレビュー（商品登録と同じレイアウト） */}
      <div className={cn('grid gap-6', showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-3')}>
        {/* 左: 基本情報・本文・カスタムフィールド */}
        <div className={cn(showPreview ? '' : 'lg:col-span-2', 'space-y-6')}>
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel fieldKey="type">コンテンツタイプ</FieldLabel>
                <Select
                  value={enabledContentTypes.includes(contentType) ? contentType : (enabledContentTypes[0] ?? '')}
                  onValueChange={(v) => setContentType(v as ContentType)}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="タイプを選択" /></SelectTrigger>
                  <SelectContent>
                    {enabledContentTypes.map((key) => {
                      const config = contentTypeConfig[key];
                      if (!config) return null;
                      return <SelectItem key={key} value={key}>{config.label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  設定で追加したタイプのみ選択できます
                  {contentType && (
                    <span className="block mt-1">
                      APIで使う値: <code className="text-[10px] font-mono bg-muted/50 px-1 py-0.5 rounded">{contentType}</code>
                    </span>
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="title" fieldKey="title">タイトル</FieldLabel>
                <Input
                  id="title"
                  placeholder="記事のタイトルを入力"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="excerpt" fieldKey="excerpt">概要</FieldLabel>
                <Textarea
                  id="excerpt"
                  placeholder="記事の概要を入力"
                  className="min-h-[80px]"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="content" fieldKey="blocks">
                  {editorType === 'qa' ? '質問と回答' : editorType === 'gallery' ? '画像' : '本文'}
                </FieldLabel>
                {editorType === 'qa' ? (
                  <QAEditor pairs={qaPairs} onChange={setQaPairs} disabled={isPending} />
                ) : editorType === 'gallery' ? (
                  <GalleryEditor
                    items={galleryItems}
                    onChange={setGalleryItems}
                    organizationId={organization?.id || ''}
                    disabled={isPending}
                  />
                ) : (
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="ここに本文を入力..."
                    disabled={isPending}
                    minHeight="300px"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <CustomFields fields={customFields} onChange={setCustomFields} disabled={isPending} />

          {!showPreview && (
            <Card>
              <CardHeader>
                <CardTitle>公開設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="published">公開</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右: リアルタイムプレビュー + 公開設定・タグ */}
        {showPreview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">リアルタイムプレビュー</h3>
                {isFrontendConnected && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">接続済み</Badge>
                )}
                {!isFrontendConnected && (
                  <Link href="/settings/organization" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                    <Settings className="h-3 w-3" />
                    フロントエンド連携を設定
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isFrontendConnected && (
                  <>
                    <Button variant="ghost" size="sm" onClick={refreshPreview} className="h-7 px-2">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => previewUrl && window.open(previewUrl, '_blank')} className="h-7 px-2">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
                  <Button variant="ghost" size="sm" onClick={() => setPreviewMode('desktop')} className={cn('h-7 px-2', previewMode === 'desktop' && 'bg-background shadow-sm')}>
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewMode('mobile')} className={cn('h-7 px-2', previewMode === 'mobile' && 'bg-background shadow-sm')}>
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className={cn('border rounded-xl bg-white dark:bg-slate-900 shadow-lg overflow-hidden', previewMode === 'mobile' ? 'max-w-[375px] mx-auto' : '')}>
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center gap-2 border-b">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white dark:bg-slate-700 rounded-md px-3 py-1 text-xs text-muted-foreground truncate">
                    {isFrontendConnected ? `${frontendUrl}/articles/new-article` : `https://example.com/new-article`}
                  </div>
                </div>
              </div>

              {isFrontendConnected && previewUrl ? (
                <div className={cn('relative', previewMode === 'mobile' ? 'h-[500px]' : 'h-[600px]')}>
                  <iframe key={previewKey} src={previewUrl} className="w-full h-full border-0" title="記事プレビュー" />
                </div>
              ) : (
                <div className={cn('p-6 min-h-[400px] overflow-auto', previewMode === 'mobile' && 'text-sm')}>
                  {title || content || qaPairs.length > 0 || galleryItems.length > 0 ? (
                    <article className="prose dark:prose-invert max-w-none">
                      {title && <h1 className={cn('font-bold mb-4', previewMode === 'mobile' ? 'text-xl' : 'text-3xl')}>{title}</h1>}
                      {editorType === 'qa' && qaPairs.length > 0 && (
                        <div className="space-y-4 not-prose">
                          {qaPairs.map((pair, i) => (
                            <div key={pair.id} className="border rounded-lg p-4">
                              <p className="font-semibold text-sm">Q{i + 1}. {pair.question || '（未入力）'}</p>
                              <p className="text-sm text-muted-foreground mt-2">{pair.answer || '（未入力）'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {editorType === 'gallery' && galleryItems.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 not-prose">
                          {galleryItems.map((item) => (
                            <div key={item.id} className="space-y-1">
                              <div className="relative aspect-square rounded overflow-hidden bg-muted">
                                <Image src={item.url} alt={item.alt} fill className="object-cover" />
                              </div>
                              {item.caption && <p className="text-xs text-muted-foreground">{item.caption}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                      {editorType === 'text' && content && (
                        <div
                          className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300"
                          dangerouslySetInnerHTML={{ __html: content }}
                        />
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">公開設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">ステータス</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="published">公開</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">タグ</CardTitle>
              </CardHeader>
              <CardContent>
                <Input placeholder="タグを入力（カンマ区切り）" value={tags} onChange={(e) => setTags(e.target.value)} />
              </CardContent>
            </Card>

            {allCategories.filter((c) => c.type === contentType).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">カテゴリ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {allCategories
                    .filter((c) => c.type === contentType)
                    .map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedCategoryIds.includes(cat.id)}
                          onCheckedChange={(checked) =>
                            setSelectedCategoryIds((prev) =>
                              checked ? [...prev, cat.id] : prev.filter((id) => id !== cat.id)
                            )
                          }
                        />
                        <span className="text-sm">{cat.name}</span>
                      </label>
                    ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!showPreview && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>タグ</CardTitle></CardHeader>
              <CardContent>
                <Input placeholder="タグを入力（カンマ区切り）" value={tags} onChange={(e) => setTags(e.target.value)} />
              </CardContent>
            </Card>
            {allCategories.filter((c) => c.type === contentType).length > 0 && (
              <Card>
                <CardHeader><CardTitle>カテゴリ</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {allCategories
                    .filter((c) => c.type === contentType)
                    .map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedCategoryIds.includes(cat.id)}
                          onCheckedChange={(checked) =>
                            setSelectedCategoryIds((prev) =>
                              checked ? [...prev, cat.id] : prev.filter((id) => id !== cat.id)
                            )
                          }
                        />
                        <span className="text-sm">{cat.name}</span>
                      </label>
                    ))}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle>SEO設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>SEOタイトル</Label>
                  <Input placeholder="検索結果に表示されるタイトル" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>SEOディスクリプション</Label>
                  <Textarea placeholder="検索結果に表示される説明文" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

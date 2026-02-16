'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { ArrowLeft, Save, Eye, Smartphone, Monitor, EyeOff, Columns, ExternalLink, RefreshCw, Settings, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PageTabs } from '@/components/layout/page-tabs';
import { CustomFields, type CustomField } from '@/components/products/custom-fields';
import { FieldLabel } from '@/components/products/field-label';
import { cn } from '@/lib/utils';
import { useFrontendUrl, useOrganization } from '@/components/providers/organization-provider';
import { getContent, updateContent, deleteContent, publishContent } from '@/lib/actions/contents';
import { toast } from 'sonner';
import type { ContentType, ContentStatus } from '@/types';
import type { ContentData } from '@/lib/actions/contents';
import type { QAPairBlock, GalleryItemBlock } from '@/types/content-blocks';
import { getEditorType, contentTypeConfig } from '@/lib/content-types';
import { getEnabledContentTypes } from '@/lib/actions/settings';
import { getContentCategories, getContentCategoryIds, setContentCategories, type ContentCategory } from '@/lib/actions/contents';
import { Checkbox } from '@/components/ui/checkbox';
import { QAEditor } from '../../_components/qa-editor';
import { GalleryEditor } from '../../_components/gallery-editor';
import { RichTextEditor, blocksToHtml, htmlToBlocks } from '@/components/editor/rich-text-editor';

const contentTabs = [
  { label: '一覧', href: '/contents', exact: true },
  { label: '新規作成', href: '/contents/new' },
];

export default function EditContentPage() {
  const params = useParams();
  const contentId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [contentData, setContentData] = useState<ContentData | null>(null);
  
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState(''); // 内部保持（保存時に送信、UIには表示しない）
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
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [qaPairs, setQaPairs] = useState<QAPairBlock[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryItemBlock[]>([]);
  const [enabledContentTypes, setEnabledContentTypes] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<ContentCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { organization } = useOrganization();
  const frontendUrl = useFrontendUrl();
  const isFrontendConnected = !!frontendUrl;

  // 有効タイプとカテゴリを取得
  useEffect(() => {
    if (!organization?.id) return;
    Promise.all([
      getEnabledContentTypes(organization.id),
      getContentCategories(organization.id),
    ]).then(([typeResult, catResult]) => {
      setEnabledContentTypes(typeResult.data || []);
      setAllCategories(catResult.data || []);
    });
  }, [organization?.id]);

  // コンテンツのカテゴリ紐付けを取得
  useEffect(() => {
    if (!contentId) return;
    getContentCategoryIds(contentId).then(({ data }) => {
      setSelectedCategoryIds(data || []);
    });
  }, [contentId]);

  // コンテンツを取得
  useEffect(() => {
    if (!organization?.id || !contentId) return;

    const fetchContent = async () => {
      setLoading(true);
      const { data, error } = await getContent(contentId, organization.id);
      
      if (data) {
        setContentData(data);
        setTitle(data.title);
        setSlug(data.slug);
        setExcerpt(data.excerpt || '');
        setContentType(data.type);
        setStatus(data.status);
        setTags(data.tags.join(', '));
        setSeoTitle(data.seoTitle || '');
        setSeoDescription(data.seoDescription || '');

        // カスタムフィールドを復元
        const rawCf = ((data as unknown as Record<string, unknown>).custom_fields as { key: string; label?: string; value: string; type: string; options?: string[] }[]) || [];
        setCustomFields(rawCf.map((f, i) => ({
          id: `cf-${i}-${Date.now()}`,
          key: f.key,
          label: f.label || f.key,
          value: f.value,
          type: f.type as CustomField['type'],
          ...(f.options && { options: f.options }),
        })));
        
        // ブロックをタイプに応じて復元
        if (data.blocks && Array.isArray(data.blocks)) {
          const edType = getEditorType(data.type);
          if (edType === 'qa') {
            setQaPairs(
              (data.blocks as QAPairBlock[]).map((b, i) => ({
                id: b.id || `qa-${i}`,
                question: b.question || '',
                answer: b.answer || '',
                order: b.order ?? i,
              }))
            );
          } else if (edType === 'gallery') {
            setGalleryItems(
              (data.blocks as GalleryItemBlock[]).map((b, i) => ({
                id: b.id || `gallery-${i}`,
                url: b.url || '',
                caption: b.caption || '',
                alt: b.alt || '',
                order: b.order ?? i,
              }))
            );
          } else {
            const rawBlocks = data.blocks as Array<{ id: string; type: string; content?: string; level?: number; order: number; src?: string; alt?: string; items?: string[]; textAlign?: string }>;
            setContent(blocksToHtml(rawBlocks));
          }
        }
      } else if (error) {
        toast.error(error);
        router.push('/contents');
      }
      
      setLoading(false);
    };

    fetchContent();
  }, [organization?.id, contentId, router, toast]);

  // プレビュー用のデータ
  const previewData = useMemo(() => {
    return { title, slug, content, contentType };
  }, [title, slug, content, contentType]);

  // プレビューURL
  const previewUrl = useMemo(() => {
    if (!frontendUrl) return null;
    const params = new URLSearchParams({
      preview: 'true',
      data: btoa(encodeURIComponent(JSON.stringify(previewData))),
    });
    return `${frontendUrl}/articles/preview?${params.toString()}`;
  }, [frontendUrl, previewData]);

  const refreshPreview = () => setPreviewKey(prev => prev + 1);

  // 保存処理
  const handleSave = async () => {
    if (!organization?.id || !contentId) return;

    if (!title.trim()) {
      toast.error('タイトルを入力してください');
      return;
    }

    // タイプ別にブロックを構築
    const edType = getEditorType(contentType);
    let blocks: unknown[];
    if (edType === 'qa') {
      blocks = qaPairs.map((p, i) => ({ ...p, order: i }));
    } else if (edType === 'gallery') {
      blocks = galleryItems.map((item, i) => ({ ...item, order: i }));
    } else {
      blocks = htmlToBlocks(content);
    }

    startTransition(async () => {
      const { data, error } = await updateContent(contentId, {
        type: contentType,
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        blocks,
        status,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        customFields: customFields.map(f => ({ key: f.key, label: f.label, value: f.value, type: f.type, ...(f.options && { options: f.options }) })),
      }, organization.id);

      if (data) {
        setContentData(data);
        await setContentCategories(data.id, selectedCategoryIds);
        toast.success(`「${data.title}」を更新しました`);
      } else {
        toast.error(error || '保存に失敗しました');
      }
    });
  };

  // 削除処理
  const handleDelete = async () => {
    if (!organization?.id || !contentId) return;

    startTransition(async () => {
      const { success, error } = await deleteContent(contentId, organization.id);
      if (success) {
        toast.success('削除しました');
        router.push('/contents');
      } else {
        toast.error(error || '削除に失敗しました');
      }
    });
  };

  // 公開処理
  const handlePublish = async () => {
    if (!organization?.id || !contentId) return;

    startTransition(async () => {
      const { success, error } = await publishContent(contentId, organization.id);
      if (success) {
        setStatus('published');
        toast.success('公開しました');
      } else {
        toast.error(error || '公開に失敗しました');
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contentData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <p className="text-muted-foreground">コンテンツが見つかりません</p>
        <Button asChild>
          <Link href="/contents">一覧に戻る</Link>
        </Button>
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
            <h1 className="text-2xl font-bold">コンテンツ編集</h1>
            <p className="text-muted-foreground">
              {contentData.title}
              <Badge variant={status === 'published' ? 'default' : 'outline'} className="ml-2">
                {status === 'published' ? '公開中' : status === 'draft' ? '下書き' : status}
              </Badge>
            </p>
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
          
          {status === 'draft' && (
            <Button variant="outline" onClick={handlePublish} disabled={isPending}>
              公開する
            </Button>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>コンテンツを削除</AlertDialogTitle>
                <AlertDialogDescription>
                  「{contentData.title}」を削除しますか？この操作は取り消せません。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  削除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Button className="btn-premium" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            保存
          </Button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={contentTabs} />

      <div className={cn("grid gap-6", showPreview ? "lg:grid-cols-2" : "lg:grid-cols-3")}>
        {/* 編集エリア */}
        <div className={cn(showPreview ? "" : "lg:col-span-2", "space-y-6")}>
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel fieldKey="type">コンテンツタイプ</FieldLabel>
                <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="タイプを選択" /></SelectTrigger>
                  <SelectContent>
                    {(enabledContentTypes.length > 0
                      ? enabledContentTypes
                      : [contentType]
                    ).map((key) => {
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
                  {getEditorType(contentType) === 'qa' ? '質問と回答' : getEditorType(contentType) === 'gallery' ? '画像' : '本文'}
                </FieldLabel>
                {getEditorType(contentType) === 'qa' ? (
                  <QAEditor
                    pairs={qaPairs}
                    onChange={setQaPairs}
                    disabled={isPending}
                  />
                ) : getEditorType(contentType) === 'gallery' ? (
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

          {/* カスタムフィールド */}
          <CustomFields
            fields={customFields}
            onChange={setCustomFields}
            disabled={isPending}
          />

          {!showPreview && (
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>公開設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="published">公開</SelectItem>
                      <SelectItem value="archived">アーカイブ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel fieldKey="type">コンテンツタイプ</FieldLabel>
                  <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(enabledContentTypes.length > 0
                        ? enabledContentTypes
                        : [contentType]
                      ).map((key) => {
                        const config = contentTypeConfig[key];
                        if (!config) return null;
                        return <SelectItem key={key} value={key}>{config.label}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* プレビューエリア */}
        {showPreview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">リアルタイムプレビュー</h3>
                {isFrontendConnected && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">接続済み</Badge>
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
                  <Button variant="ghost" size="sm" onClick={() => setPreviewMode('desktop')} className={cn("h-7 px-2", previewMode === 'desktop' && "bg-background shadow-sm")}>
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPreviewMode('mobile')} className={cn("h-7 px-2", previewMode === 'mobile' && "bg-background shadow-sm")}>
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className={cn("border rounded-xl bg-white dark:bg-slate-900 shadow-lg overflow-hidden", previewMode === 'mobile' ? "max-w-[375px] mx-auto" : "")}>
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center gap-2 border-b">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white dark:bg-slate-700 rounded-md px-3 py-1 text-xs text-muted-foreground truncate">
                    {isFrontendConnected ? `${frontendUrl}/articles/${slug || 'article'}` : `https://example.com/${slug || 'article'}`}
                  </div>
                </div>
              </div>

              {isFrontendConnected && previewUrl ? (
                <div className={cn("relative", previewMode === 'mobile' ? "h-[500px]" : "h-[600px]")}>
                  <iframe key={previewKey} src={previewUrl} className="w-full h-full border-0" title="記事プレビュー" />
                </div>
              ) : (
                <div className={cn("p-6 min-h-[400px] overflow-auto", previewMode === 'mobile' ? "text-sm" : "")}>
                  {title || content || qaPairs.length > 0 || galleryItems.length > 0 ? (
                    <article className="prose dark:prose-invert max-w-none">
                      {title && <h1 className={cn("font-bold mb-4", previewMode === 'mobile' ? "text-xl" : "text-3xl")}>{title}</h1>}
                      {getEditorType(contentType) === 'qa' && qaPairs.length > 0 && (
                        <div className="space-y-4 not-prose">
                          {qaPairs.map((pair, i) => (
                            <div key={pair.id} className="border rounded-lg p-4">
                              <p className="font-semibold text-sm">Q{i + 1}. {pair.question || '（未入力）'}</p>
                              <p className="text-sm text-muted-foreground mt-2">{pair.answer || '（未入力）'}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {getEditorType(contentType) === 'gallery' && galleryItems.length > 0 && (
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
                      {getEditorType(contentType) === 'text' && content && (
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

            <Card className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">公開設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">ステータス</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="published">公開</SelectItem>
                      <SelectItem value="archived">アーカイブ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel fieldKey="type">コンテンツタイプ</FieldLabel>
                  <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(enabledContentTypes.length > 0
                        ? enabledContentTypes
                        : [contentType]
                      ).map((key) => {
                        const config = contentTypeConfig[key];
                        if (!config) return null;
                        return <SelectItem key={key} value={key}>{config.label}</SelectItem>;
                      })}
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
                <Input placeholder="タグを入力（カンマ区切り）" value={tags} onChange={(e) => setTags(e.target.value)} />
              </CardContent>
            </Card>

            {allCategories.filter((c) => c.type === contentType).length > 0 && (
              <Card className="card-hover">
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
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>タグ</CardTitle>
              </CardHeader>
              <CardContent>
                <Input placeholder="タグを入力（カンマ区切り）" value={tags} onChange={(e) => setTags(e.target.value)} />
              </CardContent>
            </Card>

            {allCategories.filter((c) => c.type === contentType).length > 0 && (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle>カテゴリ</CardTitle>
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

            <Card className="card-hover">
              <CardHeader>
                <CardTitle>SEO設定</CardTitle>
              </CardHeader>
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


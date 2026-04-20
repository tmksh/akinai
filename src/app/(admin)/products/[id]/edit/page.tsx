'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useTransition } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  EyeOff,
  Columns,
  Package, 
  Smartphone,
  Monitor,
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Minus,
  Plus,
  ExternalLink,
  RefreshCw,
  Settings,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useFrontendUrl, useOrganization } from '@/components/providers/organization-provider';
import { cn } from '@/lib/utils';
import { getProduct, getCategories, updateProduct, type ProductWithRelations } from '@/lib/actions/products';
import { ImageUpload } from '@/components/products/image-upload';
import { CustomFields, type CustomField } from '@/components/products/custom-fields';
import { FieldLabel } from '@/components/products/field-label';
import { SimpleVariantInput, type ProductVariant } from '@/components/products/simple-variant-input';
import { MatrixVariantInput } from '@/components/products/matrix-variant-input';
import type { Axis as MatrixAxis } from '@/components/products/matrix-variant-input';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { organization, isLoading: orgLoading } = useOrganization();
  const [isPending, startTransition] = useTransition();
  
  const defaultVariantMode = (organization?.settings?.variant_input_mode as 'simple' | 'matrix' | 'swatch') ?? 'simple';
  const [variantInputMode, setVariantInputMode] = useState<'simple' | 'matrix' | 'swatch'>(defaultVariantMode);

  useEffect(() => {
    if (organization?.settings?.variant_input_mode) {
      setVariantInputMode(organization.settings.variant_input_mode as 'simple' | 'matrix' | 'swatch');
    }
  }, [organization?.id]);
  
  // データ取得状態
  const [product, setProduct] = useState<ProductWithRelations | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // フォームデータ
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    shortDescription: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    featured: false,
    seoTitle: '',
    seoDescription: '',
  });
  
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [swatchConfig, setSwatchConfig] = useState<MatrixAxis[]>([]);
  const [productImages, setProductImages] = useState<{
    id: string;
    url: string;
    alt: string | null;
    sort_order: number;
  }[]>([]);

  // プレビュー関連
  const [previewVariantImage, setPreviewVariantImage] = useState<string | null>(null);
  const [previewAxes, setPreviewAxes] = useState<MatrixAxis[]>([]);
  const [previewSelectedItems, setPreviewSelectedItems] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewQuantity, setPreviewQuantity] = useState(1);
  const [previewKey, setPreviewKey] = useState(0);

  // 組織設定からフロントエンドURLを取得
  const frontendUrl = useFrontendUrl();
  const isFrontendConnected = !!frontendUrl;

  // データを取得
  useEffect(() => {
    const fetchData = async () => {
      if (!organization?.id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const [productResult, categoriesResult] = await Promise.all([
          getProduct(productId),
          getCategories(organization.id),
        ]);

        if (productResult.error || !productResult.data) {
          setError(productResult.error || '商品が見つかりません');
          return;
        }

        const p = productResult.data;
        setProduct(p);
        
        // フォームデータを初期化
        setFormData({
          name: p.name,
          description: p.description || '',
          shortDescription: p.short_description || '',
          status: p.status,
          featured: p.featured,
          seoTitle: p.seo_title || '',
          seoDescription: p.seo_description || '',
        });
        
        setSelectedCategories(p.categories.map(c => c.id));
        setTags(p.tags || []);
        // カスタムフィールドを復元（スキーマとマージ）。_swatch_config はシステム用なので除外
        const rawCustomFields = (p.custom_fields as unknown as { key: string; label?: string; value: string; type: string; options?: string[] }[]) || [];
        // スウォッチ設定を抽出
        const swatchConfigRaw = rawCustomFields.find((f) => f.key === '_swatch_config');
        if (swatchConfigRaw?.value) {
          try { setSwatchConfig(JSON.parse(swatchConfigRaw.value)); } catch { /* ignore */ }
        }
        const productFields: CustomField[] = rawCustomFields
          .filter((f) => f.key !== '_swatch_config')  // システムキーを除外
          .map((f, i) => ({
          id: `cf-${i}-${Date.now()}`,
          key: f.key,
          label: f.label || f.key,
          value: f.value,
          type: f.type as CustomField['type'],
          ...(f.options && { options: f.options }),
        }));
        // 組織スキーマにあるがこの商品にないフィールドを先頭に追加
        const schema = organization?.productFieldSchema ?? [];
        const productFieldKeys = new Set(productFields.map(f => f.key));
        const schemaOnlyFields: CustomField[] = schema
          .filter(s => !productFieldKeys.has(s.key))
          .map(s => {
            let defaultValue = '';
            if (s.type === 'boolean') defaultValue = 'false';
            if (s.type === 'rating') defaultValue = '0';
            if (s.type === 'list') defaultValue = '[]';
            if (s.type === 'json') defaultValue = '{}';
            return { id: `schema-${s.id}`, key: s.key, label: s.label, value: defaultValue, type: s.type, ...(s.options && { options: s.options }) };
          });
        setCustomFields([...schemaOnlyFields, ...productFields]);
        setVariants(p.variants.map(v => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          compareAtPrice: v.compare_at_price || undefined,
          stock: v.stock,
          imageUrl: v.image_url || (v.options as Record<string, string>)?.imageUrl || undefined,
        })));
        setProductImages(p.images.map(img => ({
          id: img.id,
          url: img.url,
          alt: img.alt,
          sort_order: img.sort_order,
        })));

        if (categoriesResult.data) {
          setCategories(categoriesResult.data);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('データの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [organization?.id, productId]);

  // プレビュー用データ
  const previewData = useMemo(() => ({
    id: productId,
    name: formData.name,
    description: formData.description,
    shortDescription: formData.shortDescription,
    price: variants[0]?.price || 0,
    compareAtPrice: variants[0]?.compareAtPrice,
    stock: variants[0]?.stock || 0,
    images: productImages,
    status: formData.status,
  }), [productId, formData, variants, productImages]);

  // プレビューURL生成
  const previewUrl = useMemo(() => {
    if (!frontendUrl) return null;
    const params = new URLSearchParams({
      preview: 'true',
      data: btoa(encodeURIComponent(JSON.stringify(previewData))),
    });
    return `${frontendUrl}/products/preview?${params.toString()}`;
  }, [frontendUrl, previewData]);

  const refreshPreview = () => setPreviewKey(prev => prev + 1);

  // 保存処理
  const handleSave = async (publish = false) => {
    if (!formData.name.trim()) {
      alert('商品名を入力してください');
      return;
    }

    // SKUが空のバリエーションがないかチェック
    const emptySkuVariant = variants.find(v => !v.sku.trim());
    if (emptySkuVariant) {
      alert('すべてのバリエーションにSKUを入力してください');
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateProduct({
          id: productId,
          name: formData.name,
          description: formData.description || undefined,
          shortDescription: formData.shortDescription || undefined,
          status: publish ? 'published' : formData.status,
          tags: tags.length > 0 ? tags : undefined,
          seoTitle: formData.seoTitle || undefined,
          seoDescription: formData.seoDescription || undefined,
          featured: formData.featured,
          customFields: [
            ...customFields.map(f => ({ key: f.key, label: f.label, value: f.value, type: f.type, ...(f.options && { options: f.options }) })),
            // スウォッチ設定をシステムキーとして保存（UI非表示）
            ...(swatchConfig.length > 0
              ? [{ key: '_swatch_config', label: '', value: JSON.stringify(swatchConfig.map(a => ({ name: a.name, items: a.items.map(i => ({ value: i.value, color: i.color, imageUrl: i.imageUrl })) }))), type: 'system' }]
              : []
            ),
          ],
          categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
          variants: variants.map(v => ({
            name: v.name,
            sku: v.sku,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stock: v.stock,
            // blob: URL は一時的なオブジェクトURLのため保存しない
            options: (v.imageUrl && !v.imageUrl.startsWith('blob:')) ? { imageUrl: v.imageUrl } : undefined,
          })),
        });

        if (result.error) {
          console.error('Error updating product:', result.error);
          alert('商品の更新に失敗しました');
          return;
        }

        router.push(`/products/${productId}`);
      } catch (error) {
        console.error('Error updating product:', error);
        alert('商品の更新に失敗しました');
      }
    });
  };

  // ローディング表示
  if (orgLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // エラー表示
  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">商品が見つかりません</h2>
        <p className="text-muted-foreground mb-4">{error || '指定された商品は存在しないか、削除された可能性があります。'}</p>
        <Button asChild>
          <Link href="/products">商品一覧に戻る</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/products/${product.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">商品を編集</h1>
            <p className="text-sm text-muted-foreground">{product.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* プレビュートグル */}
          <div className="hidden sm:flex items-center border rounded-lg p-1 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className={cn("h-8 px-2", !showPreview && "bg-background shadow-sm")}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(true)}
              className={cn("h-8 px-2", showPreview && "bg-background shadow-sm")}
            >
              <Columns className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleSave(false)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="sm:mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="sm:mr-2 h-4 w-4" />
            )}
            <span className="hidden sm:inline">下書き保存</span>
          </Button>
          <Button 
            className="btn-premium" 
            size="sm"
            onClick={() => handleSave(true)}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            更新する
          </Button>
        </div>
      </div>

      <div className={cn(
        "grid gap-6",
        showPreview ? "lg:grid-cols-2" : "grid-cols-1"
      )}>
        {/* メインコンテンツ */}
        <div className="space-y-6">
          {/* 基本情報 */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>商品の基本的な情報を入力してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="name" fieldKey="name">商品名 *</FieldLabel>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="商品名を入力"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="shortDescription" fieldKey="short_description">短い説明</FieldLabel>
                <Textarea
                  id="shortDescription"
                  value={formData.shortDescription}
                  onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                  placeholder="商品の簡潔な説明（一覧表示などで使用）"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="description" fieldKey="description">商品説明</FieldLabel>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="商品の説明を入力..."
                  className="min-h-[150px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel htmlFor="price" fieldKey="price">価格（税込）*</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      value={variants[0]?.price ?? ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setVariants(prev => prev.map(v => ({ ...v, price: val })));
                      }}
                      placeholder="0"
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="compareAtPrice" fieldKey="compare_at_price">定価（割引前）</FieldLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">¥</span>
                    <Input
                      id="compareAtPrice"
                      type="number"
                      min={0}
                      value={variants[0]?.compareAtPrice ?? ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || undefined;
                        setVariants(prev => prev.map(v => ({ ...v, compareAtPrice: val })));
                      }}
                      placeholder="0（空白でなし）"
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'draft' | 'published' | 'archived') => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="ステータスを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="published">公開</SelectItem>
                      <SelectItem value="archived">アーカイブ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between pt-6">
                  <div className="space-y-0.5">
                    <Label>おすすめ商品</Label>
                    <p className="text-xs text-muted-foreground">トップページに表示</p>
                  </div>
                  <Switch
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                  />
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t">
                <Label>カテゴリー</Label>
                {categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    カテゴリーがありません。
                    <Link href="/products/categories" className="text-primary hover:underline ml-1">
                      作成する
                    </Link>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-input"
                          checked={selectedCategories.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, category.id]);
                            } else {
                              setSelectedCategories(selectedCategories.filter((id) => id !== category.id));
                            }
                          }}
                        />
                        <span className="text-sm">{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 画像 */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>商品画像</CardTitle>
              <CardDescription>商品の画像をアップロードしてください（ドラッグで並び替え可能）</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                productId={productId}
                images={productImages}
                onImagesChange={setProductImages}
                disabled={isPending}
              />
            </CardContent>
          </Card>

          {/* バリエーション */}
          <Card id="product-variants-card" className="card-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>色やサイズの種類</CardTitle>
                  <CardDescription>商品の色やサイズなど、選べる種類を管理</CardDescription>
                </div>
                <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30 shrink-0">
                  <button
                    type="button"
                    onClick={() => setVariantInputMode('simple')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      variantInputMode === 'simple' || variantInputMode === 'matrix'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    手動で追加
                  </button>
                  <button
                    type="button"
                    onClick={() => setVariantInputMode('swatch')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      variantInputMode === 'swatch'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    スウォッチ
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {variantInputMode === 'matrix' || variantInputMode === 'swatch' ? (
                <MatrixVariantInput
                  variants={variants}
                  onChange={setVariants}
                  onSelectedVariantChange={(v) => setPreviewVariantImage(v?.imageUrl ?? null)}
                  onAxesChange={setPreviewAxes}
                  initialSwatchConfig={swatchConfig}
                  onSwatchConfigChange={setSwatchConfig}
                  disabled={isPending}
                  showHeroPreview={variantInputMode === 'swatch'}
                  productImages={productImages}
                  productId={productId}
                />
              ) : (
                <SimpleVariantInput
                  variants={variants}
                  onChange={setVariants}
                  onSelectedVariantChange={(v) => setPreviewVariantImage(v?.imageUrl || null)}
                  disabled={isPending}
                />
              )}
            </CardContent>
          </Card>

          {/* カスタムフィールド */}
          <CustomFields
            fields={customFields}
            onChange={setCustomFields}
            disabled={isPending}
            allowAdd={false}
            organizationId={organization?.id}
          />

          {/* SEO設定 */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>SEO設定</CardTitle>
              <CardDescription>検索エンジン向けの設定を行います</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="seoTitle" fieldKey="seo_title">SEOタイトル</FieldLabel>
                <Input
                  id="seoTitle"
                  value={formData.seoTitle}
                  onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                  placeholder="検索結果に表示されるタイトル"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="seoDescription" fieldKey="seo_description">メタディスクリプション</FieldLabel>
                <Textarea
                  id="seoDescription"
                  value={formData.seoDescription}
                  onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                  placeholder="検索結果に表示される説明文（120〜160文字推奨）"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* プレビューエリア（プレビュー表示時） */}
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                    className={cn("h-7 px-2", previewMode === 'mobile' && "bg-background shadow-sm")}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                    className={cn("h-7 px-2", previewMode === 'desktop' && "bg-background shadow-sm")}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* 商品プレビューフレーム */}
            <div className={cn(
              "border rounded-xl bg-white dark:bg-slate-900 shadow-lg overflow-hidden transition-all duration-300",
              previewMode === 'mobile' ? "max-w-[375px] mx-auto" : ""
            )}>
              {/* モックブラウザバー */}
              <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center gap-2 border-b">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-sky-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white dark:bg-slate-700 rounded-md px-3 py-1 text-xs text-muted-foreground truncate">
                    {isFrontendConnected 
                      ? `${frontendUrl}/products/${formData.name.toLowerCase().replace(/\s+/g, '-') || productId}`
                      : `https://shop.example.com/products/${productId}`
                    }
                  </div>
                </div>
              </div>

              {/* フロントエンド接続時: iframe表示 */}
              {isFrontendConnected && previewUrl ? (
                <div className={cn("relative", previewMode === 'mobile' ? "h-[600px]" : "h-[700px]")}>
                  <iframe key={previewKey} src={previewUrl} className="w-full h-full border-0" title="商品プレビュー" />
                </div>
              ) : (
                /* モックプレビュー */
                <div className={cn("p-4 min-h-[500px] overflow-auto", previewMode === 'mobile' ? "text-sm" : "p-6")}>
                  <div className="space-y-4">
                    {/* 商品画像 */}
                    {(previewVariantImage || (variantInputMode === 'simple' ? variants[0]?.imageUrl : null) || productImages[0]?.url) ? (
                      <div className={cn(
                        "relative rounded-xl overflow-hidden",
                        previewMode === 'mobile' ? "aspect-square" : "aspect-[4/3]"
                      )}>
                        <img
                          src={previewVariantImage || (variantInputMode === 'simple' ? variants[0]?.imageUrl : null) || productImages[0]?.url}
                          alt="商品画像"
                          className="w-full h-full object-cover transition-all duration-300"
                        />
                      </div>
                    ) : (
                      <div className={cn(
                        "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-xl flex items-center justify-center",
                        previewMode === 'mobile' ? "aspect-square" : "aspect-[4/3]"
                      )}>
                        <Package className="h-12 w-12 opacity-50" />
                      </div>
                    )}

                    {/* 商品情報 */}
                    <div className="space-y-3">
                      <h1 className={cn(
                        "font-bold text-slate-900 dark:text-white",
                        previewMode === 'mobile' ? "text-lg" : "text-2xl"
                      )}>
                        {formData.name || '商品名を入力...'}
                      </h1>

                      {/* レビュー */}
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className={cn("h-4 w-4", i <= 4 ? "fill-sky-400 text-sky-400" : "text-slate-300")} />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">(24件)</span>
                      </div>

                      {/* 価格 */}
                      <div className="py-3 border-y">
                        <div className="flex items-baseline gap-2">
                          <span className={cn("font-bold text-sky-600", previewMode === 'mobile' ? "text-2xl" : "text-3xl")}>
                            ¥{(variants[0]?.price || 0).toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">税込</span>
                        </div>
                        {variants[0]?.compareAtPrice && variants[0].compareAtPrice > variants[0].price && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-muted-foreground line-through">
                              ¥{variants[0].compareAtPrice.toLocaleString()}
                            </span>
                            <Badge className="bg-red-500 text-white text-xs">
                              {Math.round((1 - variants[0].price / variants[0].compareAtPrice) * 100)}% OFF
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* バリエーション選択 */}
                      {(variantInputMode === 'matrix' || variantInputMode === 'swatch') && previewAxes.some(a => a.items.length > 0) ? (
                        <div className="space-y-3 rounded-lg border p-3 bg-slate-50/60">
                          {previewAxes.filter(a => a.items.length > 0).map((axis) => {
                            const selectedVal = previewSelectedItems[axis.id] ?? axis.items[0]?.value;
                            return (
                              <div key={axis.id}>
                                <p className="text-sm font-bold mb-2">
                                  <span className="text-red-500 mr-0.5">*</span>
                                  {axis.name}
                                  {selectedVal && <span className="font-normal text-muted-foreground">：{selectedVal}</span>}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {axis.items.map((item) => {
                                    const isSelected = (previewSelectedItems[axis.id] ?? axis.items[0]?.value) === item.value;
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => {
                                          const next = { ...previewSelectedItems, [axis.id]: item.value };
                                          setPreviewSelectedItems(next);
                                          const name = previewAxes
                                            .filter(a => a.items.length > 0)
                                            .map(a => next[a.id] ?? a.items[0]?.value)
                                            .filter(Boolean)
                                            .join(' / ');
                                          const v = variants.find(vt => vt.name === name);
                                          setPreviewVariantImage(v?.imageUrl ?? null);
                                        }}
                                        className={cn(
                                          'h-10 w-10 rounded-md border-2 overflow-hidden flex items-center justify-center transition-all',
                                          isSelected ? 'border-slate-800 shadow-sm' : 'border-slate-200 hover:border-slate-400',
                                          !item.imageUrl && 'bg-white'
                                        )}
                                        title={item.value}
                                      >
                                        {item.imageUrl
                                          ? <img src={item.imageUrl} alt={item.value} className="w-full h-full object-cover" />
                                          : <span className="text-[9px] text-center leading-tight px-0.5 text-slate-500">{item.value}</span>
                                        }
                                      </button>
                                    );
                                  })}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = { ...previewSelectedItems };
                                    delete next[axis.id];
                                    setPreviewSelectedItems(next);
                                    setPreviewVariantImage(null);
                                  }}
                                  className="mt-1 text-xs text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2"
                                >
                                  クリア
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : variants.length > 1 ? (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">バリエーション</Label>
                          <div className="flex flex-wrap gap-2">
                            {variants.map((v, i) => (
                              <button
                                key={v.id}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg border text-sm transition-colors",
                                  i === 0 ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 hover:border-slate-300"
                                )}
                              >
                                {v.name || `バリエーション ${i + 1}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* 数量選択 */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">数量</Label>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPreviewQuantity(Math.max(1, previewQuantity - 1))}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center font-medium">{previewQuantity}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPreviewQuantity(previewQuantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs text-muted-foreground ml-2">在庫: {variants[0]?.stock || 0}点</span>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div className="space-y-2 pt-2">
                        <Button className="w-full bg-sky-500 hover:bg-sky-600 text-white gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          カートに追加
                        </Button>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 gap-2">
                            <Heart className="h-4 w-4" />
                            お気に入り
                          </Button>
                          <Button variant="outline" size="icon">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* 詳細説明 */}
                      {formData.description && (
                        <div className="pt-4 border-t">
                          <h3 className="font-semibold mb-2">商品説明</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {formData.description}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

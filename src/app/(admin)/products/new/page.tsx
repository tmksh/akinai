'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Columns,
  Plus,
  Trash2,
  GripVertical,
  Upload,
  X,
  Smartphone,
  Monitor,
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Minus,
  Package,
  ExternalLink,
  RefreshCw,
  Settings,
  Loader2,
} from 'lucide-react';
import { useFrontendUrl, useOrganization } from '@/components/providers/organization-provider';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageTabs } from '@/components/layout/page-tabs';
import { CustomFields, type CustomField } from '@/components/products/custom-fields';
import { FieldLabel } from '@/components/products/field-label';
import { cn } from '@/lib/utils';
import { getCategories, createProduct, generateUniqueSlug } from '@/lib/actions/products';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];

const productTabs = [
  { label: '商品一覧', href: '/products', exact: true },
  { label: '商品登録', href: '/products/new' },
  { label: 'カテゴリー', href: '/products/categories' },
];

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  imageUrl?: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const { organization, isLoading: orgLoading } = useOrganization();
  const [isPending, startTransition] = useTransition();
  
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([
    { id: '1', name: 'デフォルト', sku: '', price: 0, stock: 0 },
  ]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
  const [previewQuantity, setPreviewQuantity] = useState(1);
  const [previewKey, setPreviewKey] = useState(0);
  
  // カテゴリ一覧
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // 組織設定からフロントエンドURLを取得
  const frontendUrl = useFrontendUrl();
  
  // フロントエンドが接続されているかどうか
  const isFrontendConnected = !!frontendUrl;

  // カテゴリ一覧を取得
  useEffect(() => {
    const fetchCategories = async () => {
      if (!organization?.id) return;
      
      setCategoriesLoading(true);
      try {
        const result = await getCategories(organization.id);
        if (result.data) {
          setCategories(result.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, [organization?.id]);

  // プレビュー用のデータをURLパラメータとしてエンコード
  const previewData = useMemo(() => {
    return {
      name: productName,
      description,
      shortDescription,
      price: variants[0]?.price || 0,
      compareAtPrice: variants[0]?.compareAtPrice,
      stock: variants[0]?.stock || 0,
      variants: variants.map(v => ({ name: v.name, price: v.price, stock: v.stock })),
      categories: selectedCategories,
      tags,
      status,
    };
  }, [productName, description, shortDescription, variants, selectedCategories, tags, status]);

  // プレビューURLを生成
  const previewUrl = useMemo(() => {
    if (!frontendUrl) return null;
    const params = new URLSearchParams({
      preview: 'true',
      data: btoa(encodeURIComponent(JSON.stringify(previewData))),
    });
    return `${frontendUrl}/products/preview?${params.toString()}`;
  }, [frontendUrl, previewData]);

  // iframeを再読み込み
  const refreshPreview = () => {
    setPreviewKey(prev => prev + 1);
  };

  // タグ追加
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // タグ削除
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // バリエーション追加
  const addVariant = () => {
    setVariants([
      ...variants,
      {
        id: Date.now().toString(),
        name: '',
        sku: '',
        price: 0,
        stock: 0,
      },
    ]);
  };

  // バリエーション削除
  const removeVariant = (id: string) => {
    if (variants.length > 1) {
      setVariants(variants.filter((v) => v.id !== id));
    }
  };

  // バリエーション更新
  const updateVariant = (
    id: string,
    field: keyof ProductVariant,
    value: string | number
  ) => {
    setVariants(
      variants.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  // 保存処理
  const handleSave = async (publish = false) => {
    if (!organization?.id) return;
    if (!productName.trim()) {
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
        // スラッグを生成
        const slug = await generateUniqueSlug(organization.id, productName);

        const result = await createProduct({
          organizationId: organization.id,
          name: productName,
          slug,
          description: description || undefined,
          shortDescription: shortDescription || undefined,
          status: publish ? 'published' : status,
          tags: tags.length > 0 ? tags : undefined,
          seoTitle: seoTitle || undefined,
          seoDescription: seoDescription || undefined,
          categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
          customFields: customFields.length > 0
            ? customFields.map(f => ({ key: f.key, label: f.label, value: f.value, type: f.type, ...(f.options && { options: f.options }) }))
            : undefined,
          variants: variants.map(v => ({
            name: v.name,
            sku: v.sku,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stock: v.stock,
            options: v.imageUrl ? { imageUrl: v.imageUrl } : undefined,
          })),
        });

        if (result.error) {
          console.error('Error creating product:', result.error);
          alert('商品の作成に失敗しました');
          return;
        }

        router.push('/products');
      } catch (error) {
        console.error('Error creating product:', error);
        alert('商品の作成に失敗しました');
      }
    });
  };

  // ローディング表示
  if (orgLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">商品を追加</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">新しい商品を登録します</p>
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
            <span className="sm:hidden">下書き</span>
          </Button>
          <Button
            onClick={() => handleSave(true)}
            className="btn-premium"
            size="sm"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            公開する
          </Button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={productTabs} />

      <div className={cn(
        "grid gap-6",
        showPreview ? "lg:grid-cols-2" : "lg:grid-cols-3"
      )}>
        {/* メインコンテンツ */}
        <div className={cn(showPreview ? "" : "lg:col-span-2", "space-y-6")}>
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>商品の基本的な情報を入力します</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="name" fieldKey="name">商品名 *</FieldLabel>
                <Input
                  id="name"
                  placeholder="商品名を入力"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="shortDescription" fieldKey="short_description">短い説明</FieldLabel>
                <Textarea
                  id="shortDescription"
                  placeholder="商品の簡潔な説明（一覧表示などで使用）"
                  rows={2}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="description" fieldKey="description">詳細説明</FieldLabel>
                <Textarea
                  id="description"
                  placeholder="商品の詳細な説明を入力"
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* メディア */}
          <Card>
            <CardHeader>
              <CardTitle>メディア</CardTitle>
              <CardDescription>商品の画像をアップロードします</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
                <Upload className="mx-auto h-10 w-10 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  画像は商品作成後にアップロードできます
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG, WEBP, GIF（最大10MB）
                </p>
              </div>
            </CardContent>
          </Card>

          {/* バリエーション */}
          <Card id="product-variants-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>色やサイズの種類</CardTitle>
                  <CardDescription>
                    商品の色やサイズなど、選べる種類を設定します
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="mr-2 h-4 w-4" />
                  追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {variants.map((variant, index) => (
                  <div
                    key={variant.id}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    {/* 上段: ドラッグ・画像・削除 */}
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground cursor-grab">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <label className="block cursor-pointer group shrink-0">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            updateVariant(variant.id, 'imageUrl', URL.createObjectURL(file));
                          }}
                        />
                        <div className={cn(
                          "h-10 w-10 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors",
                          "hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20",
                          variant.imageUrl ? "border-transparent" : "border-slate-200 dark:border-slate-700"
                        )}>
                          {variant.imageUrl ? (
                            <img src={variant.imageUrl} alt={variant.name} className="h-full w-full object-cover rounded-lg" />
                          ) : (
                            <Upload className="h-4 w-4 text-muted-foreground group-hover:text-orange-500" />
                          )}
                        </div>
                      </label>
                      <span className="text-sm font-medium flex-1 truncate">
                        {variant.name || `バリエーション ${index + 1}`}
                      </span>
                      {variant.imageUrl && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => updateVariant(variant.id, 'imageUrl', '')}
                        >
                          画像削除
                        </button>
                      )}
                      {variants.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeVariant(variant.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {/* 下段: 入力フィールド */}
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">バリエーション名</Label>
                        <Input
                          placeholder="例: ホワイト / M"
                          value={variant.name}
                          onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">SKU *</Label>
                        <Input
                          placeholder="例: PRD-001-WH-M"
                          value={variant.sku}
                          onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">価格（税込）</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={variant.price || ''}
                          onChange={(e) => updateVariant(variant.id, 'price', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">在庫数</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={variant.stock || ''}
                          onChange={(e) => updateVariant(variant.id, 'stock', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* カスタムフィールド */}
          <CustomFields
            fields={customFields}
            onChange={setCustomFields}
            disabled={isPending}
          />

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle>SEO設定</CardTitle>
              <CardDescription>
                検索エンジン向けの設定を行います
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="seoTitle" fieldKey="seo_title">SEOタイトル</FieldLabel>
                <Input
                  id="seoTitle"
                  placeholder="検索結果に表示されるタイトル"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="seoDescription" fieldKey="seo_description">メタディスクリプション</FieldLabel>
                <Textarea
                  id="seoDescription"
                  placeholder="検索結果に表示される説明文（120〜160文字推奨）"
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
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
                    onClick={() => setPreviewMode('mobile')}
                    className={cn(
                      "h-7 px-2",
                      previewMode === 'mobile' && "bg-background shadow-sm"
                    )}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
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
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white dark:bg-slate-700 rounded-md px-3 py-1 text-xs text-muted-foreground truncate">
                    {isFrontendConnected 
                      ? `${frontendUrl}/products/${productName ? productName.toLowerCase().replace(/\s+/g, '-') : 'preview'}`
                      : `https://shop.example.com/products/${productName ? productName.toLowerCase().replace(/\s+/g, '-') : 'product-name'}`
                    }
                  </div>
                </div>
              </div>

              {/* フロントエンド接続時: iframe表示 */}
              {isFrontendConnected && previewUrl ? (
                <div className={cn(
                  "relative",
                  previewMode === 'mobile' ? "h-[600px]" : "h-[700px]"
                )}>
                  <iframe
                    key={previewKey}
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="商品プレビュー"
                  />
                </div>
              ) : (
                /* フロントエンド未接続時: モックプレビュー */
                <div className={cn(
                  "p-4 min-h-[500px] overflow-auto",
                  previewMode === 'mobile' ? "text-sm" : "p-6"
                )}>
                  {productName || variants[0].price > 0 ? (
                  <div className="space-y-4">
                    {/* 商品画像プレースホルダー */}
                    <div className={cn(
                      "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-xl flex items-center justify-center",
                      previewMode === 'mobile' ? "aspect-square" : "aspect-[4/3]"
                    )}>
                      <div className="text-center text-slate-400">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">商品画像</p>
                      </div>
                    </div>

                    {/* 商品情報 */}
                    <div className="space-y-3">
                      {/* カテゴリー & タグ */}
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCategories.map((catId) => {
                          const cat = categories.find(c => c.id === catId);
                          return cat ? (
                            <Badge key={catId} variant="secondary" className="text-xs">
                              {cat.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>

                      {/* 商品名 */}
                      <h1 className={cn(
                        "font-bold text-slate-900 dark:text-white",
                        previewMode === 'mobile' ? "text-lg" : "text-2xl"
                      )}>
                        {productName || '商品名を入力...'}
                      </h1>

                      {/* レビュー */}
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className={cn("h-4 w-4", i <= 4 ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">(24件)</span>
                      </div>

                      {/* 短い説明 */}
                      {shortDescription && (
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                          {shortDescription}
                        </p>
                      )}

                      {/* 価格 */}
                      <div className="py-3 border-y">
                        <div className="flex items-baseline gap-2">
                          <span className={cn(
                            "font-bold text-orange-600",
                            previewMode === 'mobile' ? "text-2xl" : "text-3xl"
                          )}>
                            ¥{(variants[0].price || 0).toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">税込</span>
                        </div>
                        {variants[0].compareAtPrice && variants[0].compareAtPrice > variants[0].price && (
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
                      {variants.length > 1 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">バリエーション</Label>
                          <div className="flex flex-wrap gap-2">
                            {variants.map((v, i) => (
                              <button
                                key={v.id}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg border text-sm transition-colors",
                                  i === 0 
                                    ? "border-orange-500 bg-orange-50 text-orange-700" 
                                    : "border-slate-200 hover:border-slate-300"
                                )}
                              >
                                {v.name || `バリエーション ${i + 1}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 数量選択 */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">数量</Label>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setPreviewQuantity(Math.max(1, previewQuantity - 1))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-12 text-center font-medium">{previewQuantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => setPreviewQuantity(previewQuantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs text-muted-foreground ml-2">
                            在庫: {variants[0].stock || 0}点
                          </span>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div className="space-y-2 pt-2">
                        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white gap-2">
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
                      {description && (
                        <div className="pt-4 border-t">
                          <h3 className="font-semibold mb-2">商品説明</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {description}
                          </p>
                        </div>
                      )}

                      {/* タグ */}
                      {tags.length > 0 && (
                        <div className="pt-3">
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <Package className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-sm">商品情報を入力すると</p>
                    <p className="text-sm">ここにプレビューが表示されます</p>
                  </div>
                )}
                </div>
              )}
            </div>

            {/* サイドバー設定（プレビュー表示時） */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">公開設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">ステータス</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">カテゴリー</CardTitle>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    カテゴリーがありません。
                    <Link href="/products/categories" className="text-primary hover:underline ml-1">
                      作成する
                    </Link>
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[150px] overflow-auto">
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
                              setSelectedCategories([
                                ...selectedCategories,
                                category.id,
                              ]);
                            } else {
                              setSelectedCategories(
                                selectedCategories.filter((id) => id !== category.id)
                              );
                            }
                          }}
                        />
                        <span className="text-sm">{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">タグ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="タグを入力"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="h-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" onClick={addTag}>
                    追加
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer text-xs"
                        onClick={() => removeTag(tag)}
                      >
                        {tag}
                        <X className="ml-1 h-2.5 w-2.5" />
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* サイドバー（プレビュー非表示時） */}
        {!showPreview && (
          <div className="space-y-6">
            {/* ステータス */}
            <Card>
              <CardHeader>
                <CardTitle>公開設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
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
              </CardContent>
            </Card>

            {/* カテゴリー */}
            <Card>
              <CardHeader>
                <CardTitle>カテゴリー</CardTitle>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    カテゴリーがありません。
                    <Link href="/products/categories" className="text-primary hover:underline ml-1">
                      作成する
                    </Link>
                  </p>
                ) : (
                  <div className="space-y-2">
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
                              setSelectedCategories([
                                ...selectedCategories,
                                category.id,
                              ]);
                            } else {
                              setSelectedCategories(
                                selectedCategories.filter((id) => id !== category.id)
                              );
                            }
                          }}
                        />
                        <span className="text-sm">{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* タグ */}
            <Card>
              <CardHeader>
                <CardTitle>タグ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="タグを入力"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button variant="outline" onClick={addTag}>
                    追加
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeTag(tag)}
                      >
                        {tag}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

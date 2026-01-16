'use client';

import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  EyeOff,
  Columns,
  Plus, 
  Trash2, 
  Package, 
  ImagePlus,
  Smartphone,
  Monitor,
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Minus,
  ExternalLink,
  RefreshCw,
  Settings,
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
import { mockProducts, mockCategories } from '@/lib/mock-data';
import { useFrontendUrl } from '@/components/providers/organization-provider';
import { cn } from '@/lib/utils';

export default function ProductEditPage() {
  const params = useParams();
  const productId = params.id as string;
  
  const product = mockProducts.find((p) => p.id === productId);
  
  const firstVariant = product?.variants?.[0];
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    shortDescription: product?.shortDescription || '',
    price: firstVariant?.price || 0,
    compareAtPrice: firstVariant?.compareAtPrice || 0,
    sku: firstVariant?.sku || '',
    stock: firstVariant?.stock || 0,
    categoryId: product?.categoryIds?.[0] || '',
    status: product?.status || 'draft',
  });

  // プレビュー関連
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile');
  const [previewQuantity, setPreviewQuantity] = useState(1);
  const [previewKey, setPreviewKey] = useState(0);

  // 組織設定からフロントエンドURLを取得
  const frontendUrl = useFrontendUrl();
  const isFrontendConnected = !!frontendUrl;

  // プレビュー用データ
  const previewData = useMemo(() => ({
    id: productId,
    name: formData.name,
    description: formData.description,
    shortDescription: formData.shortDescription,
    price: formData.price,
    compareAtPrice: formData.compareAtPrice,
    stock: formData.stock,
    images: product?.images || [],
    status: formData.status,
  }), [productId, formData, product?.images]);

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

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">商品が見つかりません</h2>
        <p className="text-muted-foreground mb-4">指定された商品は存在しないか、削除された可能性があります。</p>
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
          <Button variant="outline" size="sm">
            <Save className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">下書き保存</span>
          </Button>
          <Button className="btn-premium" size="sm">
            更新する
          </Button>
        </div>
      </div>

      <div className={cn(
        "grid gap-6",
        showPreview ? "lg:grid-cols-2" : "lg:grid-cols-3"
      )}>
        {/* メインコンテンツ */}
        <div className={cn(showPreview ? "" : "lg:col-span-2", "space-y-6")}>
          {/* 基本情報 */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
              <CardDescription>商品の基本的な情報を入力してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">商品名 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="商品名を入力"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">商品説明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="商品の説明を入力..."
                  className="min-h-[150px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* 画像 */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>商品画像</CardTitle>
              <CardDescription>商品の画像をアップロードしてください</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {product.images.map((image, index) => (
                  <div key={image.id || index} className="relative aspect-square rounded-lg overflow-hidden border group">
                    <Image
                      src={image.url}
                      alt={image.alt || `商品画像 ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <button className="aspect-square rounded-lg border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm">画像を追加</span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* 価格・在庫 */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>価格・在庫</CardTitle>
              <CardDescription>価格と在庫情報を設定してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">販売価格 *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compareAtPrice">参考価格</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                    <Input
                      id="compareAtPrice"
                      type="number"
                      value={formData.compareAtPrice}
                      onChange={(e) => setFormData({ ...formData, compareAtPrice: Number(e.target.value) })}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="SKU-001"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">在庫数</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* バリエーション */}
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>バリエーション</CardTitle>
                <CardDescription>サイズや色などのバリエーションを管理</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                追加
              </Button>
            </CardHeader>
            <CardContent>
              {product.variants && product.variants.length > 0 ? (
                <div className="space-y-3">
                  {product.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center gap-4 p-4 rounded-lg border"
                    >
                      <div className="flex-1 grid gap-4 sm:grid-cols-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">バリエーション名</Label>
                          <Input defaultValue={variant.name} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">SKU</Label>
                          <Input defaultValue={variant.sku} className="mt-1 font-mono" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">価格</Label>
                          <Input defaultValue={variant.price} type="number" className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">在庫</Label>
                          <Input defaultValue={variant.stock} type="number" className="mt-1" />
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>バリエーションはまだ登録されていません</p>
                </div>
              )}
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
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
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
                    {product.images.length > 0 ? (
                      <div className={cn(
                        "relative rounded-xl overflow-hidden",
                        previewMode === 'mobile' ? "aspect-square" : "aspect-[4/3]"
                      )}>
                        <Image
                          src={product.images[0].url}
                          alt={product.images[0].alt || formData.name}
                          fill
                          className="object-cover"
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
                            <Star key={i} className={cn("h-4 w-4", i <= 4 ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">(24件)</span>
                      </div>

                      {/* 価格 */}
                      <div className="py-3 border-y">
                        <div className="flex items-baseline gap-2">
                          <span className={cn("font-bold text-orange-600", previewMode === 'mobile' ? "text-2xl" : "text-3xl")}>
                            ¥{formData.price.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">税込</span>
                        </div>
                        {formData.compareAtPrice > formData.price && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-muted-foreground line-through">
                              ¥{formData.compareAtPrice.toLocaleString()}
                            </span>
                            <Badge className="bg-red-500 text-white text-xs">
                              {Math.round((1 - formData.price / formData.compareAtPrice) * 100)}% OFF
                            </Badge>
                          </div>
                        )}
                      </div>

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
                          <span className="text-xs text-muted-foreground ml-2">在庫: {formData.stock}点</span>
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

            {/* サイドバー設定（プレビュー表示時） */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">公開設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">ステータス</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'draft' | 'published' | 'archived') => setFormData({ ...formData, status: value })}
                  >
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
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">おすすめ商品</Label>
                    <p className="text-xs text-muted-foreground">トップページに表示</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">カテゴリー</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="カテゴリーを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        )}

        {/* サイドバー（プレビュー非表示時） */}
        {!showPreview && (
          <div className="space-y-6">
            {/* 公開設定 */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>公開設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>おすすめ商品</Label>
                    <p className="text-xs text-muted-foreground">トップページに表示</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            {/* カテゴリー */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>カテゴリー</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリーを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* SEO設定 */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>SEO設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seoTitle">ページタイトル</Label>
                  <Input
                    id="seoTitle"
                    placeholder="SEO用タイトル"
                    defaultValue={product.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seoDescription">メタディスクリプション</Label>
                  <Textarea
                    id="seoDescription"
                    placeholder="検索結果に表示される説明文"
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}




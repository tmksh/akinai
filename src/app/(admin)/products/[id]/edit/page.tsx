'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, Save, Eye, Plus, Trash2, Package, ImagePlus } from 'lucide-react';
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

export default function ProductEditPage() {
  const params = useParams();
  const productId = params.id as string;
  
  const product = mockProducts.find((p) => p.id === productId);
  
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    compareAtPrice: product?.compareAtPrice || 0,
    sku: product?.sku || '',
    stock: product?.stock || 0,
    categoryId: product?.categoryId || '',
    status: product?.status || 'draft',
  });

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/products/${product.id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">商品を編集</h1>
            <p className="text-muted-foreground">{product.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            プレビュー
          </Button>
          <Button className="gradient-brand text-white">
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
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
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border group">
                    <Image
                      src={image}
                      alt={`商品画像 ${index + 1}`}
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

        {/* サイドバー */}
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
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
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
      </div>
    </div>
  );
}


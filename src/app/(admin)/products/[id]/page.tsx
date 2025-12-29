'use client';

import { useParams } from 'next/navigation';
import { ArrowLeft, Pencil, Trash2, Eye, Package } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockProducts, mockCategories } from '@/lib/mock-data';

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  
  const product = mockProducts.find((p) => p.id === productId);
  
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

  const category = mockCategories.find((c) => c.id === product.categoryId);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-muted-foreground">商品詳細</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            プレビュー
          </Button>
          <Button asChild className="gradient-brand text-white">
            <Link href={`/products/${product.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              編集
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* メイン情報 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 商品画像 */}
          <Card className="card-hover overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-video">
                <Image
                  src={product.images[0] || '/placeholder.png'}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
            </CardContent>
          </Card>

          {/* 商品説明 */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>商品説明</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {product.description}
              </p>
            </CardContent>
          </Card>

          {/* バリエーション */}
          {product.variants && product.variants.length > 0 && (
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>バリエーション</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{variant.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          SKU: {variant.sku}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(variant.price)}</p>
                        <p className="text-sm text-muted-foreground">
                          在庫: {variant.stock}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* ステータス */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>ステータス</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">公開状態</span>
                <Badge variant={product.status === 'published' ? 'default' : 'secondary'}>
                  {product.status === 'published' ? '公開中' : '下書き'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">カテゴリー</span>
                <span className="font-medium">{category?.name || '-'}</span>
              </div>
            </CardContent>
          </Card>

          {/* 価格情報 */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>価格情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">販売価格</span>
                <span className="text-xl font-bold">{formatCurrency(product.price)}</span>
              </div>
              {product.compareAtPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">参考価格</span>
                  <span className="text-muted-foreground line-through">
                    {formatCurrency(product.compareAtPrice)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 在庫情報 */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle>在庫情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">総在庫数</span>
                <span className="font-bold">{product.stock}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">SKU</span>
                <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                  {product.sku}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* アクション */}
          <Card className="card-hover border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">危険な操作</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full">
                <Trash2 className="mr-2 h-4 w-4" />
                商品を削除
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



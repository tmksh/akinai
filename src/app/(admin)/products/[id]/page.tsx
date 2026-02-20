'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowLeft, Pencil, Trash2, Eye, Package, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/components/providers/organization-provider';
import { getProduct, type ProductWithRelations } from '@/lib/actions/products';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(value);
};

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const { isLoading: orgLoading } = useOrganization();
  const [product, setProduct] = useState<ProductWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      const result = await getProduct(productId);
      if (result.data) {
        setProduct(result.data);
      } else {
        setNotFound(true);
      }
      setIsLoading(false);
    };
    fetchProduct();
  }, [productId]);

  if (orgLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !product) {
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

  const primaryCategory = product.categories?.[0];

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
          <Button asChild className="btn-premium">
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
              {product.images.length > 0 ? (
                <div className="space-y-2">
                  <div className="relative aspect-video">
                    <Image
                      src={product.images[0].url}
                      alt={product.images[0].alt || product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  {product.images.length > 1 && (
                    <div className="flex gap-2 p-3 overflow-x-auto">
                      {product.images.slice(1).map((img) => (
                        <div key={img.id} className="relative w-20 h-20 shrink-0 rounded-md overflow-hidden border">
                          <Image
                            src={img.url}
                            alt={img.alt || product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  <Package className="h-12 w-12 opacity-40" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 商品説明 */}
          {product.description && (
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
          )}

          {/* バリエーション */}
          {product.variants && product.variants.length > 0 && (
            <Card className="card-hover">
              <CardHeader>
                <CardTitle>色やサイズの種類</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {product.variants.map((variant) => {
                    const hiddenKeys = new Set(['imageUrl', 'image_url', 'image']);
                    const displayOptions = variant.options
                      ? Object.entries(variant.options as Record<string, string>).filter(
                          ([key, val]) => !hiddenKeys.has(key) && val && !val.startsWith('http')
                        )
                      : [];

                    return (
                      <div
                        key={variant.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{variant.name}</p>
                          <p className="text-sm text-muted-foreground font-mono truncate">
                            SKU: {variant.sku}
                          </p>
                          {displayOptions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {displayOptions.map(([key, val]) => (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key}: {val}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <p className="font-bold">{formatCurrency(variant.price)}</p>
                          <p className="text-sm text-muted-foreground">
                            在庫: {variant.stock}
                          </p>
                        </div>
                      </div>
                    );
                  })}
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
                <Badge variant={product.status === 'published' ? 'default' : product.status === 'archived' ? 'secondary' : 'outline'}>
                  {product.status === 'published' ? '公開中' : product.status === 'archived' ? 'アーカイブ' : '下書き'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">カテゴリー</span>
                <span className="font-medium">{primaryCategory?.name || '-'}</span>
              </div>
              {product.tags && product.tags.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">タグ</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
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
                <span className="text-xl font-bold">{formatCurrency(product.variants[0]?.price || 0)}</span>
              </div>
              {product.variants[0]?.compare_at_price && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">参考価格</span>
                  <span className="text-muted-foreground line-through">
                    {formatCurrency(product.variants[0].compare_at_price)}
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
                <span className="font-bold">{product.variants.reduce((sum, v) => sum + v.stock, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">SKU</span>
                <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                  {product.variants[0]?.sku || '-'}
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

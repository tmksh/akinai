import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag, Heart, Share2, Truck, Shield, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getShopProduct, getShopProducts, type ShopProduct } from '@/lib/actions/shop';
import ProductClient from './product-client';

// 関連商品コンポーネント
async function RelatedProducts({ currentProductId }: { currentProductId: string }) {
  const { data: products } = await getShopProducts({ limit: 4 });
  
  // 現在の商品を除外
  const relatedProducts = products?.filter(p => p.id !== currentProductId).slice(0, 4) || [];

  if (relatedProducts.length === 0) return null;

  return (
    <section className="py-16 border-t border-slate-100">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-xl font-light tracking-wide text-slate-800 mb-8">
          関連商品
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {relatedProducts.map((product) => (
            <Link
              key={product.id}
              href={`/shop/products/${product.slug || product.id}`}
              className="group"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-slate-100 mb-3">
                <Image
                  src={product.images[0]?.url || 'https://picsum.photos/seed/default/400/600'}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <h3 className="text-sm text-slate-800 group-hover:text-amber-700 transition-colors line-clamp-1">
                {product.name}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                ¥{product.minPrice.toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: product, error } = await getShopProduct(id);

  if (error || !product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* パンくずリスト */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/shop" className="hover:text-slate-800">ホーム</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/shop/products" className="hover:text-slate-800">製品</Link>
          {product.categories[0] && (
            <>
              <ChevronRight className="h-4 w-4" />
              <Link 
                href={`/shop/products?category=${product.categories[0].slug}`}
                className="hover:text-slate-800"
              >
                {product.categories[0].name}
              </Link>
            </>
          )}
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-800">{product.name}</span>
        </nav>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-8 md:gap-16">
          {/* 画像ギャラリー */}
          <ProductClient product={product} />
        </div>
      </div>

      {/* 商品説明 */}
      {product.description && (
        <section className="py-16 border-t border-slate-100">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-xl font-light tracking-wide text-slate-800 mb-6">
              商品について
            </h2>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 配送・返品情報 */}
      <section className="py-12 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl">
                <Truck className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-800 mb-1">配送について</h3>
                <p className="text-sm text-slate-600">
                  ¥5,000以上のご注文で送料無料<br />
                  通常2-5営業日でお届け
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl">
                <RotateCcw className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-800 mb-1">返品・交換</h3>
                <p className="text-sm text-slate-600">
                  商品到着後7日以内<br />
                  未使用・未開封に限る
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-xl">
                <Shield className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-800 mb-1">品質保証</h3>
                <p className="text-sm text-slate-600">
                  厳選された素材を使用<br />
                  品質に自信があります
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 関連商品 */}
      <RelatedProducts currentProductId={product.id} />
    </div>
  );
}

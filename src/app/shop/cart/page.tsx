'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Minus,
  Plus,
  X,
  ShoppingBag,
  ArrowRight,
  Tag,
  Truck,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCart, type CartItem } from '@/hooks/use-cart';
import { getShopProducts, type ShopProduct } from '@/lib/actions/shop';
import { toast } from 'sonner';

// ----- カートアイテム -----
function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
}) {
  return (
    <div className="flex gap-4 py-6 border-b border-slate-100 last:border-0">
      <Link href={`/shop/products/${item.productId}`} className="shrink-0">
        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden bg-slate-100">
          {item.image && (
            <Image src={item.image} alt={item.name} fill className="object-cover" />
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href={`/shop/products/${item.productId}`}
              className="font-medium text-slate-900 hover:text-orange-500 transition-colors line-clamp-2"
            >
              {item.name}
            </Link>
            {Object.keys(item.variant).length > 0 && (
              <p className="text-sm text-slate-500 mt-1">
                {Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(' / ')}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-0.5 font-mono">SKU: {item.sku}</p>
          </div>
          <button
            onClick={() => onRemove(item.variantId)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="flex items-end justify-between mt-4">
          <div className="flex items-center border border-slate-200 rounded-lg">
            <button
              onClick={() => onUpdateQuantity(item.variantId, Math.max(1, item.quantity - 1))}
              className="p-2 hover:bg-slate-50 transition-colors"
              disabled={item.quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-medium text-sm">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
              className="p-2 hover:bg-slate-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="text-right">
            <p className="font-bold text-slate-900">
              ¥{(item.price * item.quantity).toLocaleString()}
            </p>
            {item.compareAtPrice && item.compareAtPrice > item.price && (
              <p className="text-sm text-slate-400 line-through">
                ¥{(item.compareAtPrice * item.quantity).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 mx-auto mb-6 bg-slate-100 rounded-full flex items-center justify-center">
        <ShoppingBag className="h-10 w-10 text-slate-400" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">カートは空です</h2>
      <p className="text-slate-500 mb-6">商品を追加してお買い物を始めましょう</p>
      <Link href="/shop/products">
        <Button className="bg-orange-500 hover:bg-orange-600">
          商品を見る <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

export default function CartPage() {
  const { items, itemCount, subtotal, mounted, updateQuantity, removeItem } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<ShopProduct[]>([]);

  // おすすめ商品をDBから取得
  useEffect(() => {
    getShopProducts({ sortBy: 'popular', limit: 4 }).then(({ data }) => {
      setRecommendedProducts(data || []);
    });
  }, []);

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === 'WELCOME10') {
      setAppliedCoupon({ code: 'WELCOME10', discount: 0.1 });
      setCouponCode('');
      toast.success('クーポンを適用しました（10%OFF）');
    } else {
      toast.error('クーポンコードが無効です');
    }
  };

  const couponDiscount = appliedCoupon ? Math.round(subtotal * appliedCoupon.discount) : 0;
  const shippingFee = subtotal >= 5000 ? 0 : 550;
  const total = subtotal - couponDiscount + shippingFee;
  const freeShippingRemaining = Math.max(0, 5000 - subtotal);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">読み込み中...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-8">ショッピングカート</h1>
          <div className="bg-white rounded-2xl p-8">
            <EmptyCart />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">
          ショッピングカート ({itemCount}点)
        </h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* カートアイテム */}
          <div className="md:col-span-2 lg:col-span-2">
            <div className="bg-white rounded-2xl p-6">
              {items.map(item => (
                <CartItemRow
                  key={item.variantId}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>

            {/* 送料無料バー */}
            {freeShippingRemaining > 0 && (
              <div className="mt-4 bg-orange-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-medium text-orange-700">
                    あと ¥{freeShippingRemaining.toLocaleString()} で送料無料！
                  </span>
                </div>
                <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (subtotal / 5000) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 注文サマリー */}
          <div className="md:col-span-2 lg:col-span-1">
            <div className="bg-white rounded-2xl p-5 sm:p-6 sticky top-20 lg:top-28">
              <h2 className="text-lg font-bold text-slate-900 mb-4">注文内容</h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">小計</span>
                  <span className="text-slate-900">¥{subtotal.toLocaleString()}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      クーポン ({appliedCoupon.code})
                    </span>
                    <span>-¥{couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">配送料</span>
                  <span className={cn(shippingFee === 0 && 'text-green-600')}>
                    {shippingFee === 0 ? '無料' : `¥${shippingFee.toLocaleString()}`}
                  </span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between items-baseline mb-6">
                <span className="font-bold text-slate-900">合計</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-slate-900">
                    ¥{total.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-500 ml-1">(税込)</span>
                </div>
              </div>

              {/* クーポン */}
              {!appliedCoupon && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    クーポンコード
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                      placeholder="コードを入力"
                      className="h-10"
                    />
                    <Button variant="outline" onClick={applyCoupon} className="shrink-0">
                      適用
                    </Button>
                  </div>
                </div>
              )}

              {appliedCoupon && (
                <div className="mb-6 flex items-center justify-between p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" />
                    {appliedCoupon.code} 適用中
                  </span>
                  <button
                    onClick={() => setAppliedCoupon(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <Button
                size="lg"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-14 text-lg mb-4"
                asChild
              >
                <Link href="/shop/checkout">
                  レジに進む <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>SSL暗号化で安全にお支払い</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-green-500" />
                  <span>最短翌日発送</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* おすすめ商品 */}
        {recommendedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-slate-900 mb-6">こちらもおすすめ</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommendedProducts.map((product) => (
                <Link key={product.id} href={`/shop/products/${product.slug || product.id}`} className="group">
                  <div className="bg-white rounded-xl p-4">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 mb-3">
                      {product.images[0]?.url && (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 group-hover:text-orange-500 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      ¥{product.minPrice.toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
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

// モックカートデータ
const initialCartItems = [
  {
    id: '1',
    name: 'オーガニックコットンTシャツ',
    price: 4500,
    originalPrice: 5500,
    image: 'https://picsum.photos/seed/tshirt1/400/400',
    quantity: 2,
    variant: { サイズ: 'M', カラー: 'ホワイト' },
  },
  {
    id: '3',
    name: 'ハンドメイドレザーバッグ',
    price: 24800,
    image: 'https://picsum.photos/seed/bag1/400/400',
    quantity: 1,
    variant: {},
  },
  {
    id: '8',
    name: 'オーガニックソープセット',
    price: 3500,
    image: 'https://picsum.photos/seed/soap/400/400',
    quantity: 3,
    variant: {},
  },
];

const recommendedProducts = [
  { id: '5', name: 'ウールニットカーディガン', price: 15800, image: 'https://picsum.photos/seed/cardigan/400/400' },
  { id: '6', name: 'キャンバストートバッグ', price: 6800, image: 'https://picsum.photos/seed/tote/400/400' },
  { id: '7', name: 'シルバーイヤリング', price: 4200, image: 'https://picsum.photos/seed/earring/400/400' },
  { id: '9', name: 'リネンエプロン', price: 5900, image: 'https://picsum.photos/seed/apron/400/400' },
];

function CartItem({ 
  item, 
  onUpdateQuantity, 
  onRemove 
}: { 
  item: typeof initialCartItems[0]; 
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex gap-4 py-6 border-b border-slate-100 last:border-0">
      <Link href={`/shop/products/${item.id}`} className="shrink-0">
        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden bg-slate-100">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
          />
        </div>
      </Link>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link 
              href={`/shop/products/${item.id}`}
              className="font-medium text-slate-900 hover:text-orange-500 transition-colors line-clamp-2"
            >
              {item.name}
            </Link>
            {Object.keys(item.variant).length > 0 && (
              <p className="text-sm text-slate-500 mt-1">
                {Object.entries(item.variant).map(([key, value]) => `${key}: ${value}`).join(' / ')}
              </p>
            )}
          </div>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        
        <div className="flex items-end justify-between mt-4">
          <div className="flex items-center border border-slate-200 rounded-lg">
            <button
              onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
              className="p-2 hover:bg-slate-50 transition-colors"
              disabled={item.quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center font-medium text-sm">{item.quantity}</span>
            <button
              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
              className="p-2 hover:bg-slate-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          
          <div className="text-right">
            <p className="font-bold text-slate-900">
              ¥{(item.price * item.quantity).toLocaleString()}
            </p>
            {item.originalPrice && (
              <p className="text-sm text-slate-400 line-through">
                ¥{(item.originalPrice * item.quantity).toLocaleString()}
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
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        カートは空です
      </h2>
      <p className="text-slate-500 mb-6">
        商品を追加してお買い物を始めましょう
      </p>
      <Link href="/shop/products">
        <Button className="bg-orange-500 hover:bg-orange-600">
          商品を見る
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState(initialCartItems);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const updateQuantity = (id: string, quantity: number) => {
    setCartItems(items =>
      items.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const applyCoupon = () => {
    if (couponCode.toLowerCase() === 'welcome10') {
      setAppliedCoupon('WELCOME10');
      setCouponCode('');
    }
  };

  // 計算
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const originalSubtotal = cartItems.reduce((sum, item) => sum + (item.originalPrice || item.price) * item.quantity, 0);
  const itemDiscount = originalSubtotal - subtotal;
  const couponDiscount = appliedCoupon ? Math.round(subtotal * 0.1) : 0;
  const shippingFee = subtotal >= 5000 ? 0 : 550;
  const total = subtotal - couponDiscount + shippingFee;
  const freeShippingRemaining = Math.max(0, 5000 - subtotal);

  if (cartItems.length === 0) {
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
          ショッピングカート ({cartItems.length}点)
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* カートアイテム */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6">
              {cartItems.map(item => (
                <CartItem
                  key={item.id}
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
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 sticky top-28">
              <h2 className="text-lg font-bold text-slate-900 mb-4">注文内容</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">小計</span>
                  <span className="text-slate-900">¥{subtotal.toLocaleString()}</span>
                </div>
                {itemDiscount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>商品割引</span>
                    <span>-¥{itemDiscount.toLocaleString()}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      クーポン ({appliedCoupon})
                    </span>
                    <span>-¥{couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">配送料</span>
                  <span className={cn(shippingFee === 0 && "text-green-600")}>
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

              {/* クーポンコード */}
              {!appliedCoupon && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    クーポンコード
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="コードを入力"
                      className="h-10"
                    />
                    <Button 
                      variant="outline" 
                      onClick={applyCoupon}
                      className="shrink-0"
                    >
                      適用
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    テスト用: WELCOME10 で10%OFF
                  </p>
                </div>
              )}

              <Button 
                size="lg" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-14 text-lg mb-4"
              >
                レジに進む
                <ArrowRight className="ml-2 h-5 w-5" />
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
        <div className="mt-16">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            こちらもおすすめ
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recommendedProducts.map((product) => (
              <Link key={product.id} href={`/shop/products/${product.id}`} className="group">
                <div className="bg-white rounded-xl p-4">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 mb-3">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 group-hover:text-orange-500 transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    ¥{product.price.toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


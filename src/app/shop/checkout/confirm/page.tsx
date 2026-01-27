'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Check,
  MapPin,
  CreditCard,
  Building2,
  Wallet,
  Truck,
  ShoppingBag,
  Loader2,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variant: Record<string, string>;
  variantId: string;
  productId: string;
  sku: string;
}

interface ShippingInfo {
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  line1: string;
  line2: string;
}

interface CheckoutData {
  items: CartItem[];
  shipping: ShippingInfo;
  paymentMethod: string;
  subtotal: number;
  shippingFee: number;
  codFee: number;
  total: number;
}

const paymentMethodLabels: Record<string, { name: string; icon: typeof CreditCard }> = {
  credit_card: { name: 'クレジットカード', icon: CreditCard },
  bank_transfer: { name: '銀行振込', icon: Building2 },
  cod: { name: '代金引換', icon: Wallet },
};

export default function CheckoutConfirmPage() {
  const router = useRouter();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // チェックアウトデータを取得
  useEffect(() => {
    const saved = sessionStorage.getItem('checkout');
    if (saved) {
      try {
        setCheckoutData(JSON.parse(saved));
      } catch {
        router.push('/shop/checkout');
        return;
      }
    } else {
      router.push('/shop/checkout');
      return;
    }
    setIsLoading(false);
  }, [router]);

  // 注文を確定
  const handlePlaceOrder = async () => {
    if (!checkoutData || !agreedToTerms) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 注文番号を生成（実際はサーバーサイドで生成）
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // 注文データを作成
      const orderData = {
        orderNumber,
        items: checkoutData.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.name,
          variantName: Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(', ') || '-',
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        customerName: checkoutData.shipping.name,
        customerEmail: checkoutData.shipping.email,
        shippingAddress: {
          postalCode: checkoutData.shipping.postalCode,
          prefecture: checkoutData.shipping.prefecture,
          city: checkoutData.shipping.city,
          line1: checkoutData.shipping.line1,
          line2: checkoutData.shipping.line2,
          phone: checkoutData.shipping.phone,
        },
        paymentMethod: checkoutData.paymentMethod,
        subtotal: checkoutData.subtotal,
        shippingFee: checkoutData.shippingFee,
        codFee: checkoutData.codFee,
        total: checkoutData.total,
        createdAt: new Date().toISOString(),
      };

      // 注文完了データをsessionStorageに保存
      sessionStorage.setItem('order-complete', JSON.stringify(orderData));
      
      // カートをクリア
      localStorage.removeItem('cart');

      // 完了画面へ遷移
      router.push('/shop/checkout/complete');
    } catch (err) {
      console.error('Order failed:', err);
      setError('注文処理中にエラーが発生しました。もう一度お試しください。');
      setIsSubmitting(false);
    }
  };

  if (isLoading || !checkoutData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const PaymentIcon = paymentMethodLabels[checkoutData.paymentMethod]?.icon || CreditCard;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 戻るリンク */}
        <Link 
          href="/shop/checkout" 
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          入力画面に戻る
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">ご注文内容の確認</h1>
        <p className="text-slate-600 mb-8">以下の内容でよろしければ、注文を確定してください。</p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* お届け先情報 */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">お届け先</h2>
              </div>
              <Link 
                href="/shop/checkout" 
                className="text-sm text-orange-600 hover:text-orange-700"
              >
                変更する
              </Link>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="font-medium text-slate-900 mb-1">{checkoutData.shipping.name}</p>
              <p className="text-sm text-slate-600">
                〒{checkoutData.shipping.postalCode}<br />
                {checkoutData.shipping.prefecture}{checkoutData.shipping.city}{checkoutData.shipping.line1}
                {checkoutData.shipping.line2 && <><br />{checkoutData.shipping.line2}</>}
              </p>
              <p className="text-sm text-slate-600 mt-2">
                TEL: {checkoutData.shipping.phone}<br />
                Email: {checkoutData.shipping.email}
              </p>
            </div>
          </div>

          {/* お支払い方法 */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <PaymentIcon className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">お支払い方法</h2>
              </div>
              <Link 
                href="/shop/checkout" 
                className="text-sm text-orange-600 hover:text-orange-700"
              >
                変更する
              </Link>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="font-medium text-slate-900">
                {paymentMethodLabels[checkoutData.paymentMethod]?.name || checkoutData.paymentMethod}
              </p>
              {checkoutData.paymentMethod === 'credit_card' && (
                <p className="text-sm text-slate-600 mt-1">
                  ※ このデモでは実際の決済処理は行われません
                </p>
              )}
              {checkoutData.paymentMethod === 'bank_transfer' && (
                <p className="text-sm text-slate-600 mt-1">
                  ご注文確定後、振込先情報をメールでお送りします
                </p>
              )}
              {checkoutData.paymentMethod === 'cod' && (
                <p className="text-sm text-slate-600 mt-1">
                  商品お届け時に現金でお支払いください（手数料¥330）
                </p>
              )}
            </div>
          </div>

          {/* 注文商品 */}
          <div className="bg-white rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                ご注文商品（{checkoutData.items.length}点）
              </h2>
            </div>

            <div className="space-y-4">
              {checkoutData.items.map((item) => (
                <div key={item.id} className="flex gap-4 py-4 border-b border-slate-100 last:border-0">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    {Object.keys(item.variant).length > 0 && (
                      <p className="text-sm text-slate-500">
                        {Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(' / ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-slate-600">数量: {item.quantity}</p>
                      <p className="font-bold text-slate-900">
                        ¥{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* 金額明細 */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">小計</span>
                <span className="text-slate-900">¥{checkoutData.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  配送料
                </span>
                <span className={cn(checkoutData.shippingFee === 0 && 'text-green-600')}>
                  {checkoutData.shippingFee === 0 ? '無料' : `¥${checkoutData.shippingFee.toLocaleString()}`}
                </span>
              </div>
              {checkoutData.codFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">代引き手数料</span>
                  <span>¥{checkoutData.codFee.toLocaleString()}</span>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between items-baseline">
              <span className="text-lg font-bold text-slate-900">合計（税込）</span>
              <span className="text-2xl font-bold text-orange-600">
                ¥{checkoutData.total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 利用規約同意 */}
          <div className="bg-white rounded-2xl p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-slate-700">
                <Link href="/shop/terms" className="text-orange-600 hover:underline" target="_blank">
                  利用規約
                </Link>
                および
                <Link href="/shop/privacy" className="text-orange-600 hover:underline" target="_blank">
                  プライバシーポリシー
                </Link>
                に同意します
              </span>
            </label>
          </div>

          {/* 注文確定ボタン */}
          <div className="bg-white rounded-2xl p-6">
            <Button
              size="lg"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white h-16 text-lg"
              onClick={handlePlaceOrder}
              disabled={isSubmitting || !agreedToTerms}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  注文処理中...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  注文を確定する
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 mt-4 text-sm text-slate-500">
              <Shield className="h-4 w-4" />
              <span>SSL暗号化通信で安全にお手続きいただけます</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





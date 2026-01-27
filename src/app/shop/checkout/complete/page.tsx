'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  CheckCircle,
  Package,
  Mail,
  ArrowRight,
  Home,
  Copy,
  Check,
  Building2,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface OrderItem {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

interface ShippingAddress {
  postalCode: string;
  prefecture: string;
  city: string;
  line1: string;
  line2?: string;
  phone: string;
}

interface OrderData {
  orderNumber: string;
  items: OrderItem[];
  customerName: string;
  customerEmail: string;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  subtotal: number;
  shippingFee: number;
  codFee: number;
  total: number;
  createdAt: string;
}

const paymentMethodInfo: Record<string, { name: string; description: string; icon: typeof Building2 }> = {
  credit_card: {
    name: 'クレジットカード',
    description: '決済が完了しました。商品の発送準備を開始いたします。',
    icon: CheckCircle,
  },
  bank_transfer: {
    name: '銀行振込',
    description: '以下の口座にお振込みください。入金確認後、商品を発送いたします。',
    icon: Building2,
  },
  cod: {
    name: '代金引換',
    description: '商品お届け時に現金でお支払いください。',
    icon: Package,
  },
};

// 銀行振込用のモック口座情報
const bankInfo = {
  bankName: '商いストア銀行',
  branchName: '本店',
  accountType: '普通',
  accountNumber: '1234567',
  accountHolder: 'カ）アキナイストア',
};

export default function CheckoutCompletePage() {
  const router = useRouter();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // 注文データを取得
  useEffect(() => {
    const saved = sessionStorage.getItem('order-complete');
    if (saved) {
      try {
        setOrderData(JSON.parse(saved));
        // 注文データをクリア（リロード対策）
        // sessionStorage.removeItem('order-complete');
      } catch {
        router.push('/shop');
        return;
      }
    } else {
      router.push('/shop');
      return;
    }
    setIsLoading(false);
  }, [router]);

  // 注文番号をコピー
  const copyOrderNumber = async () => {
    if (!orderData) return;
    
    try {
      await navigator.clipboard.writeText(orderData.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // コピー失敗
    }
  };

  if (isLoading || !orderData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const paymentInfo = paymentMethodInfo[orderData.paymentMethod] || paymentMethodInfo.credit_card;
  const PaymentIcon = paymentInfo.icon;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 完了メッセージ */}
        <div className="bg-white rounded-2xl p-8 text-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            ご注文ありがとうございます！
          </h1>
          <p className="text-slate-600 mb-6">
            ご注文を承りました。確認メールを
            <span className="font-medium text-slate-900"> {orderData.customerEmail} </span>
            にお送りしました。
          </p>

          {/* 注文番号 */}
          <div className="inline-flex items-center gap-2 bg-slate-100 rounded-xl px-6 py-3">
            <span className="text-sm text-slate-600">注文番号:</span>
            <span className="font-mono font-bold text-lg text-slate-900">{orderData.orderNumber}</span>
            <button
              onClick={copyOrderNumber}
              className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* 支払い方法に応じた案内 */}
        <div className={cn(
          "rounded-2xl p-6 mb-6",
          orderData.paymentMethod === 'bank_transfer' 
            ? 'bg-blue-50 border border-blue-200'
            : 'bg-white'
        )}>
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-xl",
              orderData.paymentMethod === 'bank_transfer' 
                ? 'bg-blue-100'
                : 'bg-slate-100'
            )}>
              <PaymentIcon className={cn(
                "h-6 w-6",
                orderData.paymentMethod === 'bank_transfer'
                  ? 'text-blue-600'
                  : 'text-slate-600'
              )} />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-slate-900 mb-1">{paymentInfo.name}</h2>
              <p className="text-sm text-slate-600">{paymentInfo.description}</p>

              {/* 銀行振込の場合は口座情報を表示 */}
              {orderData.paymentMethod === 'bank_transfer' && (
                <div className="mt-4 bg-white rounded-xl p-4 border border-blue-200">
                  <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    振込先口座情報
                  </h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-slate-500">銀行名</dt>
                    <dd className="font-medium text-slate-900">{bankInfo.bankName}</dd>
                    <dt className="text-slate-500">支店名</dt>
                    <dd className="font-medium text-slate-900">{bankInfo.branchName}</dd>
                    <dt className="text-slate-500">口座種別</dt>
                    <dd className="font-medium text-slate-900">{bankInfo.accountType}</dd>
                    <dt className="text-slate-500">口座番号</dt>
                    <dd className="font-medium text-slate-900">{bankInfo.accountNumber}</dd>
                    <dt className="text-slate-500">口座名義</dt>
                    <dd className="font-medium text-slate-900">{bankInfo.accountHolder}</dd>
                  </dl>
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800">振込期限: 7日以内</p>
                        <p className="text-amber-700">
                          振込名義人は「{orderData.customerName}」様でお願いいたします。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 注文内容サマリー */}
        <div className="bg-white rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            ご注文内容
          </h2>

          <div className="space-y-3">
            {orderData.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-slate-900">{item.productName}</p>
                  {item.variantName && item.variantName !== '-' && (
                    <p className="text-sm text-slate-500">{item.variantName}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">× {item.quantity}</p>
                  <p className="font-medium text-slate-900">
                    ¥{(item.unitPrice * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">小計</span>
              <span>¥{orderData.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">配送料</span>
              <span className={cn(orderData.shippingFee === 0 && 'text-green-600')}>
                {orderData.shippingFee === 0 ? '無料' : `¥${orderData.shippingFee.toLocaleString()}`}
              </span>
            </div>
            {orderData.codFee > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">代引き手数料</span>
                <span>¥{orderData.codFee.toLocaleString()}</span>
              </div>
            )}
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between items-baseline">
            <span className="font-bold text-slate-900">合計（税込）</span>
            <span className="text-xl font-bold text-slate-900">
              ¥{orderData.total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* お届け先 */}
        <div className="bg-white rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-slate-900 mb-4">お届け先</h2>
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-900 mb-1">{orderData.customerName}</p>
            <p>
              〒{orderData.shippingAddress.postalCode}<br />
              {orderData.shippingAddress.prefecture}
              {orderData.shippingAddress.city}
              {orderData.shippingAddress.line1}
              {orderData.shippingAddress.line2 && <><br />{orderData.shippingAddress.line2}</>}
            </p>
            <p className="mt-2">TEL: {orderData.shippingAddress.phone}</p>
          </div>
        </div>

        {/* 次のステップ */}
        <div className="bg-slate-100 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            今後の流れ
          </h2>
          <ol className="space-y-3 text-sm text-slate-600">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>確認メールが届きます（{orderData.customerEmail}）</span>
            </li>
            {orderData.paymentMethod === 'bank_transfer' && (
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span>7日以内に指定口座にお振込みください</span>
              </li>
            )}
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                {orderData.paymentMethod === 'bank_transfer' ? '3' : '2'}
              </span>
              <span>商品の発送準備ができ次第、発送完了メールをお送りします</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                {orderData.paymentMethod === 'bank_transfer' ? '4' : '3'}
              </span>
              <span>商品をお届けいたします（通常2-5営業日）</span>
            </li>
          </ol>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/shop">
              <Home className="h-4 w-4 mr-2" />
              トップページへ
            </Link>
          </Button>
          <Button asChild className="flex-1 bg-orange-500 hover:bg-orange-600">
            <Link href="/shop/products">
              お買い物を続ける
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}





'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  ShoppingBag,
  Truck,
  CreditCard,
  Building2,
  Wallet,
  MapPin,
  User,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// カートデータをlocalStorageから取得するユーティリティ
function getCartFromStorage() {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('cart');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  // デモ用のデフォルトカートデータ
  return [
    {
      id: '1',
      name: 'オーガニックコットンTシャツ',
      price: 4500,
      image: 'https://picsum.photos/seed/tshirt1/400/400',
      quantity: 2,
      variant: { サイズ: 'M', カラー: 'ホワイト' },
      variantId: 'v1',
      productId: 'p1',
      sku: 'TSH-WHT-M',
    },
    {
      id: '3',
      name: 'ハンドメイドレザーバッグ',
      price: 24800,
      image: 'https://picsum.photos/seed/bag1/400/400',
      quantity: 1,
      variant: {},
      variantId: 'v3',
      productId: 'p3',
      sku: 'BAG-BRW',
    },
  ];
}

// 支払い方法
const paymentMethods = [
  {
    id: 'credit_card',
    name: 'クレジットカード',
    description: 'Visa, Mastercard, JCB, American Express',
    icon: CreditCard,
    available: true,
  },
  {
    id: 'bank_transfer',
    name: '銀行振込',
    description: '注文後に振込先をご案内します',
    icon: Building2,
    available: true,
  },
  {
    id: 'cod',
    name: '代金引換',
    description: '商品お届け時にお支払い（手数料¥330）',
    icon: Wallet,
    available: true,
  },
];

// 都道府県リスト
const prefectures = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

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

interface ShippingForm {
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  line1: string;
  line2: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [shippingForm, setShippingForm] = useState<ShippingForm>({
    name: '',
    email: '',
    phone: '',
    postalCode: '',
    prefecture: '',
    city: '',
    line1: '',
    line2: '',
  });
  const [errors, setErrors] = useState<Partial<ShippingForm>>({});

  // カートデータを取得
  useEffect(() => {
    const items = getCartFromStorage();
    setCartItems(items);
    setIsLoading(false);
  }, []);

  // 郵便番号から住所を自動入力
  const handlePostalCodeChange = async (value: string) => {
    setShippingForm(prev => ({ ...prev, postalCode: value }));
    
    // 7桁の郵便番号の場合、住所を検索
    const cleaned = value.replace(/-/g, '');
    if (cleaned.length === 7) {
      try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`);
        const data = await res.json();
        if (data.results && data.results[0]) {
          const result = data.results[0];
          setShippingForm(prev => ({
            ...prev,
            prefecture: result.address1,
            city: result.address2 + result.address3,
          }));
        }
      } catch {
        // 住所検索に失敗しても続行
      }
    }
  };

  // バリデーション
  const validateForm = (): boolean => {
    const newErrors: Partial<ShippingForm> = {};
    
    if (!shippingForm.name.trim()) newErrors.name = 'お名前を入力してください';
    if (!shippingForm.email.trim()) newErrors.email = 'メールアドレスを入力してください';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingForm.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }
    if (!shippingForm.phone.trim()) newErrors.phone = '電話番号を入力してください';
    if (!shippingForm.postalCode.trim()) newErrors.postalCode = '郵便番号を入力してください';
    if (!shippingForm.prefecture) newErrors.prefecture = '都道府県を選択してください';
    if (!shippingForm.city.trim()) newErrors.city = '市区町村を入力してください';
    if (!shippingForm.line1.trim()) newErrors.line1 = '番地を入力してください';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 注文確認画面へ進む
  const handleProceed = () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    // チェックアウトデータをsessionStorageに保存
    const checkoutData = {
      items: cartItems,
      shipping: shippingForm,
      paymentMethod,
      subtotal,
      shippingFee,
      codFee,
      total,
    };
    sessionStorage.setItem('checkout', JSON.stringify(checkoutData));
    
    router.push('/shop/checkout/confirm');
  };

  // 計算
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 5000 ? 0 : 550;
  const codFee = paymentMethod === 'cod' ? 330 : 0;
  const total = subtotal + shippingFee + codFee;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl p-8 text-center">
            <ShoppingBag className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">カートが空です</h2>
            <p className="text-slate-500 mb-6">商品を追加してからお手続きください</p>
            <Button asChild>
              <Link href="/shop/products">商品を見る</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 戻るリンク */}
        <Link 
          href="/shop/cart" 
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          カートに戻る
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-8">ご注文手続き</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* フォームエリア */}
          <div className="lg:col-span-2 space-y-6">
            {/* お届け先情報 */}
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">お届け先情報</h2>
              </div>

              <div className="grid gap-4">
                {/* お名前 */}
                <div>
                  <Label htmlFor="name" className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    お名前 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={shippingForm.name}
                    onChange={(e) => setShippingForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="山田 太郎"
                    className={cn(errors.name && 'border-red-500')}
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                </div>

                {/* メールアドレス */}
                <div>
                  <Label htmlFor="email" className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    メールアドレス <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={shippingForm.email}
                    onChange={(e) => setShippingForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="example@email.com"
                    className={cn(errors.email && 'border-red-500')}
                  />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                </div>

                {/* 電話番号 */}
                <div>
                  <Label htmlFor="phone" className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    電話番号 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={shippingForm.phone}
                    onChange={(e) => setShippingForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="090-1234-5678"
                    className={cn(errors.phone && 'border-red-500')}
                  />
                  {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
                </div>

                {/* 郵便番号 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postalCode">
                      郵便番号 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="postalCode"
                      value={shippingForm.postalCode}
                      onChange={(e) => handlePostalCodeChange(e.target.value)}
                      placeholder="123-4567"
                      className={cn(errors.postalCode && 'border-red-500')}
                    />
                    {errors.postalCode && <p className="text-sm text-red-500 mt-1">{errors.postalCode}</p>}
                  </div>
                  <div>
                    <Label htmlFor="prefecture">
                      都道府県 <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="prefecture"
                      value={shippingForm.prefecture}
                      onChange={(e) => setShippingForm(prev => ({ ...prev, prefecture: e.target.value }))}
                      className={cn(
                        'w-full h-10 px-3 rounded-md border border-input bg-background text-sm',
                        errors.prefecture && 'border-red-500'
                      )}
                    >
                      <option value="">選択してください</option>
                      {prefectures.map((pref) => (
                        <option key={pref} value={pref}>{pref}</option>
                      ))}
                    </select>
                    {errors.prefecture && <p className="text-sm text-red-500 mt-1">{errors.prefecture}</p>}
                  </div>
                </div>

                {/* 市区町村 */}
                <div>
                  <Label htmlFor="city">
                    市区町村 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={shippingForm.city}
                    onChange={(e) => setShippingForm(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="渋谷区"
                    className={cn(errors.city && 'border-red-500')}
                  />
                  {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city}</p>}
                </div>

                {/* 番地 */}
                <div>
                  <Label htmlFor="line1">
                    番地 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="line1"
                    value={shippingForm.line1}
                    onChange={(e) => setShippingForm(prev => ({ ...prev, line1: e.target.value }))}
                    placeholder="1-2-3"
                    className={cn(errors.line1 && 'border-red-500')}
                  />
                  {errors.line1 && <p className="text-sm text-red-500 mt-1">{errors.line1}</p>}
                </div>

                {/* 建物名・部屋番号 */}
                <div>
                  <Label htmlFor="line2">建物名・部屋番号（任意）</Label>
                  <Input
                    id="line2"
                    value={shippingForm.line2}
                    onChange={(e) => setShippingForm(prev => ({ ...prev, line2: e.target.value }))}
                    placeholder="○○マンション 101号室"
                  />
                </div>
              </div>
            </div>

            {/* お支払い方法 */}
            <div className="bg-white rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">お支払い方法</h2>
              </div>

              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="space-y-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <label
                        key={method.id}
                        className={cn(
                          'flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all',
                          paymentMethod === method.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <RadioGroupItem value={method.id} className="mt-1" />
                        <Icon className={cn(
                          'h-5 w-5 mt-0.5',
                          paymentMethod === method.id ? 'text-orange-600' : 'text-slate-400'
                        )} />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{method.name}</p>
                          <p className="text-sm text-slate-500">{method.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </RadioGroup>

              {paymentMethod === 'credit_card' && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">
                    ※ クレジットカード情報は注文確定後に入力いただきます
                  </p>
                </div>
              )}

              {paymentMethod === 'bank_transfer' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    ご注文確定後、振込先情報をメールでお送りします。<br />
                    お振込み確認後、商品を発送いたします。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 注文サマリー */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 sticky top-28">
              <h2 className="text-lg font-bold text-slate-900 mb-4">ご注文内容</h2>
              
              {/* 商品リスト */}
              <div className="space-y-4 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                      <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                      {Object.keys(item.variant).length > 0 && (
                        <p className="text-xs text-slate-500">
                          {Object.entries(item.variant).map(([k, v]) => `${k}: ${v}`).join(' / ')}
                        </p>
                      )}
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        ¥{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* 金額明細 */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">小計</span>
                  <span className="text-slate-900">¥{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    配送料
                  </span>
                  <span className={cn(shippingFee === 0 && 'text-green-600')}>
                    {shippingFee === 0 ? '無料' : `¥${shippingFee.toLocaleString()}`}
                  </span>
                </div>
                {codFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">代引き手数料</span>
                    <span>¥{codFee.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between items-baseline mb-6">
                <span className="font-bold text-slate-900">合計（税込）</span>
                <span className="text-2xl font-bold text-slate-900">
                  ¥{total.toLocaleString()}
                </span>
              </div>

              <Button
                size="lg"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-14 text-lg"
                onClick={handleProceed}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    注文内容を確認
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              <p className="text-xs text-slate-500 text-center mt-4">
                次のページで注文内容をご確認いただけます
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}





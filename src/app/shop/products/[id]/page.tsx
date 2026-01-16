'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Star, 
  Heart, 
  Share2, 
  Truck, 
  Shield, 
  RefreshCw,
  Minus,
  Plus,
  ChevronRight,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// モックデータ
const products: Record<string, {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  details: string[];
  images: string[];
  rating: number;
  reviews: number;
  stock: number;
  category: string;
  variants?: { name: string; options: string[] }[];
}> = {
  '1': {
    id: '1',
    name: 'オーガニックコットンTシャツ',
    price: 4500,
    originalPrice: 5500,
    description: '環境に優しいオーガニックコットン100%使用。肌触りが良く、着心地抜群のTシャツです。シンプルなデザインで、どんなスタイルにも合わせやすいアイテム。',
    details: [
      '素材: オーガニックコットン100%',
      '生産国: 日本',
      'お手入れ: 洗濯機可（ネット使用）',
      'モデル身長: 170cm / 着用サイズ: M',
    ],
    images: [
      'https://picsum.photos/seed/tshirt1/800/800',
      'https://picsum.photos/seed/tshirt1-2/800/800',
      'https://picsum.photos/seed/tshirt1-3/800/800',
      'https://picsum.photos/seed/tshirt1-4/800/800',
    ],
    rating: 4.8,
    reviews: 124,
    stock: 25,
    category: 'アパレル',
    variants: [
      { name: 'サイズ', options: ['S', 'M', 'L', 'XL'] },
      { name: 'カラー', options: ['ホワイト', 'ブラック', 'グレー', 'ネイビー'] },
    ],
  },
  '2': {
    id: '2',
    name: 'リネンワイドパンツ',
    price: 8900,
    description: '通気性抜群のリネン素材を使用したワイドパンツ。夏でも快適に過ごせる一枚。リラックス感のあるシルエットが今季のトレンド。',
    details: [
      '素材: リネン100%',
      '生産国: 日本',
      'お手入れ: 手洗い推奨',
    ],
    images: [
      'https://picsum.photos/seed/pants1/800/800',
      'https://picsum.photos/seed/pants1-2/800/800',
      'https://picsum.photos/seed/pants1-3/800/800',
    ],
    rating: 4.6,
    reviews: 89,
    stock: 15,
    category: 'アパレル',
    variants: [
      { name: 'サイズ', options: ['S', 'M', 'L'] },
      { name: 'カラー', options: ['ベージュ', 'ブラック', 'ネイビー'] },
    ],
  },
  '3': {
    id: '3',
    name: 'ハンドメイドレザーバッグ',
    price: 24800,
    description: '職人が一つ一つ丁寧に仕上げたハンドメイドのレザーバッグ。上質な本革を使用し、使い込むほどに味わいが増します。',
    details: [
      '素材: 牛革（本革）',
      '生産国: 日本',
      'サイズ: W32 x H24 x D12 cm',
    ],
    images: [
      'https://picsum.photos/seed/bag1/800/800',
      'https://picsum.photos/seed/bag1-2/800/800',
    ],
    rating: 4.9,
    reviews: 56,
    stock: 8,
    category: 'アクセサリー',
  },
};

const relatedProducts = [
  { id: '5', name: 'ウールニットカーディガン', price: 15800, image: 'https://picsum.photos/seed/cardigan/600/600' },
  { id: '6', name: 'キャンバストートバッグ', price: 6800, image: 'https://picsum.photos/seed/tote/600/600' },
  { id: '7', name: 'シルバーイヤリング', price: 4200, image: 'https://picsum.photos/seed/earring/600/600' },
  { id: '8', name: 'オーガニックソープセット', price: 3500, image: 'https://picsum.photos/seed/soap/600/600' },
];

const reviews = [
  { id: 1, author: '山田太郎', rating: 5, date: '2024-01-15', content: '生地がとても柔らかくて着心地が良いです。サイズもちょうど良かったです。' },
  { id: 2, author: '佐藤花子', rating: 4, date: '2024-01-10', content: 'シンプルで使いやすいデザイン。色違いも購入予定です。' },
  { id: 3, author: '田中一郎', rating: 5, date: '2024-01-05', content: 'オーガニックコットンなので肌にも優しい。リピート確定！' },
];

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const product = products[productId] || products['1'];

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [isWishlisted, setIsWishlisted] = useState(false);

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-white">
      {/* パンくずリスト */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/shop" className="hover:text-slate-900">ホーム</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/shop/products" className="hover:text-slate-900">商品一覧</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900 truncate">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* 画像ギャラリー */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100">
              <Image
                src={product.images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
              {discount > 0 && (
                <Badge className="absolute top-4 left-4 bg-red-500 text-lg px-3 py-1">
                  -{discount}%
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden bg-slate-100 border-2 transition-colors",
                    selectedImage === index ? "border-orange-500" : "border-transparent hover:border-slate-300"
                  )}
                >
                  <Image
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 商品情報 */}
          <div>
            <div className="mb-6">
              <Badge variant="secondary" className="mb-3">{product.category}</Badge>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                {product.name}
              </h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-5 w-5",
                        i < Math.floor(product.rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200"
                      )}
                    />
                  ))}
                </div>
                <span className="font-medium">{product.rating}</span>
                <Link href="#reviews" className="text-slate-500 hover:text-slate-900">
                  ({product.reviews}件のレビュー)
                </Link>
              </div>
            </div>

            {/* 価格 */}
            <div className="pb-6 mb-6 border-b border-slate-100">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-slate-900">
                  ¥{product.price.toLocaleString()}
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-slate-400 line-through">
                    ¥{product.originalPrice.toLocaleString()}
                  </span>
                )}
                <span className="text-sm text-slate-500">(税込)</span>
              </div>
            </div>

            {/* バリエーション選択 */}
            {product.variants && (
              <div className="space-y-4 pb-6 mb-6 border-b border-slate-100">
                {product.variants.map((variant) => (
                  <div key={variant.name}>
                    <label className="block text-sm font-medium text-slate-900 mb-2">
                      {variant.name}
                      {selectedVariants[variant.name] && (
                        <span className="text-slate-500 ml-2">: {selectedVariants[variant.name]}</span>
                      )}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {variant.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => setSelectedVariants({ ...selectedVariants, [variant.name]: option })}
                          className={cn(
                            "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors",
                            selectedVariants[variant.name] === option
                              ? "border-orange-500 bg-orange-50 text-orange-600"
                              : "border-slate-200 hover:border-slate-300"
                          )}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 数量選択 */}
            <div className="pb-6 mb-6 border-b border-slate-100">
              <label className="block text-sm font-medium text-slate-900 mb-2">
                数量
              </label>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-slate-200 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-slate-50 transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="p-3 hover:bg-slate-50 transition-colors"
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-slate-500">
                  在庫: {product.stock}点
                </span>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="space-y-3 mb-8">
              <Button 
                size="lg" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white h-14 text-lg"
              >
                カートに追加
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-1 h-12"
                  onClick={() => setIsWishlisted(!isWishlisted)}
                >
                  <Heart className={cn("h-5 w-5 mr-2", isWishlisted && "fill-red-500 text-red-500")} />
                  お気に入り
                </Button>
                <Button variant="outline" size="lg" className="flex-1 h-12">
                  <Share2 className="h-5 w-5 mr-2" />
                  シェア
                </Button>
              </div>
            </div>

            {/* 配送情報 */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <Truck className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">送料無料</p>
                  <p className="text-sm text-slate-500">¥5,000以上のお買い物で</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <Shield className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">安心保証</p>
                  <p className="text-sm text-slate-500">30日間返品保証付き</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg">
                  <RefreshCw className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">簡単返品</p>
                  <p className="text-sm text-slate-500">サイズ交換無料</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 商品詳細タブ */}
        <div className="mt-16">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-6 py-3"
              >
                商品説明
              </TabsTrigger>
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-6 py-3"
              >
                詳細情報
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent px-6 py-3"
              >
                レビュー ({product.reviews})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="pt-6">
              <p className="text-slate-600 leading-relaxed max-w-3xl">
                {product.description}
              </p>
            </TabsContent>
            <TabsContent value="details" className="pt-6">
              <ul className="space-y-2 max-w-3xl">
                {product.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-600">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    {detail}
                  </li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="reviews" id="reviews" className="pt-6">
              <div className="space-y-6 max-w-3xl">
                {reviews.map((review) => (
                  <div key={review.id} className="pb-6 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-200"
                            )}
                          />
                        ))}
                      </div>
                      <span className="font-medium text-slate-900">{review.author}</span>
                      <span className="text-sm text-slate-400">{review.date}</span>
                    </div>
                    <p className="text-slate-600">{review.content}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* 関連商品 */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">関連商品</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map((item) => (
              <Link key={item.id} href={`/shop/products/${item.id}`} className="group">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 mb-3">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <h3 className="font-medium text-slate-900 group-hover:text-orange-500 transition-colors line-clamp-1">
                  {item.name}
                </h3>
                <p className="font-bold text-slate-900 mt-1">
                  ¥{item.price.toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


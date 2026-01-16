'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  Star, 
  SlidersHorizontal, 
  Grid3X3, 
  LayoutList, 
  ChevronDown,
  X,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// モックデータ
const allProducts = [
  { id: '1', name: 'オーガニックコットンTシャツ', price: 4500, originalPrice: 5500, category: 'apparel', image: 'https://picsum.photos/seed/tshirt1/600/600', rating: 4.8, reviews: 124, badge: 'SALE' },
  { id: '2', name: 'リネンワイドパンツ', price: 8900, category: 'apparel', image: 'https://picsum.photos/seed/pants1/600/600', rating: 4.6, reviews: 89, badge: 'NEW' },
  { id: '3', name: 'ハンドメイドレザーバッグ', price: 24800, category: 'accessories', image: 'https://picsum.photos/seed/bag1/600/600', rating: 4.9, reviews: 56 },
  { id: '4', name: 'シルクスカーフ', price: 12000, category: 'accessories', image: 'https://picsum.photos/seed/scarf1/600/600', rating: 4.7, reviews: 42 },
  { id: '5', name: 'ウールニットカーディガン', price: 15800, category: 'apparel', image: 'https://picsum.photos/seed/cardigan/600/600', rating: 4.5, reviews: 67, badge: 'NEW' },
  { id: '6', name: 'キャンバストートバッグ', price: 6800, category: 'accessories', image: 'https://picsum.photos/seed/tote/600/600', rating: 4.4, reviews: 98 },
  { id: '7', name: 'シルバーイヤリング', price: 4200, category: 'accessories', image: 'https://picsum.photos/seed/earring/600/600', rating: 4.8, reviews: 34 },
  { id: '8', name: 'オーガニックソープセット', price: 3500, category: 'home', image: 'https://picsum.photos/seed/soap/600/600', rating: 4.6, reviews: 156 },
  { id: '9', name: 'リネンエプロン', price: 5900, category: 'home', image: 'https://picsum.photos/seed/apron/600/600', rating: 4.7, reviews: 45 },
  { id: '10', name: 'ハンドメイドキャンドル', price: 2800, category: 'home', image: 'https://picsum.photos/seed/candle/600/600', rating: 4.9, reviews: 203 },
  { id: '11', name: 'オーガニックコットンソックス', price: 1800, category: 'apparel', image: 'https://picsum.photos/seed/socks/600/600', rating: 4.3, reviews: 78 },
  { id: '12', name: 'ビンテージウォッチ', price: 38000, category: 'accessories', image: 'https://picsum.photos/seed/watch/600/600', rating: 4.9, reviews: 23 },
];

const categories = [
  { id: 'all', name: 'すべて', count: 12 },
  { id: 'apparel', name: 'アパレル', count: 4 },
  { id: 'accessories', name: 'アクセサリー', count: 5 },
  { id: 'home', name: 'ホームグッズ', count: 3 },
];

const sortOptions = [
  { value: 'popular', label: '人気順' },
  { value: 'new', label: '新着順' },
  { value: 'price-low', label: '価格が安い順' },
  { value: 'price-high', label: '価格が高い順' },
  { value: 'rating', label: '評価が高い順' },
];

function ProductCard({ product, viewMode }: { product: typeof allProducts[0]; viewMode: 'grid' | 'list' }) {
  const [isWishlisted, setIsWishlisted] = useState(false);

  if (viewMode === 'list') {
    return (
      <Link href={`/shop/products/${product.id}`} className="group flex gap-4 p-4 bg-white rounded-xl border border-slate-100 hover:shadow-lg transition-shadow">
        <div className="relative w-32 h-32 rounded-lg overflow-hidden shrink-0">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover"
          />
          {product.badge && (
            <Badge className={cn(
              "absolute top-2 left-2 text-xs",
              product.badge === 'SALE' ? "bg-red-500" : "bg-orange-500"
            )}>
              {product.badge}
            </Badge>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-900 group-hover:text-orange-500 transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm text-slate-600">{product.rating}</span>
            <span className="text-sm text-slate-400">({product.reviews}件)</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-lg font-bold text-slate-900">
              ¥{product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-slate-400 line-through">
                ¥{product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsWishlisted(!isWishlisted);
          }}
          className="p-2 h-fit"
        >
          <Heart className={cn("h-5 w-5", isWishlisted ? "fill-red-500 text-red-500" : "text-slate-400")} />
        </button>
      </Link>
    );
  }

  return (
    <Link href={`/shop/products/${product.id}`} className="group block">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 mb-4">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.badge && (
          <Badge className={cn(
            "absolute top-3 left-3",
            product.badge === 'SALE' ? "bg-red-500" : "bg-orange-500"
          )}>
            {product.badge}
          </Badge>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsWishlisted(!isWishlisted);
          }}
          className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart className={cn("h-4 w-4", isWishlisted ? "fill-red-500 text-red-500" : "text-slate-600")} />
        </button>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        <button className="absolute bottom-3 left-3 right-3 py-2.5 bg-white/95 backdrop-blur-sm rounded-lg font-medium text-slate-900 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:bg-white">
          カートに追加
        </button>
      </div>
      <div>
        <h3 className="font-medium text-slate-900 group-hover:text-orange-500 transition-colors line-clamp-1">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mt-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="text-sm text-slate-600">{product.rating}</span>
          <span className="text-sm text-slate-400">({product.reviews})</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-lg font-bold text-slate-900">
            ¥{product.price.toLocaleString()}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-slate-400 line-through">
              ¥{product.originalPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function FilterSidebar({ 
  selectedCategory, 
  setSelectedCategory,
  priceRange,
  setPriceRange,
}: {
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
}) {
  return (
    <div className="space-y-6">
      {/* カテゴリー */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-3">カテゴリー</h3>
        <div className="space-y-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "w-full flex items-center justify-between py-2 px-3 rounded-lg text-left transition-colors",
                selectedCategory === category.id
                  ? "bg-orange-50 text-orange-600"
                  : "hover:bg-slate-50 text-slate-700"
              )}
            >
              <span>{category.name}</span>
              <span className="text-sm text-slate-400">{category.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 価格帯 */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-3">価格帯</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="¥ 下限"
            value={priceRange[0] || ''}
            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
            className="h-9"
          />
          <span className="text-slate-400">〜</span>
          <Input
            type="number"
            placeholder="¥ 上限"
            value={priceRange[1] || ''}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
            className="h-9"
          />
        </div>
      </div>

      {/* 評価 */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-3">評価</h3>
        <div className="space-y-2">
          {[4, 3, 2, 1].map((rating) => (
            <label key={rating} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-300" />
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-slate-500">以上</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';
  
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);

  const filteredProducts = useMemo(() => {
    let products = [...allProducts];
    
    // カテゴリーフィルター
    if (selectedCategory !== 'all') {
      products = products.filter(p => p.category === selectedCategory);
    }
    
    // 価格フィルター
    if (priceRange[0] > 0) {
      products = products.filter(p => p.price >= priceRange[0]);
    }
    if (priceRange[1] > 0) {
      products = products.filter(p => p.price <= priceRange[1]);
    }
    
    // ソート
    switch (sortBy) {
      case 'price-low':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        products.sort((a, b) => b.rating - a.rating);
        break;
      case 'new':
        // 仮のソート（実際はcreatedAtで）
        products.sort((a, b) => Number(b.id) - Number(a.id));
        break;
      default:
        // 人気順（レビュー数で）
        products.sort((a, b) => b.reviews - a.reviews);
    }
    
    return products;
  }, [selectedCategory, sortBy, priceRange]);

  const currentCategory = categories.find(c => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {currentCategory?.name === 'すべて' ? '商品一覧' : currentCategory?.name}
          </h1>
          <p className="text-slate-500 mt-2">
            {filteredProducts.length}件の商品
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* サイドバー（デスクトップ） */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-28 bg-white rounded-xl p-6 border border-slate-100">
              <FilterSidebar
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
              />
            </div>
          </aside>

          {/* メインコンテンツ */}
          <div className="flex-1">
            {/* ツールバー */}
            <div className="flex items-center justify-between mb-6 bg-white rounded-xl p-4 border border-slate-100">
              {/* モバイルフィルター */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    フィルター
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle>フィルター</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterSidebar
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      priceRange={priceRange}
                      setPriceRange={setPriceRange}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <div className="hidden lg:block" />

              <div className="flex items-center gap-4">
                {/* ソート */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 表示切り替え */}
                <div className="hidden sm:flex items-center border rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === 'grid' ? "bg-slate-100" : "hover:bg-slate-50"
                    )}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === 'list' ? "bg-slate-100" : "hover:bg-slate-50"
                    )}
                  >
                    <LayoutList className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* アクティブフィルター */}
            {(selectedCategory !== 'all' || priceRange[0] > 0 || priceRange[1] > 0) && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-sm text-slate-500">絞り込み:</span>
                {selectedCategory !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    {currentCategory?.name}
                    <button onClick={() => setSelectedCategory('all')}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {(priceRange[0] > 0 || priceRange[1] > 0) && (
                  <Badge variant="secondary" className="gap-1">
                    ¥{priceRange[0].toLocaleString()} 〜 ¥{priceRange[1].toLocaleString()}
                    <button onClick={() => setPriceRange([0, 0])}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {/* 商品グリッド */}
            {filteredProducts.length > 0 ? (
              <div className={cn(
                viewMode === 'grid'
                  ? "grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6"
                  : "flex flex-col gap-4"
              )}>
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} viewMode={viewMode} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-slate-500">該当する商品が見つかりませんでした</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setSelectedCategory('all');
                    setPriceRange([0, 0]);
                  }}
                  className="mt-2"
                >
                  フィルターをクリア
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


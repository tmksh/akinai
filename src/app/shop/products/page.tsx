'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// モックデータ
const allProducts = [
  { id: '1', name: 'オーガニックコットンTシャツ', variant: 'ホワイト / M', price: 4500, originalPrice: 5500, category: 'apparel', image: 'https://picsum.photos/seed/tshirt1/600/800', badge: 'SALE' },
  { id: '2', name: 'リネンワイドパンツ', variant: 'ベージュ / M', price: 8900, category: 'apparel', image: 'https://picsum.photos/seed/pants1/600/800', badge: 'NEW' },
  { id: '3', name: 'ハンドメイドレザーバッグ', variant: 'ブラウン', price: 24800, category: 'accessories', image: 'https://picsum.photos/seed/bag1/600/800' },
  { id: '4', name: 'シルクスカーフ', variant: 'アイボリー', price: 12000, category: 'accessories', image: 'https://picsum.photos/seed/scarf1/600/800' },
  { id: '5', name: 'ウールニットカーディガン', variant: 'グレー / M', price: 15800, category: 'apparel', image: 'https://picsum.photos/seed/cardigan/600/800', badge: 'NEW' },
  { id: '6', name: 'キャンバストートバッグ', variant: 'ナチュラル', price: 6800, category: 'accessories', image: 'https://picsum.photos/seed/tote/600/800' },
  { id: '7', name: 'シルバーイヤリング', variant: 'シルバー', price: 4200, category: 'accessories', image: 'https://picsum.photos/seed/earring/600/800' },
  { id: '8', name: 'オーガニックソープセット', variant: '3個入り', price: 3500, category: 'home', image: 'https://picsum.photos/seed/soap/600/800' },
  { id: '9', name: 'リネンエプロン', variant: 'チャコール', price: 5900, category: 'home', image: 'https://picsum.photos/seed/apron/600/800' },
  { id: '10', name: 'ハンドメイドキャンドル', variant: 'ラベンダー', price: 2800, category: 'home', image: 'https://picsum.photos/seed/candle/600/800' },
  { id: '11', name: 'オーガニックコットンソックス', variant: '3足セット', price: 1800, category: 'apparel', image: 'https://picsum.photos/seed/socks/600/800' },
  { id: '12', name: 'ビンテージウォッチ', variant: 'ブラック', price: 38000, category: 'accessories', image: 'https://picsum.photos/seed/watch/600/800' },
];

const categories = [
  { id: 'all', name: 'All', nameJa: 'すべて' },
  { id: 'apparel', name: 'Apparel', nameJa: 'アパレル' },
  { id: 'accessories', name: 'Accessories', nameJa: 'アクセサリー' },
  { id: 'home', name: 'Home', nameJa: 'ホームグッズ' },
];

const sortOptions = [
  { value: 'popular', label: '人気順' },
  { value: 'new', label: '新着順' },
  { value: 'price-low', label: '価格：安い順' },
  { value: 'price-high', label: '価格：高い順' },
];

function ProductCard({ product }: { product: typeof allProducts[0] }) {
  return (
    <Link href={`/shop/products/${product.id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#f5f0eb] mb-4">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        {product.badge && (
          <span className={cn(
            "absolute top-4 left-4 text-[10px] tracking-[0.15em] px-3 py-1",
            product.badge === 'SALE' 
              ? "bg-slate-800 text-white" 
              : "bg-white text-slate-800"
          )}>
            {product.badge}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm text-slate-800 group-hover:text-amber-700 transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-slate-400">{product.variant}</p>
        <div className="flex items-center gap-3 pt-1">
          <span className="text-sm text-slate-800">
            ¥ {product.price.toLocaleString()}
          </span>
          {product.originalPrice && (
            <span className="text-xs text-slate-400 line-through">
              ¥ {product.originalPrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category') || 'all';
  
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState('popular');

  const filteredProducts = useMemo(() => {
    let products = [...allProducts];
    
    if (selectedCategory !== 'all') {
      products = products.filter(p => p.category === selectedCategory);
    }
    
    switch (sortBy) {
      case 'price-low':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'new':
        products.sort((a, b) => Number(b.id) - Number(a.id));
        break;
      default:
        break;
    }
    
    return products;
  }, [selectedCategory, sortBy]);

  const currentCategory = categories.find(c => c.id === selectedCategory);

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <div className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <p className="text-xs tracking-[0.3em] text-slate-400 uppercase mb-3">Products</p>
          <h1 className="text-3xl md:text-4xl font-light tracking-wide text-slate-800">
            {currentCategory?.nameJa === 'すべて' ? 'すべての製品' : currentCategory?.nameJa}
          </h1>
          <p className="text-sm text-slate-500 mt-4">
            {filteredProducts.length} items
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* フィルターバー */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-10 border-b border-slate-100">
          {/* カテゴリータブ */}
          <div className="flex items-center gap-1">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-4 py-2 text-sm transition-colors",
                  selectedCategory === category.id
                    ? "text-slate-800 border-b-2 border-slate-800"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>

          {/* ソート */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 tracking-wide">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm text-slate-600 bg-transparent border-0 focus:ring-0 cursor-pointer appearance-none pr-6"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0 center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 商品グリッド */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-14 pt-10">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <p className="text-slate-400 text-sm">該当する商品が見つかりませんでした</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="mt-4 text-sm text-slate-600 hover:text-slate-800 inline-flex items-center gap-1"
            >
              すべての商品を見る
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-400 text-sm tracking-wide">Loading...</div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}

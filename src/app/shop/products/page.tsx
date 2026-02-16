import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getShopProducts, getShopCategories, type ShopProduct } from '@/lib/actions/shop';

// 商品カード
function ProductCard({ product }: { product: ShopProduct }) {
  const hasDiscount = product.hasDiscount && product.variants[0]?.compareAtPrice;
  const price = product.minPrice;
  const comparePrice = product.variants[0]?.compareAtPrice;
  const imageUrl = product.images[0]?.url || 'https://picsum.photos/seed/default/600/800';

  // バリエーション情報
  const variantInfo = product.variants.length > 1 
    ? `${product.variants.length}種類` 
    : product.variants[0]?.name || '';

  return (
    <Link href={`/shop/products/${product.slug || product.id}`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#f5f0eb] mb-4">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        {product.featured && (
          <span className="absolute top-4 left-4 text-[10px] tracking-[0.15em] px-3 py-1 bg-white text-slate-800">
            FEATURED
          </span>
        )}
        {hasDiscount && (
          <span className="absolute top-4 left-4 text-[10px] tracking-[0.15em] px-3 py-1 bg-slate-800 text-white">
            SALE
          </span>
        )}
        {product.totalStock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-medium">SOLD OUT</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm text-slate-800 group-hover:text-amber-700 transition-colors">
          {product.name}
        </h3>
        {variantInfo && (
          <p className="text-xs text-slate-400">{variantInfo}</p>
        )}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-sm text-slate-800">
            ¥ {price.toLocaleString()}
            {product.minPrice !== product.maxPrice && ` 〜`}
          </span>
          {hasDiscount && comparePrice && (
            <span className="text-xs text-slate-400 line-through">
              ¥ {comparePrice.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// 商品リストコンポーネント
async function ProductList({ 
  categorySlug, 
  sortBy 
}: { 
  categorySlug: string; 
  sortBy: string;
}) {
  const { data: products, error } = await getShopProducts({
    categorySlug: categorySlug !== 'all' ? categorySlug : undefined,
    sortBy: sortBy as 'popular' | 'new' | 'price-low' | 'price-high',
  });

  if (error || !products) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-400 text-sm">商品の取得に失敗しました</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-24">
        <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-400 text-sm">該当する商品が見つかりませんでした</p>
        <Link
          href="/shop/products"
          className="mt-4 text-sm text-slate-600 hover:text-slate-800 inline-flex items-center gap-1"
        >
          すべての商品を見る
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-10 md:gap-x-6 md:gap-y-14 pt-8 sm:pt-10">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// カテゴリタブ（Server Component）
async function CategoryTabs({ currentCategory }: { currentCategory: string }) {
  const { data: categories } = await getShopCategories();
  
  const allCategories = [
    { id: 'all', name: 'All', slug: 'all' },
    ...(categories || []).map(c => ({ id: c.id, name: c.name, slug: c.slug })),
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
      {allCategories.map((category) => (
        <Link
          key={category.id}
          href={category.slug === 'all' ? '/shop/products' : `/shop/products?category=${category.slug}`}
          className={cn(
            "px-4 py-2 text-sm transition-colors whitespace-nowrap",
            currentCategory === category.slug
              ? "text-slate-800 border-b-2 border-slate-800"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}

// ソートセレクト（Client側で処理するためにaタグを使用）
function SortSelect({ currentSort, currentCategory }: { currentSort: string; currentCategory: string }) {
  const sortOptions = [
    { value: 'popular', label: '人気順' },
    { value: 'new', label: '新着順' },
    { value: 'price-low', label: '価格：安い順' },
    { value: 'price-high', label: '価格：高い順' },
  ];

  const baseUrl = currentCategory !== 'all' 
    ? `/shop/products?category=${currentCategory}` 
    : '/shop/products';

  return (
    <div className="flex items-center gap-4">
      <span className="text-xs text-slate-400 tracking-wide">Sort by</span>
      <div className="relative">
        <select
          defaultValue={currentSort}
          onChange={(e) => {
            const url = new URL(window.location.href);
            url.searchParams.set('sort', e.target.value);
            window.location.href = url.toString();
          }}
          className="text-sm text-slate-600 bg-transparent border-0 focus:ring-0 cursor-pointer appearance-none pr-6"
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, 
            backgroundPosition: 'right 0 center', 
            backgroundRepeat: 'no-repeat', 
            backgroundSize: '1.5em 1.5em' 
          }}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ローディングスケルトン
function ProductSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-10 md:gap-x-6 md:gap-y-14 pt-8 sm:pt-10">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] bg-slate-200 rounded mb-4" />
          <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const categorySlug = params.category || 'all';
  const sortBy = params.sort || 'popular';

  // カテゴリ名を取得
  const { data: categories } = await getShopCategories();
  const currentCategory = categories?.find(c => c.slug === categorySlug);
  const categoryName = categorySlug === 'all' ? 'すべての製品' : currentCategory?.name || 'すべての製品';

  // 商品数を取得
  const { data: products } = await getShopProducts({
    categorySlug: categorySlug !== 'all' ? categorySlug : undefined,
  });
  const productCount = products?.length || 0;

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <div className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-24">
          <p className="text-xs tracking-[0.3em] text-slate-400 uppercase mb-3">Products</p>
          <h1 className="text-3xl md:text-4xl font-light tracking-wide text-slate-800">
            {categoryName}
          </h1>
          <p className="text-sm text-slate-500 mt-4">
            {productCount} items
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* フィルターバー */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-10 border-b border-slate-100">
          {/* カテゴリータブ */}
          <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded w-64" />}>
            <CategoryTabs currentCategory={categorySlug} />
          </Suspense>

          {/* ソート */}
          <SortSelect currentSort={sortBy} currentCategory={categorySlug} />
        </div>

        {/* 商品グリッド */}
        <Suspense fallback={<ProductSkeleton />}>
          <ProductList categorySlug={categorySlug} sortBy={sortBy} />
        </Suspense>
      </div>
    </div>
  );
}

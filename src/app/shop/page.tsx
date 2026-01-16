'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

// モックデータ
const featuredProducts = [
  { id: '1', name: 'オーガニックコットンTシャツ', variant: 'ホワイト / M', price: 4500, image: 'https://picsum.photos/seed/prod1/600/600', hoverImage: 'https://picsum.photos/seed/prod1-2/600/600' },
  { id: '2', name: 'リネンワイドパンツ', variant: 'ベージュ / M', price: 8900, image: 'https://picsum.photos/seed/prod2/600/600', hoverImage: 'https://picsum.photos/seed/prod2-2/600/600' },
  { id: '3', name: 'ハンドメイドレザーバッグ', variant: 'ブラウン', price: 24800, image: 'https://picsum.photos/seed/prod3/600/600', hoverImage: 'https://picsum.photos/seed/prod3-2/600/600' },
  { id: '4', name: 'シルクスカーフ', variant: 'アイボリー', price: 12000, image: 'https://picsum.photos/seed/prod4/600/600', hoverImage: 'https://picsum.photos/seed/prod4-2/600/600' },
];

const popularProducts = [
  { id: '5', name: 'オーガニックソープセット', variant: '3個入り', price: 3500, image: 'https://picsum.photos/seed/pop1/600/600', hoverImage: 'https://picsum.photos/seed/pop1-2/600/600' },
  { id: '6', name: 'ウールニットカーディガン', variant: 'グレー / M', price: 15800, image: 'https://picsum.photos/seed/pop2/600/600', hoverImage: 'https://picsum.photos/seed/pop2-2/600/600' },
  { id: '7', name: 'キャンバストートバッグ', variant: 'ナチュラル', price: 6800, image: 'https://picsum.photos/seed/pop3/600/600', hoverImage: 'https://picsum.photos/seed/pop3-2/600/600' },
  { id: '8', name: 'リネンエプロン', variant: 'チャコール', price: 5900, image: 'https://picsum.photos/seed/pop4/600/600', hoverImage: 'https://picsum.photos/seed/pop4-2/600/600' },
];

const categories = [
  { name: 'すべての製品', image: 'https://picsum.photos/seed/cat-all/800/600', href: '/shop/products' },
  { name: 'アパレル', image: 'https://picsum.photos/seed/cat-apparel/800/600', href: '/shop/products?category=apparel' },
  { name: 'アクセサリー', image: 'https://picsum.photos/seed/cat-acc/800/600', href: '/shop/products?category=accessories' },
  { name: 'ホームグッズ', image: 'https://picsum.photos/seed/cat-home/800/600', href: '/shop/products?category=home' },
];

const newsItems = [
  { id: '1', date: '2024.03.01', title: '春の新作コレクション発売開始のお知らせ' },
  { id: '2', date: '2024.02.15', title: '送料無料キャンペーンのお知らせ' },
  { id: '3', date: '2024.02.01', title: '年末年始の営業時間について' },
];

const articles = [
  {
    id: '1',
    type: 'feature',
    title: '暮らしを彩る、\n春のインテリア',
    subtitle: '特集',
    description: '新生活に向けて、心地よい空間づくりのヒントをご紹介',
    image: 'https://picsum.photos/seed/article-feature1/800/1000',
    color: 'from-amber-100 to-orange-50',
    textColor: 'text-amber-900',
  },
  {
    id: '2',
    type: 'column',
    title: '職人の手仕事',
    subtitle: 'コラム',
    description: '伝統を受け継ぐ、ものづくりの現場から',
    image: 'https://picsum.photos/seed/article-craft/600/400',
    readTime: '5min',
  },
  {
    id: '3',
    type: 'guide',
    title: 'リネン製品のお手入れ',
    subtitle: 'ガイド',
    description: '長く愛用するための正しいケア方法',
    image: 'https://picsum.photos/seed/article-linen/600/400',
    readTime: '3min',
  },
  {
    id: '4',
    type: 'story',
    title: 'つくり手の想い',
    subtitle: 'ストーリー',
    description: '素材選びから完成まで、一つの製品ができるまで',
    image: 'https://picsum.photos/seed/article-story/600/400',
    readTime: '7min',
  },
];

// 商品カード
function ProductCard({ product }: { product: typeof featuredProducts[0] }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={`/shop/products/${product.id}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-square overflow-hidden bg-[#f5f0eb] mb-4">
        <Image
          src={isHovered && product.hoverImage ? product.hoverImage : product.image}
          alt={product.name}
          fill
          className="object-cover transition-all duration-700"
        />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm text-slate-800 leading-relaxed">
          {product.name} / {product.variant}
        </h3>
        <p className="text-sm text-slate-600">
          ¥{product.price.toLocaleString()}
        </p>
      </div>
    </Link>
  );
}

// ヒーローセクション（大きな商品イメージ）
function HeroSection() {
  return (
    <section className="relative">
      <div className="aspect-[16/7] relative overflow-hidden bg-gradient-to-br from-[#faf8f5] via-[#f8f4ef] to-[#f5efe8]">
        <Image
          src="https://picsum.photos/seed/hero-minimal/1600/700"
          alt="Hero"
          fill
          className="object-cover opacity-90"
          priority
        />
      </div>
    </section>
  );
}

// コンセプトセクション
function ConceptSection() {
  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 md:gap-20">
          <div>
            <h2 className="text-2xl font-light tracking-wide text-slate-800">Concept</h2>
          </div>
          <div className="space-y-6">
            <h3 className="text-xl md:text-2xl font-light text-slate-800 leading-relaxed">
              日々と共にあるすべてのものに
            </h3>
            <div className="text-sm md:text-base text-slate-600 leading-loose space-y-4">
              <p>
                商いストアは、日常の中にある小さな喜びを大切にするライフスタイルブランドです。
                わたしたちが目指すのは、使い込むほどに愛着が湧き、長く寄り添えるようなもの。
              </p>
              <p>
                自然素材や職人の技、丁寧なものづくりを通じて、
                使う人ができる限り長く、できる限り心地よく、
                できる限り自然でいられるものを提供します。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// 注目製品セクション
function FeaturedProductsSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-white to-[#faf8f5]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-xl font-light tracking-wide text-slate-800">注目製品</h2>
          <Link 
            href="/shop/products?sort=featured" 
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
          >
            すべて見る
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

// カテゴリーセクション
function CategorySection() {
  return (
    <section className="py-16 md:py-24 bg-[#faf8f5]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className="group relative aspect-[4/3] overflow-hidden"
            >
              <Image
                src={category.image}
                alt={category.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
              <div className="absolute inset-0 flex items-end justify-center pb-6">
                <span className="text-white text-sm md:text-base font-light tracking-wider">
                  {category.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// 人気製品セクション
function PopularProductsSection() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-xl font-light tracking-wide text-slate-800">人気製品</h2>
          <Link 
            href="/shop/products?sort=popular" 
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
          >
            すべて見る
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {popularProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}

// 法人・大口購入セクション
function BusinessSection() {
  const businessFeatures = [
    {
      number: '01',
      title: 'ロット購入',
      description: '10点以上のご注文で特別価格をご提供',
    },
    {
      number: '02',
      title: '卸売価格',
      description: '法人会員様限定の卸売価格でご提供',
    },
    {
      number: '03',
      title: 'カスタム見積',
      description: '最短即日でお見積り対応いたします',
    },
  ];

  return (
    <section className="py-20 md:py-32 bg-[#f5f0eb]">
      <div className="max-w-6xl mx-auto px-6">
        {/* セクションヘッダー */}
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.3em] text-slate-400 uppercase mb-3">For Business</p>
          <h2 className="text-2xl md:text-3xl font-light tracking-wide text-slate-800">
            法人・大口のお客様へ
          </h2>
        </div>

        {/* 特徴グリッド */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {businessFeatures.map((feature, index) => (
            <div 
              key={index}
              className="text-center group"
            >
              <p className="text-4xl font-light text-amber-600/40 mb-4 group-hover:text-amber-600 transition-colors">
                {feature.number}
              </p>
              <h3 className="text-lg font-medium text-slate-800 mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* コンテンツエリア */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* 画像 */}
          <div className="relative aspect-[4/3] overflow-hidden bg-white">
            <Image
              src="https://picsum.photos/seed/business-meeting/800/600"
              alt="法人向けサービス"
              fill
              className="object-cover"
            />
          </div>

          {/* テキスト */}
          <div className="space-y-6">
            <p className="text-slate-600 leading-loose text-sm md:text-base">
              商いストアでは、法人のお客様向けにロット購入・卸売価格でのご提供を行っております。
              OEM・オリジナル商品の企画開発、名入れなどのカスタマイズもご相談ください。
            </p>
            <p className="text-slate-600 leading-loose text-sm md:text-base">
              専任の担当者がお客様のご要望をお伺いし、最適なプランをご提案いたします。
            </p>
            
            {/* CTAリンク */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/shop/business"
                className="inline-block border border-slate-800 hover:bg-slate-800 hover:text-white px-8 py-3 text-sm text-slate-800 transition-colors text-center"
              >
                法人会員登録（無料）→
              </Link>
              <Link
                href="/shop/contact?type=quote"
                className="inline-block border border-slate-300 hover:border-slate-800 px-8 py-3 text-sm text-slate-600 hover:text-slate-800 transition-colors text-center"
              >
                お見積り依頼
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// 記事・特集セクション（マガジンスタイル）
function ArticlesSection() {
  return (
    <section className="py-20 md:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* セクションヘッダー */}
        <div className="flex items-end justify-between mb-12 md:mb-16">
          <div>
            <p className="text-xs tracking-[0.3em] text-slate-400 uppercase mb-2">Stories & Features</p>
            <h2 className="text-3xl md:text-4xl font-light text-slate-800">
              読みもの
            </h2>
          </div>
          <Link 
            href="/shop/news" 
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 group"
          >
            <span className="border-b border-transparent group-hover:border-slate-400 pb-0.5">すべて見る</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* マガジンスタイルレイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* メイン特集（大きいカード） */}
          <Link 
            href={`/shop/news/${articles[0].id}`}
            className="lg:col-span-5 lg:row-span-2 group"
          >
            <div className={cn(
              "relative h-full min-h-[500px] md:min-h-[600px] rounded-3xl overflow-hidden",
              "bg-gradient-to-br",
              articles[0].color
            )}>
              <Image
                src={articles[0].image}
                alt={articles[0].title}
                fill
                className="object-cover opacity-80 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              
              {/* コンテンツ */}
              <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-end">
                <span className="inline-block text-xs tracking-[0.2em] text-white/80 uppercase mb-3">
                  {articles[0].subtitle}
                </span>
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white leading-tight whitespace-pre-line mb-4">
                  {articles[0].title}
                </h3>
                <p className="text-sm text-white/80 max-w-xs">
                  {articles[0].description}
                </p>
                <div className="mt-6 flex items-center gap-2 text-white/60 group-hover:text-white transition-colors">
                  <span className="text-sm">Read more</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* サブ記事（小さいカード） */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            {articles.slice(1).map((article, index) => (
              <Link 
                key={article.id}
                href={`/shop/news/${article.id}`}
                className="group"
              >
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#f5f0eb] mb-4">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* 読了時間バッジ */}
                  {article.readTime && (
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-xs text-slate-600">{article.readTime}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <span className="text-xs tracking-[0.15em] text-amber-600 uppercase">
                    {article.subtitle}
                  </span>
                  <h3 className="text-lg font-medium text-slate-800 group-hover:text-amber-700 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {article.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ニュースセクション
function NewsSection() {
  return (
    <section className="py-16 md:py-24 bg-[#faf8f5]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-start justify-between mb-10">
          <div>
            <h2 className="text-xl font-light tracking-wide text-slate-800 mb-2">ニュース</h2>
            <Link 
              href="/shop/news" 
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
            >
              すべて見る
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="space-y-0">
          {newsItems.map((item, index) => (
            <Link
              key={item.id}
              href={`/shop/news/${item.id}`}
              className={cn(
                "flex items-start gap-6 md:gap-10 py-5 group hover:bg-white/50 -mx-4 px-4 transition-colors",
                index !== newsItems.length - 1 && "border-b border-slate-200"
              )}
            >
              <span className="text-sm text-slate-400 shrink-0 tabular-nums">{item.date}</span>
              <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Instagramセクション
function InstagramSection() {
  const images = [
    'https://picsum.photos/seed/insta1/400/400',
    'https://picsum.photos/seed/insta2/400/400',
    'https://picsum.photos/seed/insta3/400/400',
    'https://picsum.photos/seed/insta4/400/400',
    'https://picsum.photos/seed/insta5/400/400',
    'https://picsum.photos/seed/insta6/400/400',
  ];

  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-xl font-light tracking-wide text-slate-800">Instagram</h2>
          <a 
            href="https://instagram.com" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
          >
            すべて見る
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {images.map((image, index) => (
            <a
              key={index}
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="relative aspect-square overflow-hidden group"
            >
              <Image
                src={image}
                alt={`Instagram ${index + 1}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ブランドイメージセクション
function BrandImageSection() {
  return (
    <section className="relative h-[50vh] md:h-[60vh] overflow-hidden">
      <Image
        src="https://picsum.photos/seed/brand-image/1600/900"
        alt="Brand Image"
        fill
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
    </section>
  );
}

export default function StorePage() {
  return (
    <div className="bg-white">
      <HeroSection />
      <ConceptSection />
      <FeaturedProductsSection />
      <CategorySection />
      <ArticlesSection />
      <PopularProductsSection />
      <BusinessSection />
      <NewsSection />
      <InstagramSection />
      <BrandImageSection />
    </div>
  );
}

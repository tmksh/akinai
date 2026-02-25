'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useShopTheme } from '@/components/providers/shop-theme-provider';
import { ShopSectionId } from '@/types';
import { getShopProducts, getShopCategories, getShopContents, type ShopProduct, type ShopCategory, type ShopContent } from '@/lib/actions/shop';

// ----- 商品カード -----
function ProductCard({ product }: { product: ShopProduct }) {
  const [isHovered, setIsHovered] = useState(false);
  const image = product.images[0]?.url || 'https://picsum.photos/seed/default/600/600';
  const hoverImage = product.images[1]?.url || image;

  return (
    <Link
      href={`/shop/products/${product.slug || product.id}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative aspect-square overflow-hidden mb-4"
        style={{ backgroundColor: 'var(--shop-color-surface, #f5f0eb)' }}
      >
        <Image
          src={isHovered ? hoverImage : image}
          alt={product.name}
          fill
          className="object-cover transition-all duration-700"
        />
      </div>
      <div className="space-y-1">
        <h3
          className="text-sm leading-relaxed"
          style={{ color: 'var(--shop-color-text, #1e293b)' }}
        >
          {product.name}
        </h3>
        <p
          className="text-sm"
          style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
        >
          ¥{product.minPrice.toLocaleString()}
          {product.minPrice !== product.maxPrice && ` 〜 ¥${product.maxPrice.toLocaleString()}`}
        </p>
      </div>
    </Link>
  );
}

// ----- ヒーローセクション -----
function HeroSection() {
  return (
    <section className="relative">
      <div
        className="aspect-[16/7] relative overflow-hidden"
        style={{
          background: `linear-gradient(to bottom right, var(--shop-color-surface, #faf8f5), var(--shop-color-background, #ffffff))`
        }}
      >
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

// ----- コンセプトセクション -----
function ConceptSection() {
  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: 'var(--shop-color-background, #ffffff)' }}>
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-[200px_1fr] gap-12 md:gap-20">
          <div>
            <h2
              className="text-2xl font-light tracking-wide"
              style={{
                color: 'var(--shop-color-text, #1e293b)',
                fontFamily: 'var(--shop-font-heading)',
              }}
            >
              Concept
            </h2>
          </div>
          <div className="space-y-6">
            <h3
              className="text-xl md:text-2xl font-light leading-relaxed"
              style={{
                color: 'var(--shop-color-text, #1e293b)',
                fontFamily: 'var(--shop-font-heading)',
              }}
            >
              日々と共にあるすべてのものに
            </h3>
            <div
              className="text-sm md:text-base leading-loose space-y-4"
              style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
            >
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

// ----- 注目製品セクション -----
function FeaturedProductsSection() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShopProducts({ featured: true, limit: 4 }).then(({ data }) => {
      if (data && data.length > 0) {
        setProducts(data);
      } else {
        // featured商品がなければ新着順で4件
        getShopProducts({ sortBy: 'new', limit: 4 }).then(({ data: d }) => {
          setProducts(d || []);
        });
      }
      setLoading(false);
    });
  }, []);

  return (
    <section
      className="py-16 md:py-24"
      style={{
        background: `linear-gradient(to bottom, var(--shop-color-background, #ffffff), var(--shop-color-surface, #faf8f5))`
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <h2
            className="text-xl font-light tracking-wide"
            style={{
              color: 'var(--shop-color-text, #1e293b)',
              fontFamily: 'var(--shop-font-heading)',
            }}
          >
            注目製品
          </h2>
          <Link
            href="/shop/products?sort=featured"
            className="text-sm transition-colors flex items-center gap-1 hover:opacity-70"
            style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
          >
            すべて見る <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square bg-slate-100 animate-pulse rounded" />
                <div className="h-3 bg-slate-100 animate-pulse rounded w-3/4" />
                <div className="h-3 bg-slate-100 animate-pulse rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ----- カテゴリーセクション -----
function CategorySection() {
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShopCategories().then(({ data }) => {
      setCategories(data || []);
      setLoading(false);
    });
  }, []);

  const displayCategories = [
    { name: 'すべての製品', image: 'https://picsum.photos/seed/cat-all/800/600', href: '/shop/products' },
    ...categories.slice(0, 3).map(cat => ({
      name: cat.name,
      image: cat.image || `https://picsum.photos/seed/cat-${cat.slug}/800/600`,
      href: `/shop/products?category=${cat.slug}`,
    })),
  ].slice(0, 4);

  if (loading) return null;

  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: 'var(--shop-color-surface, #faf8f5)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayCategories.map((category) => (
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

// ----- 人気製品セクション -----
function PopularProductsSection() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShopProducts({ sortBy: 'popular', limit: 4 }).then(({ data }) => {
      setProducts(data || []);
      setLoading(false);
    });
  }, []);

  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: 'var(--shop-color-background, #ffffff)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <h2
            className="text-xl font-light tracking-wide"
            style={{
              color: 'var(--shop-color-text, #1e293b)',
              fontFamily: 'var(--shop-font-heading)',
            }}
          >
            人気製品
          </h2>
          <Link
            href="/shop/products?sort=popular"
            className="text-sm transition-colors flex items-center gap-1 hover:opacity-70"
            style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
          >
            すべて見る <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square bg-slate-100 animate-pulse rounded" />
                <div className="h-3 bg-slate-100 animate-pulse rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ----- 法人・大口購入セクション -----
function BusinessSection() {
  const businessFeatures = [
    { number: '01', title: 'ロット購入', description: '10点以上のご注文で特別価格をご提供' },
    { number: '02', title: '卸売価格', description: '法人会員様限定の卸売価格でご提供' },
    { number: '03', title: 'カスタム見積', description: '最短即日でお見積り対応いたします' },
  ];

  return (
    <section className="py-20 md:py-32" style={{ backgroundColor: 'var(--shop-color-surface, #f5f0eb)' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p
            className="text-xs tracking-[0.3em] uppercase mb-3"
            style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
          >
            For Business
          </p>
          <h2
            className="text-2xl md:text-3xl font-light tracking-wide"
            style={{
              color: 'var(--shop-color-text, #1e293b)',
              fontFamily: 'var(--shop-font-heading)',
            }}
          >
            法人・大口のお客様へ
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {businessFeatures.map((feature, index) => (
            <div key={index} className="text-center group">
              <p
                className="text-4xl font-light mb-4 transition-colors"
                style={{ color: 'var(--shop-color-primary, #f59e0b)', opacity: 0.4 }}
              >
                {feature.number}
              </p>
              <h3
                className="text-lg font-medium mb-2"
                style={{ color: 'var(--shop-color-text, #1e293b)' }}
              >
                {feature.title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-[4/3] overflow-hidden" style={{ backgroundColor: 'var(--shop-color-background, #ffffff)' }}>
            <Image
              src="https://picsum.photos/seed/business-meeting/800/600"
              alt="法人向けサービス"
              fill
              className="object-cover"
            />
          </div>

          <div className="space-y-6">
            <p
              className="leading-loose text-sm md:text-base"
              style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
            >
              商いストアでは、法人のお客様向けにロット購入・卸売価格でのご提供を行っております。
              OEM・オリジナル商品の企画開発、名入れなどのカスタマイズもご相談ください。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/shop/business"
                className="inline-block border px-8 py-3 text-sm text-center transition-colors hover:opacity-80"
                style={{
                  borderColor: 'var(--shop-color-text, #1e293b)',
                  color: 'var(--shop-color-text, #1e293b)',
                }}
              >
                法人会員登録（無料）→
              </Link>
              <Link
                href="/shop/contact?type=quote"
                className="inline-block border px-8 py-3 text-sm text-center transition-colors hover:opacity-80"
                style={{
                  borderColor: 'var(--shop-color-border, #e2e8f0)',
                  color: 'var(--shop-color-text-muted, #64748b)',
                }}
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

// ----- 記事・特集セクション -----
function ArticlesSection() {
  const [articles, setArticles] = useState<ShopContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShopContents({ limit: 4 }).then(({ data }) => {
      setArticles(data || []);
      setLoading(false);
    });
  }, []);

  if (loading || articles.length === 0) return null;

  const mainArticle = articles[0];
  const subArticles = articles.slice(1, 4);

  return (
    <section className="py-20 md:py-32 overflow-hidden" style={{ backgroundColor: 'var(--shop-color-background, #ffffff)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-end justify-between mb-12 md:mb-16">
          <div>
            <p
              className="text-xs tracking-[0.3em] uppercase mb-2"
              style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
            >
              Stories & Features
            </p>
            <h2
              className="text-3xl md:text-4xl font-light"
              style={{
                color: 'var(--shop-color-text, #1e293b)',
                fontFamily: 'var(--shop-font-heading)',
              }}
            >
              読みもの
            </h2>
          </div>
          <Link
            href="/shop/news"
            className="text-sm transition-colors flex items-center gap-2 group hover:opacity-70"
            style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
          >
            <span className="border-b border-transparent group-hover:border-current pb-0.5">すべて見る</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          {/* メイン記事 */}
          <Link href={`/shop/news/${mainArticle.slug || mainArticle.id}`} className="lg:col-span-5 lg:row-span-2 group">
            <div className="relative h-full min-h-[500px] md:min-h-[600px] rounded-3xl overflow-hidden bg-gradient-to-br from-amber-100 to-orange-50">
              {mainArticle.featuredImage && (
                <Image
                  src={mainArticle.featuredImage}
                  alt={mainArticle.title}
                  fill
                  className="object-cover opacity-80 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute inset-0 p-8 md:p-10 flex flex-col justify-end">
                <span className="inline-block text-xs tracking-[0.2em] text-white/80 uppercase mb-3">
                  {mainArticle.type}
                </span>
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-light text-white leading-tight mb-4">
                  {mainArticle.title}
                </h3>
                {mainArticle.excerpt && (
                  <p className="text-sm text-white/80 max-w-xs line-clamp-2">{mainArticle.excerpt}</p>
                )}
                <div className="mt-6 flex items-center gap-2 text-white/60 group-hover:text-white transition-colors">
                  <span className="text-sm">Read more</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* サブ記事 */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
            {subArticles.map((article) => (
              <Link key={article.id} href={`/shop/news/${article.slug || article.id}`} className="group">
                <div
                  className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4"
                  style={{ backgroundColor: 'var(--shop-color-surface, #f5f0eb)' }}
                >
                  {article.featuredImage ? (
                    <Image
                      src={article.featuredImage}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100" />
                  )}
                </div>
                <div className="space-y-2">
                  <span
                    className="text-xs tracking-[0.15em] uppercase"
                    style={{ color: 'var(--shop-color-primary, #f59e0b)' }}
                  >
                    {article.type}
                  </span>
                  <h3
                    className="text-lg font-medium transition-colors group-hover:opacity-70"
                    style={{ color: 'var(--shop-color-text, #1e293b)' }}
                  >
                    {article.title}
                  </h3>
                  {article.excerpt && (
                    <p
                      className="text-sm line-clamp-2"
                      style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
                    >
                      {article.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ----- ニュースセクション -----
function NewsSection() {
  const [newsItems, setNewsItems] = useState<ShopContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getShopContents({ limit: 5 }).then(({ data }) => {
      setNewsItems(data || []);
      setLoading(false);
    });
  }, []);

  if (loading || newsItems.length === 0) return null;

  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: 'var(--shop-color-surface, #faf8f5)' }}>
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-start justify-between mb-10">
          <h2
            className="text-xl font-light tracking-wide mb-2"
            style={{
              color: 'var(--shop-color-text, #1e293b)',
              fontFamily: 'var(--shop-font-heading)',
            }}
          >
            ニュース
          </h2>
          <Link
            href="/shop/news"
            className="text-sm transition-colors flex items-center gap-1 hover:opacity-70"
            style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
          >
            すべて見る <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-0">
          {newsItems.map((item, index) => (
            <Link
              key={item.id}
              href={`/shop/news/${item.slug || item.id}`}
              className={cn(
                "flex items-start gap-6 md:gap-10 py-5 group transition-colors -mx-4 px-4",
                index !== newsItems.length - 1 && "border-b"
              )}
              style={{ borderColor: 'var(--shop-color-border, #e2e8f0)' }}
            >
              <span
                className="text-sm shrink-0 tabular-nums"
                style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
              >
                {item.publishedAt
                  ? new Date(item.publishedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')
                  : new Date(item.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
              </span>
              <span
                className="text-sm transition-colors group-hover:opacity-70"
                style={{ color: 'var(--shop-color-text, #1e293b)' }}
              >
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ----- Instagramセクション -----
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
    <section className="py-16 md:py-24" style={{ backgroundColor: 'var(--shop-color-background, #ffffff)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between mb-10">
          <h2
            className="text-xl font-light tracking-wide"
            style={{
              color: 'var(--shop-color-text, #1e293b)',
              fontFamily: 'var(--shop-font-heading)',
            }}
          >
            Instagram
          </h2>
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm transition-colors flex items-center gap-1 hover:opacity-70"
            style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
          >
            すべて見る <ArrowRight className="h-4 w-4" />
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

// ----- ブランドイメージセクション -----
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

// ----- セクションマップ -----
const sectionComponents: Record<ShopSectionId, React.FC> = {
  hero: HeroSection,
  concept: ConceptSection,
  featured: FeaturedProductsSection,
  category: CategorySection,
  articles: ArticlesSection,
  popular: PopularProductsSection,
  business: BusinessSection,
  news: NewsSection,
  instagram: InstagramSection,
  brand: BrandImageSection,
};

export default function StorePage() {
  const { theme } = useShopTheme();

  const enabledSections = theme.sections
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div style={{ backgroundColor: 'var(--shop-color-background, #ffffff)' }}>
      {enabledSections.map((section) => {
        const SectionComponent = sectionComponents[section.id];
        return SectionComponent ? <SectionComponent key={section.id} /> : null;
      })}
    </div>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getShopContents, type ShopContent } from '@/lib/actions/shop';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function NewsPage() {
  const [articles, setArticles] = useState<ShopContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getShopContents({ limit: 50 }).then(({ data }) => {
      setArticles(data || []);
      setLoading(false);
    });
  }, []);

  // 動的にカテゴリ（タイプ）一覧を生成
  const categories = useMemo(() => {
    const types = [...new Set(articles.map(a => a.type).filter(Boolean))];
    return ['すべて', ...types];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesCategory = selectedCategory === 'すべて' || article.type === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (article.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [articles, selectedCategory, searchQuery]);

  const featuredArticles = articles.slice(0, 2);

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <section className="bg-gradient-to-br from-sky-50 via-sky-50 to-sky-100 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
            ニュース & コラム
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            新作情報、お役立ちガイド、スタッフからの最新情報をお届けします。
          </p>
        </div>
      </section>

      {/* 注目記事 */}
      {!loading && featuredArticles.length > 0 && (
        <section className="py-12 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xl font-bold text-slate-900 mb-6">注目の記事</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/shop/news/${article.slug || article.id}`}
                  className="group relative rounded-2xl overflow-hidden aspect-[16/9]"
                >
                  {article.featuredImage ? (
                    <Image
                      src={article.featuredImage}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-100 to-sky-100" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <Badge className="mb-3 bg-sky-500">{article.type}</Badge>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2 group-hover:text-sky-200 transition-colors">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-white/70">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(article.publishedAt || article.createdAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* フィルターと記事一覧 */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* フィルター */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    selectedCategory === category
                      ? "bg-sky-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="記事を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* ローディング */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-slate-100">
                  <div className="aspect-[16/10] bg-slate-100 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-slate-100 animate-pulse rounded w-3/4" />
                    <div className="h-3 bg-slate-100 animate-pulse rounded w-full" />
                    <div className="h-3 bg-slate-100 animate-pulse rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 記事一覧 */}
          {!loading && filteredArticles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/shop/news/${article.slug || article.id}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-sky-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-50">
                    {article.featuredImage ? (
                      <Image
                        src={article.featuredImage}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-sky-50 to-sky-50 flex items-center justify-center">
                        <span className="text-4xl opacity-20">📄</span>
                      </div>
                    )}
                    <Badge className="absolute top-3 left-3 bg-white/90 text-slate-700 hover:bg-white">
                      {article.type}
                    </Badge>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-sky-500 transition-colors line-clamp-2 mb-2">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                        {article.excerpt}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(article.publishedAt || article.createdAt)}
                      </span>
                      <span className="flex items-center gap-1 text-sky-500">
                        続きを読む <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && filteredArticles.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-500 mb-4">
                {articles.length === 0
                  ? 'まだ記事が公開されていません'
                  : '該当する記事が見つかりませんでした'}
              </p>
              {articles.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => { setSelectedCategory('すべて'); setSearchQuery(''); }}
                >
                  フィルターをリセット
                </Button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

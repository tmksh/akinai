'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// モック記事データ
const allArticles = [
  {
    id: '1',
    title: '春の新作コレクションのお知らせ',
    excerpt: '待望の春の新作コレクションが入荷しました。今シーズンのトレンドを取り入れた、軽やかで華やかなアイテムをご用意しております。ぜひ店頭またはオンラインショップでご覧ください。',
    image: 'https://picsum.photos/seed/spring/800/500',
    category: 'お知らせ',
    date: '2024-03-01',
    readTime: 3,
    featured: true,
  },
  {
    id: '2',
    title: 'サステナブルファッションへの取り組み',
    excerpt: '当店では環境に配慮したサステナブルファッションを推進しています。オーガニック素材の使用、フェアトレード認証工場での生産、リサイクル素材の活用など、様々な取り組みを行っています。',
    image: 'https://picsum.photos/seed/sustainable/800/500',
    category: 'コラム',
    date: '2024-02-15',
    readTime: 5,
    featured: true,
  },
  {
    id: '3',
    title: 'お手入れガイド：コットン製品の正しい洗い方',
    excerpt: 'コットン製品を長く愛用いただくための正しいお手入れ方法をご紹介します。洗濯のポイントから保管方法まで、詳しく解説します。',
    image: 'https://picsum.photos/seed/care/800/500',
    category: 'ガイド',
    date: '2024-02-01',
    readTime: 4,
    featured: false,
  },
  {
    id: '4',
    title: '【特集】春のコーディネート提案',
    excerpt: 'スタイリストがおすすめする春のコーディネートをご紹介。今シーズンのトレンドアイテムを使った着こなしのポイントをお伝えします。',
    image: 'https://picsum.photos/seed/coordinate/800/500',
    category: '特集',
    date: '2024-01-25',
    readTime: 6,
    featured: false,
  },
  {
    id: '5',
    title: '年末年始の営業時間のお知らせ',
    excerpt: '年末年始の営業時間についてお知らせいたします。オンラインショップは通常通り営業しておりますが、発送作業は一部お休みをいただきます。',
    image: 'https://picsum.photos/seed/holiday/800/500',
    category: 'お知らせ',
    date: '2024-01-10',
    readTime: 2,
    featured: false,
  },
  {
    id: '6',
    title: '冬物セール開催中！最大50%OFF',
    excerpt: '冬物アイテムが最大50%OFFになるクリアランスセールを開催中です。人気アイテムは早い者勝ち。この機会をお見逃しなく！',
    image: 'https://picsum.photos/seed/sale/800/500',
    category: 'セール',
    date: '2024-01-05',
    readTime: 2,
    featured: false,
  },
  {
    id: '7',
    title: '職人インタビュー：レザーバッグの魅力',
    excerpt: '当店で人気のハンドメイドレザーバッグ。その製作を手がける職人さんにインタビューしました。こだわりの素材選びや製作工程について伺います。',
    image: 'https://picsum.photos/seed/craftsman/800/500',
    category: 'コラム',
    date: '2023-12-20',
    readTime: 8,
    featured: false,
  },
  {
    id: '8',
    title: 'ギフトラッピングサービスのご案内',
    excerpt: '大切な方への贈り物に、心を込めたギフトラッピングサービスをご用意しています。オプションの選び方や注文方法をご説明します。',
    image: 'https://picsum.photos/seed/gift/800/500',
    category: 'ガイド',
    date: '2023-12-15',
    readTime: 3,
    featured: false,
  },
];

const categories = ['すべて', 'お知らせ', 'コラム', 'ガイド', '特集', 'セール'];

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [searchQuery, setSearchQuery] = useState('');

  // フィルタリング
  const filteredArticles = allArticles.filter((article) => {
    const matchesCategory = selectedCategory === 'すべて' || article.category === selectedCategory;
    const matchesSearch = 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 特集記事（最新2件）
  const featuredArticles = allArticles.filter(a => a.featured).slice(0, 2);

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <section className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
            ニュース & コラム
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            新作情報、お役立ちガイド、スタッフおすすめのコーディネートなど、
            最新のお知らせをお届けします。
          </p>
        </div>
      </section>

      {/* 特集記事 */}
      <section className="py-12 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-xl font-bold text-slate-900 mb-6">注目の記事</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {featuredArticles.map((article, index) => (
              <Link
                key={article.id}
                href={`/shop/news/${article.id}`}
                className="group relative rounded-2xl overflow-hidden aspect-[16/9]"
              >
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <Badge className="mb-3 bg-orange-500">{article.category}</Badge>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2 group-hover:text-orange-200 transition-colors">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-white/70">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(article.date).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {article.readTime}分で読めます
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

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
                      ? "bg-orange-500 text-white"
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

          {/* 記事一覧 */}
          {filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article, index) => (
                <Link
                  key={article.id}
                  href={`/shop/news/${article.id}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-orange-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={article.image}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <Badge className="absolute top-3 left-3 bg-white/90 text-slate-700 hover:bg-white">
                      {article.category}
                    </Badge>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-orange-500 transition-colors line-clamp-2 mb-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                      {article.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(article.date).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {article.readTime}分
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-500 mb-4">該当する記事が見つかりませんでした</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCategory('すべて');
                  setSearchQuery('');
                }}
              >
                フィルターをリセット
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* メルマガ登録 */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            最新情報をメールでお届け
          </h2>
          <p className="text-slate-600 mb-8">
            新作入荷やセール情報、お役立ちコンテンツをいち早くお届けします。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <Input
              type="email"
              placeholder="メールアドレス"
              className="flex-1"
            />
            <Button className="bg-orange-500 hover:bg-orange-600">
              登録する
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}











'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Clock, ArrowLeft, ArrowRight, Share2, Facebook, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { use } from 'react';

// モック記事データ
const articles: Record<string, {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  date: string;
  readTime: number;
  author: {
    name: string;
    avatar: string;
    role: string;
  };
  tags: string[];
  relatedProducts?: {
    id: string;
    name: string;
    price: number;
    image: string;
  }[];
}> = {
  '1': {
    id: '1',
    title: '春の新作コレクションのお知らせ',
    excerpt: '待望の春の新作コレクションが入荷しました。今シーズンのトレンドを取り入れた、軽やかで華やかなアイテムをご用意しております。',
    content: `
      <p class="lead">待望の春の新作コレクションが入荷しました。今シーズンのトレンドを取り入れた、軽やかで華やかなアイテムをご用意しております。</p>
      
      <h2>今シーズンの注目アイテム</h2>
      <p>今シーズンは「ナチュラル＆サステナブル」をテーマに、オーガニック素材を中心としたラインナップをご用意しました。</p>
      
      <ul>
        <li><strong>オーガニックコットンTシャツ</strong> - 新色のラベンダーとミントグリーンが登場</li>
        <li><strong>リネンワイドパンツ</strong> - 春らしいペールトーンの3色展開</li>
        <li><strong>フラワープリントワンピース</strong> - オリジナルデザインの花柄が人気</li>
      </ul>
      
      <h2>素材へのこだわり</h2>
      <p>当店では、環境に配慮したサステナブルな素材選びを大切にしています。今回の春コレクションでも、GOTS認証オーガニックコットン、ヨーロッパ産の上質なリネンなど、厳選した素材のみを使用しています。</p>
      
      <blockquote>
        <p>「素材の良さは、着心地に直結します。一度袖を通していただければ、その違いを実感していただけるはずです。」</p>
        <cite>- 商品企画担当 佐藤</cite>
      </blockquote>
      
      <h2>店頭・オンラインでお待ちしています</h2>
      <p>新作アイテムは、店頭およびオンラインショップにてお求めいただけます。数量限定のアイテムもございますので、気になる商品はお早めにチェックしてください。</p>
      
      <p>また、3月中にお買い上げいただいたお客様には、春のノベルティとしてオリジナルサシェをプレゼント。ぜひこの機会にご来店ください。</p>
    `,
    image: 'https://picsum.photos/seed/spring/1200/600',
    category: 'お知らせ',
    date: '2024-03-01',
    readTime: 3,
    author: {
      name: '山田 太郎',
      avatar: 'https://picsum.photos/seed/avatar1/100/100',
      role: 'スタッフ',
    },
    tags: ['新作', '春コレクション', 'オーガニック'],
    relatedProducts: [
      { id: '1', name: 'オーガニックコットンTシャツ', price: 4500, image: 'https://picsum.photos/seed/tshirt1/400/400' },
      { id: '2', name: 'リネンワイドパンツ', price: 8900, image: 'https://picsum.photos/seed/pants1/400/400' },
    ],
  },
  '2': {
    id: '2',
    title: 'サステナブルファッションへの取り組み',
    excerpt: '当店では環境に配慮したサステナブルファッションを推進しています。',
    content: `
      <p class="lead">サステナブルファッションとは、環境や社会に配慮した持続可能なファッションのことです。当店では、この考え方を大切に、様々な取り組みを行っています。</p>
      
      <h2>私たちの取り組み</h2>
      
      <h3>1. オーガニック素材の使用</h3>
      <p>農薬や化学肥料を使わずに栽培されたオーガニックコットンを積極的に採用しています。肌にも環境にも優しい素材です。</p>
      
      <h3>2. フェアトレード認証工場での生産</h3>
      <p>労働者の権利を守り、適正な賃金を支払う工場でのみ生産を行っています。商品の品質だけでなく、作る人の幸せも大切にしています。</p>
      
      <h3>3. リサイクル素材の活用</h3>
      <p>ペットボトルから作られた再生ポリエステルなど、リサイクル素材を使った商品も展開しています。</p>
      
      <h3>4. エコパッケージの採用</h3>
      <p>商品のお届けには、リサイクル可能な梱包材を使用。プラスチックの使用を最小限に抑えています。</p>
      
      <h2>お客様にできること</h2>
      <p>サステナブルファッションは、お客様一人ひとりの選択から始まります。長く愛用できる品質の良いものを選ぶこと、それがサステナブルな暮らしの第一歩です。</p>
    `,
    image: 'https://picsum.photos/seed/sustainable/1200/600',
    category: 'コラム',
    date: '2024-02-15',
    readTime: 5,
    author: {
      name: '佐藤 花子',
      avatar: 'https://picsum.photos/seed/avatar2/100/100',
      role: 'バイヤー',
    },
    tags: ['サステナブル', '環境', 'エシカル', 'オーガニック'],
  },
  '3': {
    id: '3',
    title: 'お手入れガイド：コットン製品の正しい洗い方',
    excerpt: 'コットン製品を長く愛用いただくための正しいお手入れ方法をご紹介。',
    content: `
      <p class="lead">お気に入りのコットン製品を長く愛用いただくために、正しいお手入れ方法をマスターしましょう。</p>
      
      <h2>洗濯前の準備</h2>
      <ul>
        <li>洗濯表示を必ず確認する</li>
        <li>裏返して洗濯ネットに入れる</li>
        <li>色の濃いものは分けて洗う</li>
      </ul>
      
      <h2>洗濯のポイント</h2>
      <ol>
        <li><strong>水温</strong>: 30度以下のぬるま湯か水を使用</li>
        <li><strong>洗剤</strong>: 中性洗剤を適量使用</li>
        <li><strong>洗い方</strong>: 弱水流またはおしゃれ着洗いコース</li>
        <li><strong>脱水</strong>: 短時間で軽めに</li>
      </ol>
      
      <h2>乾燥のポイント</h2>
      <p>タンブラー乾燥は縮みの原因になるため避けてください。形を整えて、直射日光を避けて干すのがベストです。</p>
      
      <h2>保管のポイント</h2>
      <ul>
        <li>完全に乾いてから収納</li>
        <li>湿気の少ない場所で保管</li>
        <li>防虫剤を使用する</li>
      </ul>
    `,
    image: 'https://picsum.photos/seed/care/1200/600',
    category: 'ガイド',
    date: '2024-02-01',
    readTime: 4,
    author: {
      name: '山田 太郎',
      avatar: 'https://picsum.photos/seed/avatar1/100/100',
      role: 'スタッフ',
    },
    tags: ['お手入れ', 'ガイド', 'コットン', '洗濯'],
  },
};

// 関連記事
const relatedArticles = [
  {
    id: '2',
    title: 'サステナブルファッションへの取り組み',
    image: 'https://picsum.photos/seed/sustainable/400/300',
    category: 'コラム',
    date: '2024-02-15',
  },
  {
    id: '3',
    title: 'お手入れガイド：コットン製品の正しい洗い方',
    image: 'https://picsum.photos/seed/care/400/300',
    category: 'ガイド',
    date: '2024-02-01',
  },
];

export default function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const article = articles[id] || articles['1'];

  return (
    <div className="min-h-screen bg-white">
      {/* ヒーロー画像 */}
      <section className="relative h-[40vh] min-h-[300px] max-h-[500px]">
        <Image
          src={article.image}
          alt={article.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* パンくず */}
        <div className="absolute top-6 left-0 right-0">
          <div className="max-w-4xl mx-auto px-4">
            <nav className="flex items-center gap-2 text-sm text-white/80">
              <Link href="/shop" className="hover:text-white">ホーム</Link>
              <span>/</span>
              <Link href="/shop/news" className="hover:text-white">ニュース</Link>
              <span>/</span>
              <span className="text-white">{article.title}</span>
            </nav>
          </div>
        </div>
      </section>

      {/* 記事本文 */}
      <article className="max-w-4xl mx-auto px-4 -mt-24 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10">
          {/* ヘッダー */}
          <header className="mb-8">
            <Badge className="mb-4 bg-orange-500">{article.category}</Badge>
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4">
              {article.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
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
          </header>

          <Separator className="my-8" />

          {/* 本文 */}
          <div 
            className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-li:leading-relaxed prose-blockquote:border-l-orange-500 prose-blockquote:bg-orange-50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* タグ */}
          <div className="mt-12 pt-8 border-t border-slate-100">
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/shop/news?tag=${tag}`}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 text-sm rounded-full hover:bg-orange-100 hover:text-orange-600 transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>

          {/* シェアボタン */}
          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">この記事をシェア:</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-2">
                  <Twitter className="h-4 w-4" />
                  Twitter
                </Button>
                <Button size="sm" variant="outline" className="gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Button>
              </div>
            </div>
          </div>

          {/* 著者情報 */}
          <div className="mt-8 p-6 bg-slate-50 rounded-xl">
            <div className="flex items-center gap-4">
              <Image
                src={article.author.avatar}
                alt={article.author.name}
                width={60}
                height={60}
                className="rounded-full"
              />
              <div>
                <p className="font-bold text-slate-900">{article.author.name}</p>
                <p className="text-sm text-slate-500">{article.author.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 関連商品 */}
        {article.relatedProducts && article.relatedProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-slate-900 mb-6">関連商品</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {article.relatedProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/shop/products/${product.id}`}
                  className="group"
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 mb-3">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 group-hover:text-orange-500 transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    ¥{product.price.toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 関連記事 */}
        <section className="mt-12 mb-16">
          <h2 className="text-xl font-bold text-slate-900 mb-6">関連記事</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {relatedArticles
              .filter(a => a.id !== id)
              .slice(0, 2)
              .map((related) => (
                <Link
                  key={related.id}
                  href={`/shop/news/${related.id}`}
                  className="group flex gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={related.image}
                      alt={related.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2 text-xs">
                      {related.category}
                    </Badge>
                    <h3 className="font-medium text-slate-900 group-hover:text-orange-500 transition-colors line-clamp-2">
                      {related.title}
                    </h3>
                  </div>
                </Link>
              ))}
          </div>
        </section>

        {/* ナビゲーション */}
        <div className="flex justify-between items-center py-8 border-t border-slate-100 mb-16">
          <Link
            href="/shop/news"
            className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            記事一覧に戻る
          </Link>
        </div>
      </article>
    </div>
  );
}



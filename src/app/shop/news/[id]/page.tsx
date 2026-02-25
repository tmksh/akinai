'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Calendar, ArrowLeft, ArrowRight, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { getShopContent, getShopContents, type ShopContent } from '@/lib/actions/shop';
import { toast } from 'sonner';

type ArticleDetail = ShopContent & { blocks: unknown[] };

// ギャラリーブロックかどうかを判定（url プロパティを持つオブジェクトの配列）
function isGalleryBlocks(blocks: unknown[]): boolean {
  return blocks.length > 0 && typeof (blocks[0] as Record<string, unknown>).url === 'string';
}

function renderBlocks(blocks: unknown[]): string {
  if (!blocks || blocks.length === 0) return '';

  // ギャラリータイプ（GalleryItemBlock[]）
  if (isGalleryBlocks(blocks)) {
    const items = blocks as { id?: string; url: string; alt?: string; caption?: string; size?: string; order?: number }[];
    const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const gridItems = sorted
      .map(
        (item) => `
        <figure style="margin:0;">
          <img
            src="${item.url}"
            alt="${item.alt || ''}"
            style="width:100%;height:100%;object-fit:cover;display:block;"
          />
          ${item.caption ? `<figcaption style="text-align:center;font-size:0.75rem;color:#64748b;margin-top:4px;">${item.caption}</figcaption>` : ''}
          ${item.size ? `<p style="text-align:center;font-size:0.7rem;color:#94a3b8;margin-top:2px;">サイズ: ${item.size}</p>` : ''}
        </figure>`
      )
      .join('');
    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;">${gridItems}</div>`;
  }

  // 通常テキストブロック
  return blocks
    .map((block) => {
      const b = block as { type: string; content?: { text?: string; html?: string; src?: string; alt?: string; caption?: string; url?: string; title?: string; level?: number } };
      if (!b.content) return '';
      switch (b.type) {
        case 'text':
        case 'paragraph':
          return `<p>${b.content.text || b.content.html || ''}</p>`;
        case 'html':
          return b.content.html || '';
        case 'heading':
          return `<h${b.content.level || 2}>${b.content.text || ''}</h${b.content.level || 2}>`;
        case 'image':
          return b.content.src
            ? `<figure><img src="${b.content.src}" alt="${b.content.alt || ''}" />${b.content.caption ? `<figcaption>${b.content.caption}</figcaption>` : ''}</figure>`
            : '';
        case 'quote':
          return `<blockquote>${b.content.text || ''}</blockquote>`;
        case 'video':
          return b.content.url ? `<div class="video-embed"><a href="${b.content.url}" target="_blank">${b.content.title || b.content.url}</a></div>` : '';
        default:
          return '';
      }
    })
    .join('\n');
}

export default function NewsDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<ShopContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      getShopContent(id),
      getShopContents({ limit: 6 }),
    ]).then(([articleResult, relatedResult]) => {
      if (articleResult.data) {
        setArticle(articleResult.data);
      } else {
        setNotFound(true);
      }
      // 自分以外の記事を関連として表示
      const related = (relatedResult.data || []).filter(a => a.id !== id).slice(0, 2);
      setRelatedArticles(related);
      setLoading(false);
    });
  }, [id]);

  const handleShare = async () => {
    try {
      await navigator.share({
        title: article?.title || '',
        url: window.location.href,
      });
    } catch {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('URLをコピーしました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-[40vh] bg-slate-100 animate-pulse" />
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-4">
          <div className="h-8 bg-slate-100 animate-pulse rounded w-3/4" />
          <div className="h-4 bg-slate-100 animate-pulse rounded w-full" />
          <div className="h-4 bg-slate-100 animate-pulse rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center py-20">
        <p className="text-slate-500 mb-4">記事が見つかりません</p>
        <Link href="/shop/news">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            記事一覧に戻る
          </Button>
        </Link>
      </div>
    );
  }

  const htmlContent = renderBlocks(article.blocks);

  return (
    <div className="min-h-screen bg-white">
      {/* ヒーロー画像 */}
      <section className="relative h-[40vh] min-h-[300px] max-h-[500px]">
        {article.featuredImage ? (
          <Image
            src={article.featuredImage}
            alt={article.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* パンくず */}
        <div className="absolute top-6 left-0 right-0">
          <div className="max-w-4xl mx-auto px-4">
            <nav className="flex items-center gap-2 text-sm text-white/80">
              <Link href="/shop" className="hover:text-white">ホーム</Link>
              <span>/</span>
              <Link href="/shop/news" className="hover:text-white">ニュース</Link>
              <span>/</span>
              <span className="text-white line-clamp-1">{article.title}</span>
            </nav>
          </div>
        </div>
      </section>

      {/* 記事本文 */}
      <article className="max-w-4xl mx-auto px-4 -mt-24 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-10">
          {/* ヘッダー */}
          <header className="mb-8">
            <Badge className="mb-4 bg-orange-500">{article.type}</Badge>
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(article.publishedAt || article.createdAt).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </header>

          {/* 概要 */}
          {article.excerpt && (
            <p className="text-base text-slate-600 leading-relaxed mb-8 pb-8 border-b border-slate-100">
              {article.excerpt}
            </p>
          )}

          <Separator className="my-8" />

          {/* 本文 */}
          {htmlContent ? (
            <div
              className="prose prose-lg prose-slate max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-li:leading-relaxed prose-blockquote:border-l-orange-500 prose-blockquote:bg-orange-50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-a:text-orange-500 prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : (
            article.excerpt && (
              <p className="text-base text-slate-600 leading-relaxed">
                {article.excerpt}
              </p>
            )
          )}

          {/* シェアボタン */}
          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">この記事をシェア:</span>
              <Button size="sm" variant="outline" className="gap-2" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
                シェア
              </Button>
            </div>
          </div>
        </div>

        {/* 関連記事 */}
        {relatedArticles.length > 0 && (
          <section className="mt-12 mb-16">
            <h2 className="text-xl font-bold text-slate-900 mb-6">関連記事</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/shop/news/${related.slug || related.id}`}
                  className="group flex gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                    {related.featuredImage && (
                      <Image
                        src={related.featuredImage}
                        alt={related.title}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2 text-xs">
                      {related.type}
                    </Badge>
                    <h3 className="font-medium text-slate-900 group-hover:text-orange-500 transition-colors line-clamp-2">
                      {related.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(related.publishedAt || related.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ナビゲーション */}
        <div className="flex justify-between items-center py-8 border-t border-slate-100 mb-16">
          <Link
            href="/shop/news"
            className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            記事一覧に戻る
          </Link>
          <Link
            href="/shop/products"
            className="flex items-center gap-2 text-slate-500 hover:text-orange-500 transition-colors"
          >
            商品を見る
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </article>
    </div>
  );
}

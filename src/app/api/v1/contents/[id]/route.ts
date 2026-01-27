import { NextRequest } from 'next/server';
import { 
  validateApiKey, 
  apiError, 
  apiSuccess,
  handleOptions,
  corsHeaders,
} from '@/lib/api/auth';

// モックコンテンツデータ
const mockContents: Record<string, {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  categoryId: string;
  author: { name: string; avatar: string };
  tags: string[];
  status: string;
  seo: { title: string; description: string };
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}> = {
  'content-1': {
    id: 'content-1',
    title: '春の新作コレクションのお知らせ',
    slug: 'spring-collection-2024',
    excerpt: '待望の春の新作コレクションが入荷しました。今シーズンのトレンドを取り入れた...',
    content: `
      <h2>春の新作コレクション</h2>
      <p>待望の春の新作コレクションが入荷しました。今シーズンのトレンドを取り入れた、軽やかで華やかなアイテムをご用意しております。</p>
      <h3>注目アイテム</h3>
      <ul>
        <li>オーガニックコットンTシャツ - 新色追加</li>
        <li>リネンワイドパンツ - 春限定カラー</li>
        <li>フラワープリントワンピース - 新作</li>
      </ul>
      <p>ぜひ店頭またはオンラインショップでご覧ください。</p>
    `,
    featuredImage: 'https://picsum.photos/seed/spring/1200/600',
    categoryId: 'news',
    author: {
      name: '山田 太郎',
      avatar: 'https://picsum.photos/seed/avatar1/100/100',
    },
    tags: ['新作', '春コレクション', 'お知らせ'],
    status: 'published',
    seo: {
      title: '春の新作コレクションのお知らせ | サンプルストア',
      description: '待望の春の新作コレクションが入荷しました。今シーズンのトレンドアイテムをご紹介。',
    },
    publishedAt: '2024-03-01T09:00:00Z',
    createdAt: '2024-02-28T00:00:00Z',
    updatedAt: '2024-03-01T09:00:00Z',
  },
  'content-2': {
    id: 'content-2',
    title: 'サステナブルファッションへの取り組み',
    slug: 'sustainable-fashion',
    excerpt: '当店では環境に配慮したサステナブルファッションを推進しています...',
    content: `
      <h2>サステナブルファッションとは</h2>
      <p>サステナブルファッションとは、環境や社会に配慮した持続可能なファッションのことです。</p>
      <h3>私たちの取り組み</h3>
      <ul>
        <li>オーガニック素材の使用</li>
        <li>フェアトレード認証工場での生産</li>
        <li>リサイクル素材の活用</li>
        <li>エコパッケージの採用</li>
      </ul>
      <p>私たちは、ファッションを通じて社会に貢献することを目指しています。</p>
    `,
    featuredImage: 'https://picsum.photos/seed/sustainable/1200/600',
    categoryId: 'blog',
    author: {
      name: '佐藤 花子',
      avatar: 'https://picsum.photos/seed/avatar2/100/100',
    },
    tags: ['サステナブル', '環境', 'エシカル'],
    status: 'published',
    seo: {
      title: 'サステナブルファッションへの取り組み | サンプルストア',
      description: '当店の環境配慮への取り組みをご紹介。サステナブルファッションを推進しています。',
    },
    publishedAt: '2024-02-15T10:00:00Z',
    createdAt: '2024-02-10T00:00:00Z',
    updatedAt: '2024-02-15T10:00:00Z',
  },
  'content-3': {
    id: 'content-3',
    title: 'お手入れガイド: コットン製品の正しい洗い方',
    slug: 'cotton-care-guide',
    excerpt: 'コットン製品を長く愛用いただくための正しいお手入れ方法をご紹介...',
    content: `
      <h2>コットン製品のお手入れ方法</h2>
      <p>コットン製品を長く愛用いただくための正しいお手入れ方法をご紹介します。</p>
      <h3>洗濯のポイント</h3>
      <ol>
        <li>裏返してネットに入れる</li>
        <li>弱水流で洗う</li>
        <li>タンブラー乾燥は避ける</li>
        <li>形を整えて干す</li>
      </ol>
      <h3>保管のポイント</h3>
      <ul>
        <li>直射日光を避ける</li>
        <li>湿気の少ない場所で保管</li>
        <li>防虫剤を使用する</li>
      </ul>
    `,
    featuredImage: 'https://picsum.photos/seed/care/1200/600',
    categoryId: 'guide',
    author: {
      name: '山田 太郎',
      avatar: 'https://picsum.photos/seed/avatar1/100/100',
    },
    tags: ['お手入れ', 'ガイド', 'コットン'],
    status: 'published',
    seo: {
      title: 'コットン製品のお手入れガイド | サンプルストア',
      description: 'コットン製品を長く愛用するための正しい洗い方と保管方法をご紹介。',
    },
    publishedAt: '2024-02-01T09:00:00Z',
    createdAt: '2024-01-28T00:00:00Z',
    updatedAt: '2024-02-01T09:00:00Z',
  },
};

// GET /api/v1/contents/[id] - コンテンツ詳細
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // API認証
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status);
  }

  const { id } = await params;

  // コンテンツを検索（IDまたはslugで検索）
  let content = mockContents[id];
  
  // slugで検索
  if (!content) {
    content = Object.values(mockContents).find(c => c.slug === id) || null as typeof content;
  }

  if (!content) {
    return apiError('Content not found', 404);
  }

  // 非公開コンテンツは返さない
  if (content.status !== 'published') {
    return apiError('Content not found', 404);
  }

  // 公開用にデータを整形
  const publicContent = {
    id: content.id,
    title: content.title,
    slug: content.slug,
    excerpt: content.excerpt,
    content: content.content,
    featuredImage: content.featuredImage,
    categoryId: content.categoryId,
    author: content.author,
    tags: content.tags,
    seo: content.seo,
    publishedAt: content.publishedAt,
  };

  const response = apiSuccess(publicContent);
  
  // CORSヘッダーを追加
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// OPTIONS /api/v1/contents/[id] - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}












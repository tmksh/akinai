import { NextRequest } from 'next/server';
import { 
  validateApiKey, 
  apiError, 
  apiSuccessPaginated,
  handleOptions,
  corsHeaders,
} from '@/lib/api/auth';

// モックコンテンツデータ
const mockContents = [
  {
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
    publishedAt: '2024-03-01T09:00:00Z',
    createdAt: '2024-02-28T00:00:00Z',
    updatedAt: '2024-03-01T09:00:00Z',
  },
  {
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
    `,
    featuredImage: 'https://picsum.photos/seed/sustainable/1200/600',
    categoryId: 'blog',
    author: {
      name: '佐藤 花子',
      avatar: 'https://picsum.photos/seed/avatar2/100/100',
    },
    tags: ['サステナブル', '環境', 'エシカル'],
    status: 'published',
    publishedAt: '2024-02-15T10:00:00Z',
    createdAt: '2024-02-10T00:00:00Z',
    updatedAt: '2024-02-15T10:00:00Z',
  },
  {
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
    `,
    featuredImage: 'https://picsum.photos/seed/care/1200/600',
    categoryId: 'guide',
    author: {
      name: '山田 太郎',
      avatar: 'https://picsum.photos/seed/avatar1/100/100',
    },
    tags: ['お手入れ', 'ガイド', 'コットン'],
    status: 'published',
    publishedAt: '2024-02-01T09:00:00Z',
    createdAt: '2024-01-28T00:00:00Z',
    updatedAt: '2024-02-01T09:00:00Z',
  },
];

// GET /api/v1/contents - コンテンツ一覧
export async function GET(request: NextRequest) {
  // API認証
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status);
  }

  // クエリパラメータ
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const category = searchParams.get('category');
  const tag = searchParams.get('tag');
  const search = searchParams.get('search');

  // フィルタリング
  let filteredContents = mockContents.filter(c => c.status === 'published');

  // カテゴリーフィルター
  if (category) {
    filteredContents = filteredContents.filter(c => c.categoryId === category);
  }

  // タグフィルター
  if (tag) {
    filteredContents = filteredContents.filter(c => 
      c.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  }

  // 検索
  if (search) {
    const searchLower = search.toLowerCase();
    filteredContents = filteredContents.filter(c =>
      c.title.toLowerCase().includes(searchLower) ||
      c.excerpt.toLowerCase().includes(searchLower) ||
      c.tags.some(t => t.toLowerCase().includes(searchLower))
    );
  }

  // 公開日順にソート
  filteredContents.sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // ページネーション
  const total = filteredContents.length;
  const startIndex = (page - 1) * limit;
  const paginatedContents = filteredContents.slice(startIndex, startIndex + limit);

  // 公開用にデータを整形
  const publicContents = paginatedContents.map(c => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    excerpt: c.excerpt,
    featuredImage: c.featuredImage,
    categoryId: c.categoryId,
    author: c.author,
    tags: c.tags,
    publishedAt: c.publishedAt,
  }));

  const response = apiSuccessPaginated(publicContents, page, limit, total);
  
  // CORSヘッダーを追加
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// OPTIONS /api/v1/contents - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}






import { NextRequest } from 'next/server';
import { 
  validateApiKey, 
  apiError, 
  apiSuccessPaginated,
  handleOptions,
  corsHeaders,
} from '@/lib/api/auth';

// モック商品データ
const mockProducts = [
  {
    id: 'prod-1',
    name: 'オーガニックコットンTシャツ',
    slug: 'organic-cotton-tshirt',
    description: '環境に優しいオーガニックコットン100%使用。肌触りが良く、着心地抜群のTシャツです。',
    price: 4500,
    compareAtPrice: 5500,
    currency: 'JPY',
    images: [
      { id: 'img-1', url: 'https://picsum.photos/seed/tshirt1/800/800', alt: 'Tシャツ正面' },
      { id: 'img-2', url: 'https://picsum.photos/seed/tshirt1-2/800/800', alt: 'Tシャツ背面' },
    ],
    variants: [
      { id: 'var-1', name: 'S / ホワイト', sku: 'OCT-S-WH', price: 4500, stock: 10 },
      { id: 'var-2', name: 'M / ホワイト', sku: 'OCT-M-WH', price: 4500, stock: 15 },
      { id: 'var-3', name: 'L / ホワイト', sku: 'OCT-L-WH', price: 4500, stock: 8 },
      { id: 'var-4', name: 'S / ブラック', sku: 'OCT-S-BK', price: 4500, stock: 12 },
      { id: 'var-5', name: 'M / ブラック', sku: 'OCT-M-BK', price: 4500, stock: 20 },
      { id: 'var-6', name: 'L / ブラック', sku: 'OCT-L-BK', price: 4500, stock: 5 },
    ],
    options: [
      { name: 'サイズ', values: ['S', 'M', 'L'] },
      { name: 'カラー', values: ['ホワイト', 'ブラック'] },
    ],
    categoryIds: ['cat-apparel'],
    tags: ['オーガニック', 'コットン', 'Tシャツ'],
    status: 'published',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
  {
    id: 'prod-2',
    name: 'リネンワイドパンツ',
    slug: 'linen-wide-pants',
    description: '通気性抜群のリネン素材を使用したワイドパンツ。夏でも快適に過ごせる一枚。',
    price: 8900,
    compareAtPrice: null,
    currency: 'JPY',
    images: [
      { id: 'img-3', url: 'https://picsum.photos/seed/pants1/800/800', alt: 'パンツ正面' },
    ],
    variants: [
      { id: 'var-7', name: 'S', sku: 'LWP-S', price: 8900, stock: 8 },
      { id: 'var-8', name: 'M', sku: 'LWP-M', price: 8900, stock: 12 },
      { id: 'var-9', name: 'L', sku: 'LWP-L', price: 8900, stock: 6 },
    ],
    options: [
      { name: 'サイズ', values: ['S', 'M', 'L'] },
    ],
    categoryIds: ['cat-apparel'],
    tags: ['リネン', 'パンツ', '夏'],
    status: 'published',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z',
  },
  {
    id: 'prod-3',
    name: 'ハンドメイドレザーバッグ',
    slug: 'handmade-leather-bag',
    description: '職人が一つ一つ丁寧に仕上げたハンドメイドのレザーバッグ。',
    price: 24800,
    compareAtPrice: null,
    currency: 'JPY',
    images: [
      { id: 'img-4', url: 'https://picsum.photos/seed/bag1/800/800', alt: 'バッグ' },
    ],
    variants: [
      { id: 'var-10', name: 'ブラウン', sku: 'HLB-BR', price: 24800, stock: 5 },
      { id: 'var-11', name: 'ブラック', sku: 'HLB-BK', price: 24800, stock: 3 },
    ],
    options: [
      { name: 'カラー', values: ['ブラウン', 'ブラック'] },
    ],
    categoryIds: ['cat-accessories'],
    tags: ['レザー', 'バッグ', 'ハンドメイド'],
    status: 'published',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  {
    id: 'prod-4',
    name: 'オーガニックソープセット',
    slug: 'organic-soap-set',
    description: '天然素材100%のオーガニックソープ3個セット。敏感肌の方にもおすすめ。',
    price: 3500,
    compareAtPrice: null,
    currency: 'JPY',
    images: [
      { id: 'img-5', url: 'https://picsum.photos/seed/soap/800/800', alt: 'ソープセット' },
    ],
    variants: [
      { id: 'var-12', name: 'デフォルト', sku: 'OSS-01', price: 3500, stock: 30 },
    ],
    options: [],
    categoryIds: ['cat-home'],
    tags: ['オーガニック', 'ソープ', 'ギフト'],
    status: 'published',
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
  },
];

// GET /api/v1/products - 商品一覧
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
  const status = searchParams.get('status') || 'published';
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'createdAt';
  const order = searchParams.get('order') || 'desc';

  // フィルタリング
  let filteredProducts = [...mockProducts];

  // ステータスフィルター
  if (status !== 'all') {
    filteredProducts = filteredProducts.filter(p => p.status === status);
  }

  // カテゴリーフィルター
  if (category) {
    filteredProducts = filteredProducts.filter(p => 
      p.categoryIds.includes(category)
    );
  }

  // 検索
  if (search) {
    const searchLower = search.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  // ソート
  filteredProducts.sort((a, b) => {
    let aVal: string | number = a[sort as keyof typeof a] as string | number;
    let bVal: string | number = b[sort as keyof typeof b] as string | number;
    
    if (sort === 'price') {
      aVal = a.price;
      bVal = b.price;
    }
    
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  // ページネーション
  const total = filteredProducts.length;
  const startIndex = (page - 1) * limit;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + limit);

  // 公開用にデータを整形
  const publicProducts = paginatedProducts.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    currency: p.currency,
    images: p.images,
    variants: p.variants.map(v => ({
      id: v.id,
      name: v.name,
      price: v.price,
      available: v.stock > 0,
    })),
    options: p.options,
    tags: p.tags,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  const response = apiSuccessPaginated(publicProducts, page, limit, total);
  
  // CORSヘッダーを追加
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// OPTIONS /api/v1/products - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}





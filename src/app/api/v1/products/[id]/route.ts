import { NextRequest } from 'next/server';
import { 
  validateApiKey, 
  apiError, 
  apiSuccess,
  handleOptions,
  corsHeaders,
} from '@/lib/api/auth';

// モック商品データ（本来はDBから取得）
const mockProducts: Record<string, {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  images: { id: string; url: string; alt: string }[];
  variants: { id: string; name: string; sku: string; price: number; stock: number }[];
  options: { name: string; values: string[] }[];
  categoryIds: string[];
  tags: string[];
  status: string;
  seo: { title: string; description: string };
  createdAt: string;
  updatedAt: string;
}> = {
  'prod-1': {
    id: 'prod-1',
    name: 'オーガニックコットンTシャツ',
    slug: 'organic-cotton-tshirt',
    description: '環境に優しいオーガニックコットン100%使用。肌触りが良く、着心地抜群のTシャツです。\n\n【特徴】\n- GOTS認証オーガニックコットン100%\n- 柔らかな肌触り\n- 通気性に優れた素材\n- 日本製\n\n【お手入れ方法】\n洗濯機で洗えます。タンブラー乾燥は避けてください。',
    price: 4500,
    compareAtPrice: 5500,
    currency: 'JPY',
    images: [
      { id: 'img-1', url: 'https://picsum.photos/seed/tshirt1/800/800', alt: 'Tシャツ正面' },
      { id: 'img-2', url: 'https://picsum.photos/seed/tshirt1-2/800/800', alt: 'Tシャツ背面' },
      { id: 'img-3', url: 'https://picsum.photos/seed/tshirt1-3/800/800', alt: 'Tシャツ着用イメージ' },
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
    tags: ['オーガニック', 'コットン', 'Tシャツ', '新着'],
    status: 'published',
    seo: {
      title: 'オーガニックコットンTシャツ | サンプルストア',
      description: 'GOTS認証オーガニックコットン100%使用の肌に優しいTシャツ。環境にも配慮したサステナブルな一枚。',
    },
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
  },
  'prod-2': {
    id: 'prod-2',
    name: 'リネンワイドパンツ',
    slug: 'linen-wide-pants',
    description: '通気性抜群のリネン素材を使用したワイドパンツ。夏でも快適に過ごせる一枚。',
    price: 8900,
    compareAtPrice: null,
    currency: 'JPY',
    images: [
      { id: 'img-4', url: 'https://picsum.photos/seed/pants1/800/800', alt: 'パンツ正面' },
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
    seo: {
      title: 'リネンワイドパンツ | サンプルストア',
      description: '通気性抜群のリネン素材ワイドパンツ。夏でも涼しく快適に。',
    },
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-18T00:00:00Z',
  },
  'prod-3': {
    id: 'prod-3',
    name: 'ハンドメイドレザーバッグ',
    slug: 'handmade-leather-bag',
    description: '職人が一つ一つ丁寧に仕上げたハンドメイドのレザーバッグ。',
    price: 24800,
    compareAtPrice: null,
    currency: 'JPY',
    images: [
      { id: 'img-5', url: 'https://picsum.photos/seed/bag1/800/800', alt: 'バッグ' },
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
    seo: {
      title: 'ハンドメイドレザーバッグ | サンプルストア',
      description: '職人の技が光るハンドメイドレザーバッグ。',
    },
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
  'prod-4': {
    id: 'prod-4',
    name: 'オーガニックソープセット',
    slug: 'organic-soap-set',
    description: '天然素材100%のオーガニックソープ3個セット。敏感肌の方にもおすすめ。',
    price: 3500,
    compareAtPrice: null,
    currency: 'JPY',
    images: [
      { id: 'img-6', url: 'https://picsum.photos/seed/soap/800/800', alt: 'ソープセット' },
    ],
    variants: [
      { id: 'var-12', name: 'デフォルト', sku: 'OSS-01', price: 3500, stock: 30 },
    ],
    options: [],
    categoryIds: ['cat-home'],
    tags: ['オーガニック', 'ソープ', 'ギフト'],
    status: 'published',
    seo: {
      title: 'オーガニックソープセット | サンプルストア',
      description: '天然素材100%のオーガニックソープ。敏感肌にも安心。',
    },
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
  },
};

// GET /api/v1/products/[id] - 商品詳細
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

  // 商品を検索（IDまたはslugで検索）
  let product = mockProducts[id];
  
  // slugで検索
  if (!product) {
    product = Object.values(mockProducts).find(p => p.slug === id) || null as typeof product;
  }

  if (!product) {
    return apiError('Product not found', 404);
  }

  // 非公開商品は返さない
  if (product.status !== 'published') {
    return apiError('Product not found', 404);
  }

  // 公開用にデータを整形
  const publicProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    currency: product.currency,
    images: product.images,
    variants: product.variants.map(v => ({
      id: v.id,
      name: v.name,
      price: v.price,
      available: v.stock > 0,
    })),
    options: product.options,
    tags: product.tags,
    seo: product.seo,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };

  const response = apiSuccess(publicProduct);
  
  // CORSヘッダーを追加
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// OPTIONS /api/v1/products/[id] - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}


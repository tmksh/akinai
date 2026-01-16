import { NextRequest } from 'next/server';
import { 
  validateApiKey, 
  apiError, 
  apiSuccess,
  handleOptions,
  corsHeaders,
} from '@/lib/api/auth';

// カテゴリー型定義
interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  productCount: number;
  children: Category[];
}

// モックカテゴリーデータ
const mockCategories: Category[] = [
  {
    id: 'cat-apparel',
    name: 'アパレル',
    slug: 'apparel',
    description: '衣類・ファッションアイテム',
    image: 'https://picsum.photos/seed/apparel/400/400',
    parentId: null,
    sortOrder: 1,
    productCount: 2,
    children: [
      {
        id: 'cat-tops',
        name: 'トップス',
        slug: 'tops',
        description: 'Tシャツ・シャツなど',
        image: null,
        parentId: 'cat-apparel',
        sortOrder: 1,
        productCount: 1,
        children: [],
      },
      {
        id: 'cat-bottoms',
        name: 'ボトムス',
        slug: 'bottoms',
        description: 'パンツ・スカートなど',
        image: null,
        parentId: 'cat-apparel',
        sortOrder: 2,
        productCount: 1,
        children: [],
      },
    ],
  },
  {
    id: 'cat-accessories',
    name: 'アクセサリー',
    slug: 'accessories',
    description: 'バッグ・アクセサリー',
    image: 'https://picsum.photos/seed/accessories/400/400',
    parentId: null,
    sortOrder: 2,
    productCount: 1,
    children: [],
  },
  {
    id: 'cat-home',
    name: 'ホーム&リビング',
    slug: 'home',
    description: '生活雑貨・インテリア',
    image: 'https://picsum.photos/seed/home/400/400',
    parentId: null,
    sortOrder: 3,
    productCount: 1,
    children: [],
  },
];

// カテゴリーをフラット化
function flattenCategories(
  categories: Category[], 
  result: Omit<Category, 'children'>[] = []
): Omit<Category, 'children'>[] {
  for (const cat of categories) {
    const { children, ...rest } = cat;
    result.push(rest);
    if (children && children.length > 0) {
      flattenCategories(children, result);
    }
  }
  return result;
}

// GET /api/v1/categories - カテゴリー一覧
export async function GET(request: NextRequest) {
  // API認証
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status);
  }

  // クエリパラメータ
  const { searchParams } = new URL(request.url);
  const flat = searchParams.get('flat') === 'true';
  const parentId = searchParams.get('parent');

  let categories;

  if (flat) {
    // フラット形式で返す
    categories = flattenCategories(mockCategories);
  } else if (parentId) {
    // 特定の親カテゴリーの子カテゴリーを返す
    const parent = flattenCategories(mockCategories).find(c => c.id === parentId);
    if (!parent) {
      return apiError('Parent category not found', 404);
    }
    categories = mockCategories
      .flatMap(c => [c, ...(c.children || [])])
      .filter(c => c.parentId === parentId)
      .map(({ children, ...rest }) => rest);
  } else {
    // ツリー形式で返す（デフォルト）
    categories = mockCategories;
  }

  const response = apiSuccess(categories);
  
  // CORSヘッダーを追加
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// OPTIONS /api/v1/categories - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}



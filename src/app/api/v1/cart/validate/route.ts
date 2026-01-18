import { NextRequest } from 'next/server';
import { 
  validateApiKey, 
  apiError, 
  apiSuccess,
  handleOptions,
  corsHeaders,
} from '@/lib/api/auth';

// カートアイテムの型
interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
}

// モック商品価格データ
const mockVariantPrices: Record<string, { 
  price: number; 
  compareAtPrice: number | null;
  stock: number; 
  productName: string;
  variantName: string;
  productImage: string;
}> = {
  'var-1': { price: 4500, compareAtPrice: 5500, stock: 10, productName: 'オーガニックコットンTシャツ', variantName: 'S / ホワイト', productImage: 'https://picsum.photos/seed/tshirt1/200/200' },
  'var-2': { price: 4500, compareAtPrice: 5500, stock: 15, productName: 'オーガニックコットンTシャツ', variantName: 'M / ホワイト', productImage: 'https://picsum.photos/seed/tshirt1/200/200' },
  'var-3': { price: 4500, compareAtPrice: 5500, stock: 8, productName: 'オーガニックコットンTシャツ', variantName: 'L / ホワイト', productImage: 'https://picsum.photos/seed/tshirt1/200/200' },
  'var-4': { price: 4500, compareAtPrice: 5500, stock: 12, productName: 'オーガニックコットンTシャツ', variantName: 'S / ブラック', productImage: 'https://picsum.photos/seed/tshirt1/200/200' },
  'var-5': { price: 4500, compareAtPrice: 5500, stock: 20, productName: 'オーガニックコットンTシャツ', variantName: 'M / ブラック', productImage: 'https://picsum.photos/seed/tshirt1/200/200' },
  'var-6': { price: 4500, compareAtPrice: 5500, stock: 0, productName: 'オーガニックコットンTシャツ', variantName: 'L / ブラック', productImage: 'https://picsum.photos/seed/tshirt1/200/200' }, // 在庫切れテスト用
  'var-7': { price: 8900, compareAtPrice: null, stock: 8, productName: 'リネンワイドパンツ', variantName: 'S', productImage: 'https://picsum.photos/seed/pants1/200/200' },
  'var-8': { price: 8900, compareAtPrice: null, stock: 12, productName: 'リネンワイドパンツ', variantName: 'M', productImage: 'https://picsum.photos/seed/pants1/200/200' },
  'var-9': { price: 8900, compareAtPrice: null, stock: 6, productName: 'リネンワイドパンツ', variantName: 'L', productImage: 'https://picsum.photos/seed/pants1/200/200' },
  'var-10': { price: 24800, compareAtPrice: null, stock: 5, productName: 'ハンドメイドレザーバッグ', variantName: 'ブラウン', productImage: 'https://picsum.photos/seed/bag1/200/200' },
  'var-11': { price: 24800, compareAtPrice: null, stock: 3, productName: 'ハンドメイドレザーバッグ', variantName: 'ブラック', productImage: 'https://picsum.photos/seed/bag1/200/200' },
  'var-12': { price: 3500, compareAtPrice: null, stock: 30, productName: 'オーガニックソープセット', variantName: 'デフォルト', productImage: 'https://picsum.photos/seed/soap/200/200' },
};

// POST /api/v1/cart/validate - カート内容検証
export async function POST(request: NextRequest) {
  // API認証
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status);
  }

  let body: { items: CartItem[]; couponCode?: string };
  
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  // バリデーション
  if (!body.items || !Array.isArray(body.items)) {
    return apiError('items is required and must be an array', 400);
  }

  // カートが空の場合
  if (body.items.length === 0) {
    return apiSuccess({
      valid: true,
      items: [],
      summary: {
        subtotal: 0,
        shippingFee: 0,
        discount: 0,
        total: 0,
      },
      messages: [],
    });
  }

  const validatedItems = [];
  const messages: { type: 'warning' | 'error' | 'info'; message: string }[] = [];
  let hasErrors = false;

  for (const item of body.items) {
    if (!item.variantId) {
      messages.push({ type: 'error', message: 'variantId is required for each item' });
      hasErrors = true;
      continue;
    }

    const variant = mockVariantPrices[item.variantId];
    if (!variant) {
      messages.push({ type: 'error', message: `商品が見つかりません: ${item.variantId}` });
      hasErrors = true;
      continue;
    }

    const requestedQuantity = item.quantity || 1;
    let actualQuantity = requestedQuantity;
    let itemStatus: 'available' | 'out_of_stock' | 'quantity_adjusted' = 'available';

    // 在庫チェック
    if (variant.stock === 0) {
      itemStatus = 'out_of_stock';
      actualQuantity = 0;
      messages.push({
        type: 'error',
        message: `「${variant.productName} (${variant.variantName})」は現在在庫切れです`,
      });
      hasErrors = true;
    } else if (variant.stock < requestedQuantity) {
      itemStatus = 'quantity_adjusted';
      actualQuantity = variant.stock;
      messages.push({
        type: 'warning',
        message: `「${variant.productName} (${variant.variantName})」の在庫が${variant.stock}点のみのため、数量を調整しました`,
      });
    }

    validatedItems.push({
      productId: item.productId,
      variantId: item.variantId,
      productName: variant.productName,
      variantName: variant.variantName,
      productImage: variant.productImage,
      requestedQuantity,
      quantity: actualQuantity,
      unitPrice: variant.price,
      compareAtPrice: variant.compareAtPrice,
      total: variant.price * actualQuantity,
      status: itemStatus,
      available: variant.stock > 0,
      stockQuantity: variant.stock,
    });
  }

  // 金額計算
  const availableItems = validatedItems.filter(item => item.quantity > 0);
  const subtotal = availableItems.reduce((sum, item) => sum + item.total, 0);
  
  // 送料計算（5,500円以上で無料）
  const shippingFee = subtotal >= 5500 ? 0 : 500;
  
  // クーポン処理（モック）
  let discount = 0;
  let couponValid = false;
  
  if (body.couponCode) {
    if (body.couponCode === 'WELCOME10') {
      discount = Math.floor(subtotal * 0.1);
      couponValid = true;
      messages.push({
        type: 'info',
        message: `クーポン「WELCOME10」が適用されました（10%オフ: -¥${discount.toLocaleString()}）`,
      });
    } else {
      messages.push({
        type: 'warning',
        message: `クーポンコード「${body.couponCode}」は無効です`,
      });
    }
  }

  // 送料無料メッセージ
  if (subtotal > 0 && subtotal < 5500) {
    const remaining = 5500 - subtotal;
    messages.push({
      type: 'info',
      message: `あと¥${remaining.toLocaleString()}で送料無料！`,
    });
  } else if (shippingFee === 0 && subtotal > 0) {
    messages.push({
      type: 'info',
      message: '送料無料！',
    });
  }

  const total = subtotal + shippingFee - discount;

  const response = apiSuccess({
    valid: !hasErrors,
    items: validatedItems,
    summary: {
      itemCount: availableItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      shippingFee,
      discount,
      total,
      currency: 'JPY',
      coupon: body.couponCode ? {
        code: body.couponCode,
        valid: couponValid,
        discount,
      } : null,
    },
    messages,
  });
  
  // CORSヘッダーを追加
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// OPTIONS /api/v1/cart/validate - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}




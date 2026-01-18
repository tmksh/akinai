import { NextRequest } from 'next/server';
import { 
  validateApiKey, 
  apiError, 
  apiSuccess,
  handleOptions,
  corsHeaders,
} from '@/lib/api/auth';

// 注文アイテムの型
interface OrderItem {
  productId: string;
  variantId: string;
  quantity: number;
}

// 配送先の型
interface ShippingAddress {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2?: string;
}

// 注文リクエストの型
interface CreateOrderRequest {
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  paymentMethod: 'credit_card' | 'bank_transfer' | 'cod';
  couponCode?: string;
  note?: string;
}

// モック商品価格データ
const mockVariantPrices: Record<string, { price: number; stock: number; productName: string }> = {
  'var-1': { price: 4500, stock: 10, productName: 'オーガニックコットンTシャツ' },
  'var-2': { price: 4500, stock: 15, productName: 'オーガニックコットンTシャツ' },
  'var-3': { price: 4500, stock: 8, productName: 'オーガニックコットンTシャツ' },
  'var-4': { price: 4500, stock: 12, productName: 'オーガニックコットンTシャツ' },
  'var-5': { price: 4500, stock: 20, productName: 'オーガニックコットンTシャツ' },
  'var-6': { price: 4500, stock: 5, productName: 'オーガニックコットンTシャツ' },
  'var-7': { price: 8900, stock: 8, productName: 'リネンワイドパンツ' },
  'var-8': { price: 8900, stock: 12, productName: 'リネンワイドパンツ' },
  'var-9': { price: 8900, stock: 6, productName: 'リネンワイドパンツ' },
  'var-10': { price: 24800, stock: 5, productName: 'ハンドメイドレザーバッグ' },
  'var-11': { price: 24800, stock: 3, productName: 'ハンドメイドレザーバッグ' },
  'var-12': { price: 3500, stock: 30, productName: 'オーガニックソープセット' },
};

// 注文番号生成
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

// POST /api/v1/orders - 注文作成
export async function POST(request: NextRequest) {
  // API認証
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status);
  }

  let body: CreateOrderRequest;
  
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  // バリデーション
  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return apiError('items is required and must be a non-empty array', 400);
  }

  if (!body.shippingAddress) {
    return apiError('shippingAddress is required', 400);
  }

  const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'postalCode', 'prefecture', 'city', 'address1'];
  for (const field of requiredFields) {
    if (!body.shippingAddress[field as keyof ShippingAddress]) {
      return apiError(`shippingAddress.${field} is required`, 400);
    }
  }

  if (!body.paymentMethod || !['credit_card', 'bank_transfer', 'cod'].includes(body.paymentMethod)) {
    return apiError('paymentMethod must be one of: credit_card, bank_transfer, cod', 400);
  }

  // 注文アイテムの検証と金額計算
  const orderItems = [];
  let subtotal = 0;

  for (const item of body.items) {
    if (!item.variantId || !item.quantity || item.quantity < 1) {
      return apiError('Each item must have variantId and quantity >= 1', 400);
    }

    const variant = mockVariantPrices[item.variantId];
    if (!variant) {
      return apiError(`Variant ${item.variantId} not found`, 400);
    }

    if (variant.stock < item.quantity) {
      return apiError(`Insufficient stock for variant ${item.variantId}. Available: ${variant.stock}`, 400);
    }

    const itemTotal = variant.price * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      productId: item.productId,
      variantId: item.variantId,
      productName: variant.productName,
      quantity: item.quantity,
      unitPrice: variant.price,
      total: itemTotal,
    });
  }

  // 送料計算（仮: 5,500円以上で無料、それ以外は500円）
  const shippingFee = subtotal >= 5500 ? 0 : 500;

  // 代金引換手数料
  const codFee = body.paymentMethod === 'cod' ? 330 : 0;

  // クーポン処理（モック）
  let discount = 0;
  if (body.couponCode === 'WELCOME10') {
    discount = Math.floor(subtotal * 0.1); // 10%オフ
  }

  const total = subtotal + shippingFee + codFee - discount;

  // 注文作成（モック）
  const order = {
    id: `order_${Date.now()}`,
    orderNumber: generateOrderNumber(),
    organizationId: auth.organizationId,
    status: body.paymentMethod === 'bank_transfer' ? 'awaiting_payment' : 'pending',
    items: orderItems,
    subtotal,
    shippingFee,
    codFee,
    discount,
    total,
    currency: 'JPY',
    shippingAddress: body.shippingAddress,
    billingAddress: body.billingAddress || body.shippingAddress,
    paymentMethod: body.paymentMethod,
    paymentStatus: body.paymentMethod === 'bank_transfer' ? 'pending' : 'authorized',
    couponCode: body.couponCode || null,
    note: body.note || null,
    createdAt: new Date().toISOString(),
  };

  // レスポンス
  const responseData: {
    order: typeof order;
    paymentInstructions?: string;
    nextSteps: string[];
  } = {
    order,
    nextSteps: [],
  };

  // 支払い方法に応じた案内
  switch (body.paymentMethod) {
    case 'credit_card':
      responseData.nextSteps = [
        '決済処理が完了しました',
        '注文確認メールをお送りしました',
        '商品の発送準備を開始します',
      ];
      break;
    case 'bank_transfer':
      responseData.paymentInstructions = `
        下記口座にお振込みください：
        銀行名: サンプル銀行
        支店名: 本店
        口座種別: 普通
        口座番号: 1234567
        口座名義: カ）サンプルストア
        
        ※お振込み期限: ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')}
        ※振込手数料はお客様負担となります
      `.trim();
      responseData.nextSteps = [
        '注文を受け付けました',
        'お振込みを確認次第、発送準備を開始します',
      ];
      break;
    case 'cod':
      responseData.nextSteps = [
        '注文を受け付けました',
        '商品の発送準備を開始します',
        '商品到着時に配送業者へお支払いください',
      ];
      break;
  }

  const response = apiSuccess(responseData);
  
  // CORSヘッダーを追加
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// OPTIONS /api/v1/orders - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}




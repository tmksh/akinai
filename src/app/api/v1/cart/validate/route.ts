import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  corsHeaders,
  withApiLogging,
} from '@/lib/api/auth';

// カートアイテムの型
interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
}

// POST /api/v1/cart/validate - カート内容検証
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return apiError('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: { items: CartItem[]; couponCode?: string };

    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    if (!body.items || !Array.isArray(body.items)) {
      return apiError('items is required and must be an array', 400);
    }

    // カートが空の場合
    if (body.items.length === 0) {
      const response = apiSuccess({
        valid: true,
        items: [],
        summary: {
          itemCount: 0,
          subtotal: 0,
          shippingFee: 0,
          discount: 0,
          total: 0,
          currency: 'JPY',
          coupon: null,
        },
        messages: [],
      });
      Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    }

    // バリアントIDを一括取得
    const variantIds = body.items
      .filter(item => item.variantId)
      .map(item => item.variantId);

    if (variantIds.length === 0) {
      return apiError('Each item must have a variantId', 400);
    }

    // バリアント + 商品情報を一括で取得
    const { data: variants, error: variantError } = await supabase
      .from('product_variants')
      .select(`
        id,
        name,
        sku,
        price,
        compare_at_price,
        stock,
        options,
        product_id,
        products!inner (
          id,
          name,
          slug,
          organization_id,
          status
        )
      `)
      .in('id', variantIds);

    if (variantError) {
      console.error('Error fetching variants:', variantError);
      return apiError('Failed to validate cart items', 500);
    }

    // バリアントをIDでマップ化
    const variantMap = new Map(
      (variants || []).map(v => [v.id, v])
    );

    // 商品画像を一括取得
    const productIds = [...new Set((variants || []).map(v => v.product_id))];
    let imageMap: Record<string, string> = {};

    if (productIds.length > 0) {
      const { data: images } = await supabase
        .from('product_images')
        .select('product_id, url')
        .in('product_id', productIds)
        .order('sort_order', { ascending: true });

      if (images) {
        for (const img of images) {
          if (!imageMap[img.product_id]) {
            imageMap[img.product_id] = img.url;
          }
        }
      }
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

      const variant = variantMap.get(item.variantId) as Record<string, unknown> | undefined;
      if (!variant) {
        messages.push({ type: 'error', message: `商品が見つかりません: ${item.variantId}` });
        hasErrors = true;
        continue;
      }

      // 組織チェック
      const product = variant.products as Record<string, unknown>;
      if (product.organization_id !== auth.organizationId) {
        messages.push({ type: 'error', message: `商品が見つかりません: ${item.variantId}` });
        hasErrors = true;
        continue;
      }

      // 公開チェック
      if (product.status !== 'published') {
        messages.push({ type: 'error', message: `「${product.name}」は現在販売されていません` });
        hasErrors = true;
        continue;
      }

      const price = Number(variant.price) || 0;
      const compareAtPrice = variant.compare_at_price ? Number(variant.compare_at_price) : null;
      const stock = Number(variant.stock) || 0;
      const requestedQuantity = item.quantity || 1;
      let actualQuantity = requestedQuantity;
      let itemStatus: 'available' | 'out_of_stock' | 'quantity_adjusted' = 'available';

      // 在庫チェック
      if (stock === 0) {
        itemStatus = 'out_of_stock';
        actualQuantity = 0;
        messages.push({
          type: 'error',
          message: `「${product.name} (${variant.name})」は現在在庫切れです`,
        });
        hasErrors = true;
      } else if (stock < requestedQuantity) {
        itemStatus = 'quantity_adjusted';
        actualQuantity = stock;
        messages.push({
          type: 'warning',
          message: `「${product.name} (${variant.name})」の在庫が${stock}点のみのため、数量を調整しました`,
        });
      }

      validatedItems.push({
        productId: product.id as string,
        variantId: variant.id as string,
        productName: product.name as string,
        variantName: variant.name as string,
        productImage: imageMap[product.id as string] || null,
        sku: variant.sku as string,
        requestedQuantity,
        quantity: actualQuantity,
        unitPrice: price,
        compareAtPrice,
        total: price * actualQuantity,
        status: itemStatus,
        available: stock > 0,
        stockQuantity: stock,
      });
    }

    // 金額計算
    const availableItems = validatedItems.filter(item => item.quantity > 0);
    const subtotal = availableItems.reduce((sum, item) => sum + item.total, 0);

    // 送料計算: 組織の settings から取得、なければデフォルト
    const { data: orgData } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', auth.organizationId)
      .single();

    const settings = (orgData?.settings || {}) as Record<string, unknown>;
    const shippingSettings = (settings.shipping || {}) as Record<string, unknown>;
    const freeShippingThreshold = Number(shippingSettings.free_shipping_threshold) || 5500;
    const defaultShippingFee = Number(shippingSettings.default_shipping_fee) || 500;
    const shippingFee = subtotal >= freeShippingThreshold ? 0 : defaultShippingFee;

    // クーポン処理（将来的にDBから取得。現在は基本構造のみ）
    let discount = 0;
    let couponValid = false;

    if (body.couponCode) {
      // TODO: coupons テーブルからの検証に置き換え
      messages.push({
        type: 'warning',
        message: `クーポンコード「${body.couponCode}」は無効です`,
      });
    }

    // 送料無料メッセージ
    if (subtotal > 0 && subtotal < freeShippingThreshold) {
      const remaining = freeShippingThreshold - subtotal;
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
        coupon: body.couponCode
          ? {
              code: body.couponCode,
              valid: couponValid,
              discount,
            }
          : null,
      },
      messages,
    }, undefined, auth.rateLimit);

    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

// OPTIONS /api/v1/cart/validate - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

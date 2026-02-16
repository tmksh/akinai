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

/**
 * GET /api/v1/shipping-options
 *
 * 組織の送料設定を返す。
 * フロント側でカート画面やチェックアウト時に送料表示するために使用する。
 *
 * クエリパラメータ:
 *   subtotal  - カート小計（送料無料判定に使用）
 *   prefecture - 都道府県（地域別送料に使用）
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const subtotalParam = searchParams.get('subtotal');
    const prefecture = searchParams.get('prefecture');

    // 組織の設定を取得
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', auth.organizationId)
      .single();

    if (orgError || !org) {
      return apiError('Organization not found', 404);
    }

    const settings = (org.settings || {}) as Record<string, unknown>;
    const shippingSettings = (settings.shipping || {}) as Record<string, unknown>;

    // デフォルト値
    const defaultFee = Number(shippingSettings.default_shipping_fee) || 500;
    const freeThreshold = Number(shippingSettings.free_shipping_threshold) || 5500;
    const codFee = Number(shippingSettings.cod_fee) || 330;
    const expressFee = Number(shippingSettings.express_fee) || 800;

    // 地域別送料
    const regionalFees = (shippingSettings.regional_fees || {}) as Record<string, number>;

    // 現在の小計に基づいた送料計算
    const subtotal = subtotalParam ? Number(subtotalParam) : null;
    let applicableFee = defaultFee;

    // 都道府県別送料がある場合
    if (prefecture && regionalFees[prefecture] !== undefined) {
      applicableFee = regionalFees[prefecture];
    }

    // 送料無料判定
    const isFreeShipping = subtotal !== null && subtotal >= freeThreshold;
    const actualFee = isFreeShipping ? 0 : applicableFee;

    // 配送方法一覧
    const methods = [
      {
        id: 'standard',
        name: '通常配送',
        description: '通常3〜5営業日でお届け',
        fee: actualFee,
        estimatedDays: { min: 3, max: 5 },
        available: true,
      },
    ];

    // 速達配送がある場合
    if (Number(shippingSettings.express_fee) > 0 || expressFee > 0) {
      methods.push({
        id: 'express',
        name: '速達配送',
        description: '1〜2営業日でお届け',
        fee: isFreeShipping ? Math.max(0, expressFee - defaultFee) : expressFee,
        estimatedDays: { min: 1, max: 2 },
        available: true,
      });
    }

    const response = apiSuccess(
      {
        methods,
        freeShippingThreshold: freeThreshold,
        freeShippingEligible: isFreeShipping,
        remainingForFreeShipping:
          subtotal !== null ? Math.max(0, freeThreshold - subtotal) : freeThreshold,
        codFee,
        currency: 'JPY',
      },
      undefined,
      auth.rateLimit
    );
    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

// OPTIONS /api/v1/shipping-options - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

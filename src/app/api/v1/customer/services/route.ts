/**
 * GET /api/v1/customer/services
 *
 * 公開API：会員向けに公開されている単発払いサービスの価格一覧を取得する。
 * - Authorization: Bearer <shop_api_key>
 * - Returns: { enabled, services: [...] }
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey, apiError, apiSuccess, handleOptions, corsHeaders } from '@/lib/api/auth';
import { readOneTimeServicesSettings } from '@/lib/customer-one-time-services';

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return apiError('Server configuration error', 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', auth.organizationId)
    .single();

  const settings = readOneTimeServicesSettings(org?.settings as Record<string, unknown> | null);

  // 公開フラグが立っており、isActive=true のサービスだけ返す
  const visibleServices = settings.enabled
    ? settings.services.filter((s) => s.isActive)
    : [];

  // Stripe の内部 ID は外部公開不要なので除外する
  const sanitized = visibleServices
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      amount: s.amount,
      currency: s.currency,
      features: s.features,
      imageUrl: s.imageUrl ?? '',
      // 0 または未設定は外部TOP非表示。クライアント側で >0 のものだけソート/表示する
      displayOrder: typeof s.displayOrder === 'number' ? s.displayOrder : 0,
      // 'supplier' | 'buyer' | 'both' | null（指定なし）
      targetRole: s.targetRole ?? null,
    }));

  const response = apiSuccess(
    {
      enabled: settings.enabled,
      services: sanitized,
    },
    undefined,
    auth.rateLimit
  );

  Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
  return response;
}

export async function OPTIONS() {
  return handleOptions();
}

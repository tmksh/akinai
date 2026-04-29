/**
 * GET /api/v1/customer/subscription-plans
 *
 * 公開API：会員向けに公開されている有料プラン一覧を取得する。
 * - Authorization: Bearer <shop_api_key>
 * - クエリ: ?role=supplier  （任意。指定すると role でフィルタ）
 * - Returns: { enabled, plans: [...] }
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateApiKey, apiError, apiSuccess, handleOptions, corsHeaders } from '@/lib/api/auth';
import {
  readPlansSettings,
  type CustomerRoleKey,
} from '@/lib/customer-subscription-plans';

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  const { searchParams } = new URL(request.url);
  const roleParam = searchParams.get('role') as CustomerRoleKey | null;

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

  const settings = readPlansSettings(org?.settings as Record<string, unknown> | null);

  // 公開フラグが立っており、isActive=true のプランだけ返す
  const visiblePlans = settings.enabled
    ? settings.plans.filter((p) => p.isActive)
    : [];

  const filtered = roleParam
    ? visiblePlans.filter((p) => p.targetRole === roleParam)
    : visiblePlans;

  // Stripe の生 Price ID は外部公開不要なので、購読時に再度サーバ側で参照する
  const sanitized = filtered
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((p) => ({
      id: p.id,
      targetRole: p.targetRole,
      name: p.name,
      description: p.description,
      amount: p.amount,
      currency: p.currency,
      interval: p.interval,
      features: p.features,
    }));

  const response = apiSuccess(
    {
      enabled: settings.enabled,
      plans: sanitized,
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

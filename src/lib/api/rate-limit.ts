import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from './supabase-admin';

export interface RateLimitResult {
  allowed: boolean;
  minuteLimit: number;
  minuteRemaining: number;
  dayLimit: number;
  dayRemaining: number;
  retryAfter?: number;
}

export interface ApiUsageLog {
  organizationId: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  responseTimeMs?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface ValidatedApiOrg {
  organizationId: string;
  organizationName: string;
  plan: string;
  rateLimit: RateLimitResult;
}

const DEFAULT_RATE_LIMIT: RateLimitResult = {
  allowed: true,
  minuteLimit: 60,
  minuteRemaining: 60,
  dayLimit: 10000,
  dayRemaining: 10000,
};

function parseRateLimitPayload(data: Record<string, unknown>): RateLimitResult {
  const allowed = Boolean(data.allowed);
  return {
    allowed,
    minuteLimit: Number(data.minute_limit) || 60,
    minuteRemaining: Number(data.minute_remaining) || 0,
    dayLimit: Number(data.day_limit) || 10000,
    dayRemaining: Number(data.day_remaining) || 0,
    retryAfter: allowed ? undefined : 60,
  };
}

function isMissingRpcError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42883' ||
    error.code === 'PGRST202' ||
    (error.message?.includes('validate_api_key_and_consume_rate_limit') ?? false)
  );
}

/**
 * APIキー検証 + レート制限消費を 1 RPC で実行（マイグレーション 036 以降）。
 * 未適用環境では従来の 2 段階処理にフォールバック。
 */
export async function validateApiKeyAndRateLimit(apiKey: string): Promise<
  | { success: true; org: ValidatedApiOrg }
  | { success: false; error: string; status: number; rateLimit?: RateLimitResult }
> {
  try {
    const supabase = getServiceSupabase();

    const { data, error } = await supabase.rpc('validate_api_key_and_consume_rate_limit', {
      p_api_key: apiKey,
    });

    if (!error && data) {
      const payload = data as Record<string, unknown>;
      if (!payload.success) {
        return { success: false, error: 'Invalid API key', status: 401 };
      }

      const rateLimit = parseRateLimitPayload(payload);
      if (!rateLimit.allowed) {
        return { success: false, error: 'Rate limit exceeded', status: 429, rateLimit };
      }

      return {
        success: true,
        org: {
          organizationId: String(payload.organization_id),
          organizationName: String(payload.organization_name),
          plan: String(payload.plan),
          rateLimit,
        },
      };
    }

    if (!isMissingRpcError(error)) {
      console.error('Fast API auth error:', error);
    }

    // フォールバック: 従来フロー
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, plan')
      .eq('frontend_api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (orgError || !org) {
      return { success: false, error: 'Invalid API key', status: 401 };
    }

    const rateLimit = await checkRateLimitLegacy(org.id, org.plan);
    if (!rateLimit.allowed) {
      return { success: false, error: 'Rate limit exceeded', status: 429, rateLimit };
    }

    return {
      success: true,
      org: {
        organizationId: org.id,
        organizationName: org.name,
        plan: org.plan,
        rateLimit,
      },
    };
  } catch (err) {
    console.error('validateApiKeyAndRateLimit exception:', err);
    return { success: false, error: 'Server configuration error', status: 500 };
  }
}

/** @deprecated 036 未適用時のフォールバック */
async function checkRateLimitLegacy(organizationId: string, plan: string): Promise<RateLimitResult> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.rpc('check_rate_limit', {
      org_id: organizationId,
      org_plan: plan,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      return DEFAULT_RATE_LIMIT;
    }

    return parseRateLimitPayload(data as Record<string, unknown>);
  } catch (error) {
    console.error('Rate limit check exception:', error);
    return DEFAULT_RATE_LIMIT;
  }
}

/**
 * @deprecated validateApiKeyAndRateLimit を使用してください
 */
export async function checkRateLimit(
  organizationId: string,
  plan: string,
): Promise<RateLimitResult> {
  return checkRateLimitLegacy(organizationId, plan);
}

export async function logApiUsage(usage: ApiUsageLog): Promise<void> {
  try {
    const supabase = getServiceSupabase();
    await supabase.from('api_usage').insert({
      organization_id: usage.organizationId,
      endpoint: usage.endpoint,
      method: usage.method,
      status_code: usage.statusCode,
      response_time_ms: usage.responseTimeMs,
      ip_address: usage.ipAddress,
      user_agent: usage.userAgent,
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit-Minute': result.minuteLimit.toString(),
    'X-RateLimit-Remaining-Minute': result.minuteRemaining.toString(),
    'X-RateLimit-Limit-Day': result.dayLimit.toString(),
    'X-RateLimit-Remaining-Day': result.dayRemaining.toString(),
    ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
  };
}

export function rateLimitError(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'API rate limit exceeded. Please try again later.',
      status: 429,
      limits: {
        minute: { limit: result.minuteLimit, remaining: result.minuteRemaining },
        day: { limit: result.dayLimit, remaining: result.dayRemaining },
      },
      retryAfter: result.retryAfter,
      timestamp: new Date().toISOString(),
    },
    {
      status: 429,
      headers: {
        ...getRateLimitHeaders(result),
        'Content-Type': 'application/json',
      },
    },
  );
}

export function getClientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined
  );
}

export function getUserAgent(request: NextRequest): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

export function normalizeEndpoint(pathname: string): string {
  return pathname.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id',
  );
}

export async function getApiUsageStats(
  organizationId: string,
  days: number = 30,
): Promise<{
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  dailyStats: Array<{
    date: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
  }>;
}> {
  try {
    const supabase = getServiceSupabase();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('api_usage_daily')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching API usage stats:', error);
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        dailyStats: [],
      };
    }

    const dailyStats = (data || []).map((d) => ({
      date: d.date,
      totalRequests: d.total_requests,
      successfulRequests: d.successful_requests,
      failedRequests: d.failed_requests,
      avgResponseTime: d.avg_response_time_ms,
    }));

    const totals = dailyStats.reduce(
      (acc, d) => ({
        totalRequests: acc.totalRequests + d.totalRequests,
        successfulRequests: acc.successfulRequests + d.successfulRequests,
        failedRequests: acc.failedRequests + d.failedRequests,
        avgResponseTime: acc.avgResponseTime + d.avgResponseTime * d.totalRequests,
      }),
      { totalRequests: 0, successfulRequests: 0, failedRequests: 0, avgResponseTime: 0 },
    );

    return {
      totalRequests: totals.totalRequests,
      successfulRequests: totals.successfulRequests,
      failedRequests: totals.failedRequests,
      avgResponseTime:
        totals.totalRequests > 0
          ? Math.round(totals.avgResponseTime / totals.totalRequests)
          : 0,
      dailyStats,
    };
  } catch (error) {
    console.error('Error fetching API usage stats:', error);
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      dailyStats: [],
    };
  }
}

/** 読み取り専用 GET の CDN / クライアントキャッシュ */
export const CACHE_PROFILES = {
  /** 初回表示一括（マスタ + カタログ） */
  bootstrap: 'private, max-age=60, stale-while-revalidate=300',
  /** 商品・カテゴリなど比較的安定したカタログ */
  catalog: 'private, max-age=30, stale-while-revalidate=120',
  /** 代理店・サプライヤー等のマスタ */
  master: 'private, max-age=300, stale-while-revalidate=900',
  /** 送料設定など組織設定 */
  settings: 'private, max-age=120, stale-while-revalidate=600',
  /** 認証済みユーザー向け（短時間のみ） */
  session: 'private, max-age=15, stale-while-revalidate=30',
  /** 問い合わせ等リアルタイム性が必要 */
  realtime: 'private, no-store',
} as const;

export function applyApiResponseHeaders(
  response: NextResponse,
  options?: { cacheControl?: string },
): NextResponse {
  Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
  if (options?.cacheControl) {
    response.headers.set('Cache-Control', options.cacheControl);
    response.headers.set('Vary', 'Authorization');
  }
  return response;
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function handleOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

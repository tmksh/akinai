import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// Supabaseクライアントを作成
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * レート制限をチェック
 */
export async function checkRateLimit(
  organizationId: string,
  plan: string
): Promise<RateLimitResult> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc('check_rate_limit', {
      org_id: organizationId,
      org_plan: plan,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // エラー時は許可（フェイルオープン）
      return {
        allowed: true,
        minuteLimit: 60,
        minuteRemaining: 60,
        dayLimit: 10000,
        dayRemaining: 10000,
      };
    }

    return {
      allowed: data.allowed,
      minuteLimit: data.minute_limit,
      minuteRemaining: data.minute_remaining,
      dayLimit: data.day_limit,
      dayRemaining: data.day_remaining,
      retryAfter: data.allowed ? undefined : 60,
    };
  } catch (error) {
    console.error('Rate limit check exception:', error);
    // エラー時は許可（フェイルオープン）
    return {
      allowed: true,
      minuteLimit: 60,
      minuteRemaining: 60,
      dayLimit: 10000,
      dayRemaining: 10000,
    };
  }
}

/**
 * API使用量をログに記録
 */
export async function logApiUsage(usage: ApiUsageLog): Promise<void> {
  try {
    const supabase = getSupabaseClient();

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
    // ログの記録に失敗してもAPIリクエストは継続
    console.error('Failed to log API usage:', error);
  }
}

/**
 * レート制限ヘッダーを取得
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit-Minute': result.minuteLimit.toString(),
    'X-RateLimit-Remaining-Minute': result.minuteRemaining.toString(),
    'X-RateLimit-Limit-Day': result.dayLimit.toString(),
    'X-RateLimit-Remaining-Day': result.dayRemaining.toString(),
    ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
  };
}

/**
 * レート制限エラーレスポンスを生成
 */
export function rateLimitError(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'API rate limit exceeded. Please try again later.',
      status: 429,
      limits: {
        minute: {
          limit: result.minuteLimit,
          remaining: result.minuteRemaining,
        },
        day: {
          limit: result.dayLimit,
          remaining: result.dayRemaining,
        },
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
    }
  );
}

/**
 * リクエストからIPアドレスを取得
 */
export function getClientIp(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    undefined
  );
}

/**
 * リクエストからUser-Agentを取得
 */
export function getUserAgent(request: NextRequest): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

/**
 * エンドポイントパスを正規化（パラメータを除去）
 */
export function normalizeEndpoint(pathname: string): string {
  // UUIDパターンを:idに置換
  return pathname.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id'
  );
}

/**
 * API使用量統計を取得
 */
export async function getApiUsageStats(
  organizationId: string,
  days: number = 30
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
    const supabase = getSupabaseClient();

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
      { totalRequests: 0, successfulRequests: 0, failedRequests: 0, avgResponseTime: 0 }
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

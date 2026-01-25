import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  checkRateLimit,
  logApiUsage,
  getRateLimitHeaders,
  rateLimitError,
  getClientIp,
  getUserAgent,
  normalizeEndpoint,
  type RateLimitResult,
} from './rate-limit';

// API認証の結果
export interface ApiAuthResult {
  success: boolean;
  organizationId?: string;
  organizationName?: string;
  plan?: string;
  error?: string;
  status?: number;
  rateLimit?: RateLimitResult;
}

// APIキーからorganizationを特定
export async function validateApiKey(request: NextRequest): Promise<ApiAuthResult> {
  const authHeader = request.headers.get('Authorization');
  
  // Authorizationヘッダーの確認
  if (!authHeader) {
    return {
      success: false,
      error: 'Authorization header is required',
      status: 401,
    };
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Invalid authorization format. Use: Bearer <api_key>',
      status: 401,
    };
  }
  
  const apiKey = authHeader.replace('Bearer ', '');
  
  if (!apiKey) {
    return {
      success: false,
      error: 'API key is required',
      status: 401,
    };
  }

  // Supabase接続
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration');
    return {
      success: false,
      error: 'Server configuration error',
      status: 500,
    };
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // APIキーで組織を検索
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, plan')
    .eq('frontend_api_key', apiKey)
    .eq('is_active', true)
    .single();
  
  if (error || !org) {
    return {
      success: false,
      error: 'Invalid API key',
      status: 401,
    };
  }

  // レート制限チェック
  const rateLimit = await checkRateLimit(org.id, org.plan);

  if (!rateLimit.allowed) {
    return {
      success: false,
      error: 'Rate limit exceeded',
      status: 429,
      rateLimit,
    };
  }

  return {
    success: true,
    organizationId: org.id,
    organizationName: org.name,
    plan: org.plan,
    rateLimit,
  };
}

// エラーレスポンスを生成
export function apiError(message: string, status: number = 400, rateLimit?: RateLimitResult) {
  // レート制限エラーの場合は専用レスポンスを返す
  if (status === 429 && rateLimit) {
    return rateLimitError(rateLimit);
  }

  return NextResponse.json(
    {
      error: message,
      status,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

// 成功レスポンスを生成
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, rateLimit?: RateLimitResult) {
  const response = NextResponse.json({
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  });

  // レート制限ヘッダーを追加
  if (rateLimit) {
    const headers = getRateLimitHeaders(rateLimit);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

// ページネーション付き成功レスポンス
export function apiSuccessPaginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  rateLimit?: RateLimitResult
) {
  const response = NextResponse.json({
    data,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
      timestamp: new Date().toISOString(),
    },
  });

  // レート制限ヘッダーを追加
  if (rateLimit) {
    const headers = getRateLimitHeaders(rateLimit);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return response;
}

// CORS ヘッダーを設定
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// OPTIONSリクエスト用のレスポンス
export function handleOptions() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

// API使用量をログに記録するラッパー関数
export async function withApiLogging(
  request: NextRequest,
  auth: ApiAuthResult,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();
  let response: NextResponse;

  try {
    response = await handler();
  } catch (error) {
    console.error('API handler error:', error);
    response = apiError('Internal server error', 500);
  }

  const endTime = Date.now();

  // 非同期でログを記録（レスポンスをブロックしない）
  if (auth.organizationId) {
    logApiUsage({
      organizationId: auth.organizationId,
      endpoint: normalizeEndpoint(new URL(request.url).pathname),
      method: request.method,
      statusCode: response.status,
      responseTimeMs: endTime - startTime,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    }).catch((err) => console.error('Failed to log API usage:', err));
  }

  return response;
}

// 再エクスポート（利便性のため）
export {
  logApiUsage,
  getClientIp,
  getUserAgent,
  normalizeEndpoint,
  getApiUsageStats,
} from './rate-limit';
export type { RateLimitResult } from './rate-limit';








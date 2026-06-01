import { NextRequest, NextResponse } from 'next/server';
import {
  validateApiKeyAndRateLimit,
  logApiUsage,
  getRateLimitHeaders,
  rateLimitError,
  getClientIp,
  getUserAgent,
  normalizeEndpoint,
  applyApiResponseHeaders,
  corsHeaders,
  handleOptions,
  type RateLimitResult,
} from './rate-limit';

export interface ApiAuthResult {
  success: boolean;
  organizationId?: string;
  organizationName?: string;
  plan?: string;
  error?: string;
  status?: number;
  rateLimit?: RateLimitResult;
}

export async function validateApiKey(request: NextRequest): Promise<ApiAuthResult> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return { success: false, error: 'Authorization header is required', status: 401 };
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
    return { success: false, error: 'API key is required', status: 401 };
  }

  const result = await validateApiKeyAndRateLimit(apiKey);
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      status: result.status,
      rateLimit: result.rateLimit,
    };
  }

  return {
    success: true,
    organizationId: result.org.organizationId,
    organizationName: result.org.organizationName,
    plan: result.org.plan,
    rateLimit: result.org.rateLimit,
  };
}

export function apiError(message: string, status: number = 400, rateLimit?: RateLimitResult) {
  if (status === 429 && rateLimit) {
    return rateLimitError(rateLimit);
  }

  return NextResponse.json(
    {
      error: message,
      status,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  rateLimit?: RateLimitResult,
  cacheControl?: string,
) {
  const response = NextResponse.json({
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  });

  if (rateLimit) {
    const headers = getRateLimitHeaders(rateLimit);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return applyApiResponseHeaders(response, cacheControl ? { cacheControl } : undefined);
}

export function apiSuccessPaginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  rateLimit?: RateLimitResult,
  cacheControl?: string,
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

  if (rateLimit) {
    const headers = getRateLimitHeaders(rateLimit);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  return applyApiResponseHeaders(response, cacheControl ? { cacheControl } : undefined);
}

export async function withApiLogging(
  request: NextRequest,
  auth: ApiAuthResult,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const startTime = Date.now();
  let response: NextResponse;

  try {
    response = await handler();
  } catch (error) {
    console.error('API handler error:', error);
    response = apiError('Internal server error', 500);
  }

  if (auth.organizationId) {
    logApiUsage({
      organizationId: auth.organizationId,
      endpoint: normalizeEndpoint(new URL(request.url).pathname),
      method: request.method,
      statusCode: response.status,
      responseTimeMs: Date.now() - startTime,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    }).catch((err) => console.error('Failed to log API usage:', err));
  }

  return response;
}

export {
  logApiUsage,
  getClientIp,
  getUserAgent,
  normalizeEndpoint,
  getApiUsageStats,
  applyApiResponseHeaders,
  corsHeaders,
  handleOptions,
  CACHE_PROFILES,
} from './rate-limit';
export { getServiceSupabase } from './supabase-admin';
export type { RateLimitResult } from './rate-limit';

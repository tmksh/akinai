import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// API認証の結果
export interface ApiAuthResult {
  success: boolean;
  organizationId?: string;
  organizationName?: string;
  plan?: string;
  error?: string;
  status?: number;
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

  // TODO: 実際のSupabase接続に置き換える
  // 現在はモックデータで動作確認
  
  // モック: APIキーが 'sk_live_' で始まる場合は有効とする
  if (apiKey.startsWith('sk_live_') || apiKey.startsWith('sk_test_')) {
    // モック組織データ
    return {
      success: true,
      organizationId: 'org_123',
      organizationName: '商い サンプルストア',
      plan: 'pro',
    };
  }
  
  /* 
  // 本番用コード（Supabase接続時に有効化）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      error: 'Server configuration error',
      status: 500,
    };
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, plan')
    .eq('frontend_api_key', apiKey)
    .single();
  
  if (error || !org) {
    return {
      success: false,
      error: 'Invalid API key',
      status: 401,
    };
  }
  
  return {
    success: true,
    organizationId: org.id,
    organizationName: org.name,
    plan: org.plan,
  };
  */
  
  return {
    success: false,
    error: 'Invalid API key',
    status: 401,
  };
}

// エラーレスポンスを生成
export function apiError(message: string, status: number = 400) {
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
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  });
}

// ページネーション付き成功レスポンス
export function apiSuccessPaginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
) {
  return NextResponse.json({
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








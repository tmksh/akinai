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
import { contentTypeConfig } from '@/lib/content-types';

/**
 * GET /api/v1/content-types
 *
 * この組織で有効なコンテンツタイプの一覧を返します。
 * フロントでは「どの type の値で ?type=xxx すればよいか」をここで取得できます。
 *
 * レスポンス例:
 * { "data": [ { "value": "news", "label": "ニュース" }, { "value": "article", "label": "記事" } ] }
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

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', auth.organizationId!)
      .single();

    if (orgError || !org) {
      const response = apiSuccess({ types: [] }, undefined, auth.rateLimit);
      Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    }

    const settings = (org.settings as Record<string, unknown>) || {};
    const enabled = (settings.enabled_content_types as string[] | undefined) || [];

    const types = enabled
      .filter((value) => contentTypeConfig[value])
      .map((value) => ({
        value,
        label: contentTypeConfig[value].label,
      }));

    const response = apiSuccess({ types }, undefined, auth.rateLimit);
    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

export async function OPTIONS() {
  return handleOptions();
}

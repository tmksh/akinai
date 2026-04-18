import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  apiSuccessPaginated,
  handleOptions,
  corsHeaders,
  withApiLogging,
} from '@/lib/api/auth';

// GET /api/v1/agents - 代理店一覧 / コードで検索
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
    const code = searchParams.get('code');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // 代理店コードで1件検索（注文フォームでのコード検証用）
    if (code) {
      const { data: agent, error } = await supabase
        .from('agents')
        .select('id, code, company, name, commission_rate, status, custom_fields')
        .eq('organization_id', auth.organizationId)
        .eq('code', code.toUpperCase())
        .single();

      if (error || !agent) {
        return apiError(`Agent code "${code}" not found`, 404);
      }

      if (agent.status !== 'active') {
        return apiError(`Agent code "${code}" is not active`, 400);
      }

      const cf = (agent.custom_fields as Record<string, unknown>) ?? {};
      const labels = (cf['__labels__'] as Record<string, string>) ?? {};
      const customFields = Object.entries(cf)
        .filter(([k]) => k !== '__labels__')
        .map(([k, v]) => ({ key: k, label: labels[k] || k, value: String(v ?? '') }));

      const response = apiSuccess(
        {
          id: agent.id,
          code: agent.code,
          company: agent.company,
          name: agent.name,
          commissionRate: Number(agent.commission_rate),
          customFields,
        },
        undefined,
        auth.rateLimit
      );
      Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
      return response;
    }

    // 一覧取得（active のみ）
    let query = supabase
      .from('agents')
      .select('id, code, company, name, commission_rate, joined_at, custom_fields', { count: 'exact' })
      .eq('organization_id', auth.organizationId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false });

    if (search) {
      query = query.or(`company.ilike.%${search}%,code.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const startIndex = (page - 1) * limit;
    query = query.range(startIndex, startIndex + limit - 1);

    const { data: agents, error, count } = await query;

    if (error) {
      console.error('Error fetching agents:', error);
      return apiError('Failed to fetch agents', 500);
    }

    const result = (agents || []).map(a => {
      const cf = (a.custom_fields as Record<string, unknown>) ?? {};
      const labels = (cf['__labels__'] as Record<string, string>) ?? {};
      const customFields = Object.entries(cf)
        .filter(([k]) => k !== '__labels__')
        .map(([k, v]) => ({ key: k, label: labels[k] || k, value: String(v ?? '') }));
      return {
        id: a.id,
        code: a.code,
        company: a.company,
        name: a.name,
        commissionRate: Number(a.commission_rate),
        joinedAt: a.joined_at,
        customFields,
      };
    });

    const response = apiSuccessPaginated(result, page, limit, count || 0, auth.rateLimit);
    Object.entries(corsHeaders()).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  });
}

// OPTIONS /api/v1/agents - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

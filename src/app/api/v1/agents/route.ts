import { NextRequest } from 'next/server';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  apiSuccessPaginated,
  handleOptions,
  withApiLogging,
  getServiceSupabase,
  CACHE_PROFILES,
} from '@/lib/api/auth';
import { getCached, setCached, orgCacheKey, MEMORY_TTL } from '@/lib/api/memory-cache';

function formatAgentCustomFields(cfRaw: Record<string, unknown> | null | undefined) {
  const cf = cfRaw ?? {};
  const labels = (cf['__labels__'] as Record<string, string>) ?? {};
  const meta = (cf['__meta__'] as Record<string, { type?: string; options?: string[] }>) ?? {};
  return Object.entries(cf)
    .filter(([k]) => k !== '__labels__' && k !== '__meta__')
    .map(([k, v]) => ({
      key: k,
      label: labels[k] || k,
      value: String(v ?? ''),
      type: meta[k]?.type || 'text',
      options: meta[k]?.options || [],
    }));
}

function formatAgentRow(a: {
  id: string;
  code: string;
  company: string | null;
  name: string;
  commission_rate: number | string;
  joined_at?: string | null;
  custom_fields?: unknown;
}) {
  return {
    id: a.id,
    code: a.code,
    company: a.company,
    name: a.name,
    commissionRate: Number(a.commission_rate),
    ...(a.joined_at !== undefined && { joinedAt: a.joined_at }),
    customFields: formatAgentCustomFields(a.custom_fields as Record<string, unknown>),
  };
}

// GET /api/v1/agents - 代理店一覧 / コードで検索
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabase = getServiceSupabase();
    const orgId = auth.organizationId!;
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    if (code) {
      const cacheKey = orgCacheKey(orgId, 'agent-code', code.toUpperCase());
      const cached = getCached<ReturnType<typeof formatAgentRow>>(cacheKey);
      if (cached) {
        return apiSuccess(cached, undefined, auth.rateLimit, CACHE_PROFILES.master);
      }

      const { data: agent, error } = await supabase
        .from('agents')
        .select('id, code, company, name, commission_rate, status, custom_fields')
        .eq('organization_id', orgId)
        .eq('code', code.toUpperCase())
        .single();

      if (error || !agent) {
        return apiError(`Agent code "${code}" not found`, 404);
      }
      if (agent.status !== 'active') {
        return apiError(`Agent code "${code}" is not active`, 400);
      }

      const formatted = formatAgentRow(agent);
      setCached(cacheKey, formatted, MEMORY_TTL.master);
      return apiSuccess(formatted, undefined, auth.rateLimit, CACHE_PROFILES.master);
    }

    if (!search) {
      const listKey = orgCacheKey(orgId, 'agents-active');
      let allAgents = getCached<ReturnType<typeof formatAgentRow>[]>(listKey);

      if (!allAgents) {
        const { data: agents, error } = await supabase
          .from('agents')
          .select('id, code, company, name, commission_rate, joined_at, custom_fields')
          .eq('organization_id', orgId)
          .eq('status', 'active')
          .order('joined_at', { ascending: false });

        if (error) {
          console.error('Error fetching agents:', error);
          return apiError('Failed to fetch agents', 500);
        }

        allAgents = (agents || []).map(formatAgentRow);
        setCached(listKey, allAgents, MEMORY_TTL.master);
      }

      const startIndex = (page - 1) * limit;
      const slice = allAgents.slice(startIndex, startIndex + limit);
      return apiSuccessPaginated(
        slice,
        page,
        limit,
        allAgents.length,
        auth.rateLimit,
        CACHE_PROFILES.master,
      );
    }

    let query = supabase
      .from('agents')
      .select('id, code, company, name, commission_rate, joined_at, custom_fields', { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })
      .or(`company.ilike.%${search}%,code.ilike.%${search}%,name.ilike.%${search}%`);

    const startIndex = (page - 1) * limit;
    query = query.range(startIndex, startIndex + limit - 1);

    const { data: agents, error, count } = await query;
    if (error) {
      console.error('Error fetching agents:', error);
      return apiError('Failed to fetch agents', 500);
    }

    return apiSuccessPaginated(
      (agents || []).map(formatAgentRow),
      page,
      limit,
      count || 0,
      auth.rateLimit,
      CACHE_PROFILES.master,
    );
  });
}

export async function OPTIONS() {
  return handleOptions();
}

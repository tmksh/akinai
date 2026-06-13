import { NextRequest } from 'next/server';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  withApiLogging,
  getServiceSupabase,
  CACHE_PROFILES,
} from '@/lib/api/auth';
import { generateWebhookSecret } from '@/lib/webhooks/sender';
import { getAllEventTypes } from '@/lib/webhooks/events';

const VALID_EVENTS = new Set<string>(getAllEventTypes());

type WebhookRow = Record<string, unknown>;

/** secret はマスクして公開（一覧では末尾4桁のみ） */
function publicWebhook(w: WebhookRow, opts?: { includeSecret?: boolean }) {
  const secret = typeof w.secret === 'string' ? w.secret : null;
  return {
    id: w.id,
    name: w.name,
    url: w.url,
    events: w.events,
    isActive: w.is_active,
    retryCount: w.retry_count,
    timeoutMs: w.timeout_ms,
    ...(opts?.includeSecret
      ? { secret }
      : { secretLast4: secret ? secret.slice(-4) : null }),
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

// GET /api/v1/webhooks - 自組織の Webhook 一覧（secret は伏せる）
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('webhooks')
      .select('id, name, url, events, is_active, retry_count, timeout_ms, secret, created_at, updated_at')
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing webhooks:', error);
      return apiError('Failed to fetch webhooks', 500);
    }

    const webhooks = (data || []).map((w) => publicWebhook(w as WebhookRow));
    return apiSuccess(webhooks, undefined, auth.rateLimit, CACHE_PROFILES.realtime);
  });
}

// POST /api/v1/webhooks - Webhook を登録（secret は作成時に 1 回だけ返す）
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabase = getServiceSupabase();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const events = Array.isArray(body.events) ? (body.events as unknown[]) : null;

    if (!name || !url || !events || events.length === 0) {
      return apiError('name, url, and events[] are required', 400);
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return apiError('url must be a valid URL', 400);
    }
    if (parsedUrl.protocol !== 'https:') {
      return apiError('url must use https', 400);
    }

    const invalidEvents = events.filter(
      (e) => typeof e !== 'string' || !VALID_EVENTS.has(e),
    );
    if (invalidEvents.length > 0) {
      return apiError(
        `Invalid events: ${invalidEvents.join(', ')}. Allowed: ${[...VALID_EVENTS].join(', ')}`,
        400,
      );
    }

    const retryCount =
      typeof body.retry_count === 'number' && Number.isInteger(body.retry_count)
        ? Math.min(Math.max(body.retry_count, 1), 5)
        : 3;
    const timeoutMs =
      typeof body.timeout_ms === 'number' && Number.isInteger(body.timeout_ms)
        ? Math.min(Math.max(body.timeout_ms, 1000), 30000)
        : 30000;

    const secret = generateWebhookSecret();

    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        organization_id: auth.organizationId,
        name,
        url,
        secret,
        events: events as string[],
        retry_count: retryCount,
        timeout_ms: timeoutMs,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating webhook:', error);
      return apiError(`Failed to create webhook: ${error.message}`, 500);
    }

    return apiSuccess(
      publicWebhook(data as WebhookRow, { includeSecret: true }),
      { note: 'secret is returned only once. Store it securely for signature verification.' },
      auth.rateLimit,
    );
  });
}

// OPTIONS /api/v1/webhooks - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

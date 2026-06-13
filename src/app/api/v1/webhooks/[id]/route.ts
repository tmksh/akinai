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
import { getAllEventTypes } from '@/lib/webhooks/events';

const VALID_EVENTS = new Set<string>(getAllEventTypes());

type WebhookRow = Record<string, unknown>;

function publicWebhook(w: WebhookRow) {
  const secret = typeof w.secret === 'string' ? w.secret : null;
  return {
    id: w.id,
    name: w.name,
    url: w.url,
    events: w.events,
    isActive: w.is_active,
    retryCount: w.retry_count,
    timeoutMs: w.timeout_ms,
    secretLast4: secret ? secret.slice(-4) : null,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
}

// GET /api/v1/webhooks/[id] - 単一 Webhook（secret は伏せる）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabase = getServiceSupabase();
    const { id } = await params;

    const { data, error } = await supabase
      .from('webhooks')
      .select('id, name, url, events, is_active, retry_count, timeout_ms, secret, created_at, updated_at')
      .eq('organization_id', auth.organizationId)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching webhook:', error);
      return apiError('Failed to fetch webhook', 500);
    }
    if (!data) {
      return apiError('Webhook not found', 404);
    }

    return apiSuccess(publicWebhook(data as WebhookRow), undefined, auth.rateLimit, CACHE_PROFILES.realtime);
  });
}

// PATCH /api/v1/webhooks/[id] - URL / イベント / 有効状態などを更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabase = getServiceSupabase();
    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return apiError('Invalid JSON body', 400);
    }

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return apiError('name must be a non-empty string', 400);
      }
      updateData.name = body.name.trim();
    }

    if (body.url !== undefined) {
      if (typeof body.url !== 'string') {
        return apiError('url must be a string', 400);
      }
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(body.url.trim());
      } catch {
        return apiError('url must be a valid URL', 400);
      }
      if (parsedUrl.protocol !== 'https:') {
        return apiError('url must use https', 400);
      }
      updateData.url = body.url.trim();
    }

    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || body.events.length === 0) {
        return apiError('events must be a non-empty array', 400);
      }
      const invalidEvents = (body.events as unknown[]).filter(
        (e) => typeof e !== 'string' || !VALID_EVENTS.has(e),
      );
      if (invalidEvents.length > 0) {
        return apiError(
          `Invalid events: ${invalidEvents.join(', ')}. Allowed: ${[...VALID_EVENTS].join(', ')}`,
          400,
        );
      }
      updateData.events = body.events as string[];
    }

    if (body.is_active !== undefined) {
      if (typeof body.is_active !== 'boolean') {
        return apiError('is_active must be a boolean', 400);
      }
      updateData.is_active = body.is_active;
    }

    if (body.retry_count !== undefined) {
      if (typeof body.retry_count !== 'number' || !Number.isInteger(body.retry_count)) {
        return apiError('retry_count must be an integer', 400);
      }
      updateData.retry_count = Math.min(Math.max(body.retry_count, 1), 5);
    }

    if (body.timeout_ms !== undefined) {
      if (typeof body.timeout_ms !== 'number' || !Number.isInteger(body.timeout_ms)) {
        return apiError('timeout_ms must be an integer', 400);
      }
      updateData.timeout_ms = Math.min(Math.max(body.timeout_ms, 1000), 30000);
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('No updatable fields provided', 400);
    }

    const { data, error } = await supabase
      .from('webhooks')
      .update(updateData)
      .eq('organization_id', auth.organizationId)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating webhook:', error);
      return apiError(`Failed to update webhook: ${error.message}`, 500);
    }
    if (!data) {
      return apiError('Webhook not found', 404);
    }

    return apiSuccess(publicWebhook(data as WebhookRow), undefined, auth.rateLimit);
  });
}

// DELETE /api/v1/webhooks/[id] - Webhook を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(request);
  if (!auth.success) {
    return apiError(auth.error!, auth.status, auth.rateLimit);
  }

  return withApiLogging(request, auth, async () => {
    const supabase = getServiceSupabase();
    const { id } = await params;

    const { data, error } = await supabase
      .from('webhooks')
      .delete()
      .eq('organization_id', auth.organizationId)
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error deleting webhook:', error);
      return apiError(`Failed to delete webhook: ${error.message}`, 500);
    }
    if (!data) {
      return apiError('Webhook not found', 404);
    }

    return apiSuccess({ id, deleted: true }, undefined, auth.rateLimit);
  });
}

// OPTIONS /api/v1/webhooks/[id] - CORS preflight
export async function OPTIONS() {
  return handleOptions();
}

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  withApiLogging,
} from '@/lib/api/auth';

export function OPTIONS() {
  return handleOptions();
}

/**
 * GET /api/v1/notifications?customerId=xxx
 * 会員の通知一覧を取得する（通知BOX機能）
 *
 * Query:
 *   customerId  string   (必須) 対象会員ID
 *   unreadOnly  boolean  未読のみ取得（デフォルト: false）
 *   page        number   ページ番号（デフォルト: 1）
 *   limit       number   取得件数（デフォルト: 20, 最大: 100）
 */
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  return withApiLogging(request, auth, async () => {
    if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
    const offset = (page - 1) * limit;

    if (!customerId) return apiError('customerId is required', 400);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 機能フラグチェック
    const { data: org } = await supabase
      .from('organizations')
      .select('features')
      .eq('id', auth.organizationId!)
      .single();

    const features = (org?.features as Record<string, unknown>) || {};
    if (!features.notification_box) {
      return apiError('notification_box feature is not enabled for this organization', 403);
    }

    let query = supabase
      .from('notifications')
      .select('id, type, title, body, related_id, related_type, is_read, created_at', { count: 'exact' })
      .eq('organization_id', auth.organizationId!)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error, count } = await query;

    if (error) return apiError('Failed to fetch notifications', 500);

    // 未読数も返す
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', auth.organizationId!)
      .eq('customer_id', customerId)
      .eq('is_read', false);

    return apiSuccess({
      data: data || [],
      meta: {
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasMore: page * limit < (count || 0),
        },
        unreadCount: unreadCount || 0,
        timestamp: new Date().toISOString(),
      },
    });
  });
}

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
 * PUT /api/v1/notifications/:id/read
 * 通知を既読にする
 *
 * Body: なし（id は URL パラメータ）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiKey(request);
  return withApiLogging(request, auth, async () => {
    if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

    const { id } = await params;
    if (!id) return apiError('notification id is required', 400);

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

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('organization_id', auth.organizationId!)
      .select('id, is_read')
      .single();

    if (error || !data) return apiError('Notification not found or failed to update', 404);

    return apiSuccess({ id: data.id, isRead: data.is_read });
  });
}

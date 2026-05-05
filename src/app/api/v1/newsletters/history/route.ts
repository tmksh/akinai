/**
 * GET /api/v1/newsletters/history
 *
 * メルマガ送信履歴を取得する。
 *
 * クエリパラメータ:
 *   supplierId  string  （任意）サプライヤーIDで絞り込み
 *   status      string  （任意）pending / sent / partial / failed で絞り込み
 *   page        number  （任意）ページ番号（1始まり、デフォルト: 1）
 *   limit       number  （任意）1ページあたりの件数（デフォルト: 20、最大: 100）
 */
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccessPaginated,
  handleOptions,
  withApiLogging,
} from '@/lib/api/auth';

export function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  return withApiLogging(request, auth, async () => {
    if (!auth.success) {
      return apiError(auth.error || 'Unauthorized', auth.status || 401);
    }

    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const validStatuses = ['pending', 'sent', 'partial', 'failed'];
    if (status && !validStatuses.includes(status)) {
      return apiError(`status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let query = supabase
      .from('newsletter_sends')
      .select(
        `
        id,
        supplier_id,
        subject,
        body,
        sent_count,
        status,
        sent_at,
        created_at,
        supplier:customers!newsletter_sends_supplier_id_fkey(id, name)
      `,
        { count: 'exact' }
      )
      .eq('organization_id', auth.organizationId!)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (supplierId) query = query.eq('supplier_id', supplierId);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch newsletter history:', error);
      return apiError('Failed to fetch newsletter history', 500);
    }

    return apiSuccessPaginated(data ?? [], page, limit, count ?? 0, auth.rateLimit);
  });
}

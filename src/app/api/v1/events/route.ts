import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateApiKey,
  apiError,
  apiSuccess,
  handleOptions,
  withApiLogging,
} from '@/lib/api/auth';
import { sendEmail } from '@/lib/email';

export function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/v1/events
 * バイヤーがイベント告知を作成 → 条件に合うサプライヤーへ通知メール
 *
 * Body:
 *   buyerId      string    (任意) 告知するバイヤーの顧客ID
 *   title        string    イベントタイトル
 *   date         string    開催日 (ISO date)
 *   venue        string    会場
 *   body         string    内容
 *   genres       string[]  対象ジャンル（空=全て）
 *   regions      string[]  対象地域（空=全て）
 */
export async function POST(request: NextRequest) {
  return withApiLogging(request, 'POST /api/v1/events', async () => {
    const auth = await validateApiKey(request);
    if (!auth.success) return apiError(auth.error || 'Unauthorized', auth.status || 401);

    const body = await request.json().catch(() => null);
    if (!body) return apiError('Invalid JSON body', 400);

    const {
      buyerId,
      title,
      date,
      venue,
      body: eventBody,
      genres = [],
      regions = [],
    } = body as {
      buyerId?: string;
      title?: string;
      date?: string;
      venue?: string;
      body?: string;
      genres?: string[];
      regions?: string[];
    };

    if (!title) return apiError('title is required', 400);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // バイヤー確認
    if (buyerId) {
      const { data: buyer } = await supabase
        .from('customers')
        .select('id, role')
        .eq('id', buyerId)
        .eq('organization_id', auth.organizationId!)
        .single();
      if (!buyer) return apiError('Buyer not found', 404);
    }

    // イベント保存
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .insert({
        organization_id: auth.organizationId!,
        buyer_id: buyerId || null,
        title,
        event_date: date || null,
        venue: venue || null,
        body: eventBody || '',
        genres: genres || [],
        regions: regions || [],
        status: 'published',
      })
      .select()
      .single();

    if (eventErr || !event) return apiError('Failed to create event', 500);

    // 条件に合うサプライヤーを取得
    let suppliersQuery = supabase
      .from('customers')
      .select('id, email, name, metadata')
      .eq('organization_id', auth.organizationId!)
      .eq('role', 'supplier')
      .eq('status', 'active')
      .not('email', 'is', null);

    const { data: suppliers } = await suppliersQuery;

    // ジャンル・地域フィルタ（metadata.genres / metadata.regions で判定）
    const filteredSuppliers = (suppliers || []).filter((s) => {
      const meta = (s.metadata as Record<string, unknown>) || {};
      const sGenres = (meta.genres as string[]) || [];
      const sRegions = (meta.regions as string[]) || (meta.prefecture ? [meta.prefecture as string] : []);

      const genreMatch = genres.length === 0 || genres.some((g) => sGenres.includes(g));
      const regionMatch = regions.length === 0 || regions.some((r) => sRegions.includes(r));

      return genreMatch && regionMatch;
    });

    // メール通知
    let notifiedCount = 0;
    const dateStr = date ? new Date(date).toLocaleDateString('ja-JP') : '未定';

    for (const supplier of filteredSuppliers) {
      const html = `
        <h2>【バイヤーからのイベント出展募集】${title}</h2>
        <p><strong>開催日：</strong>${dateStr}</p>
        ${venue ? `<p><strong>会場：</strong>${venue}</p>` : ''}
        <hr>
        <div>${(eventBody || '').replace(/\n/g, '<br>')}</div>
      `;
      const { success } = await sendEmail({
        to: supplier.email!,
        subject: `【出展募集】${title}`,
        html,
        organizationId: auth.organizationId!,
      });
      if (success) notifiedCount++;
    }

    // 通知数を更新
    await supabase
      .from('events')
      .update({ notified_count: notifiedCount })
      .eq('id', event.id);

    return apiSuccess({
      id: event.id,
      title: event.title,
      notifiedCount,
      totalSuppliers: (suppliers || []).length,
      filteredSuppliers: filteredSuppliers.length,
    }, 'Event created and notifications sent', 201);
  });
}

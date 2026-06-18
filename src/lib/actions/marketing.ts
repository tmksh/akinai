'use server';

import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

// ─── アナリティクス ───────────────────────────────────────
export type AnalyticsPeriod = 'week' | 'month' | 'year';

export async function getAnalyticsOverview(
  organizationId: string,
  productId?: string,
  period: AnalyticsPeriod = 'month',
) {
  const supabase = await createClient();

  const now = new Date();

  // period に応じた集計開始日とバケット生成
  let since: string;
  let buckets: { key: string; label: string; views: number; clicks: number }[];

  // toISOString() はUTC変換するためタイムゾーン依存でキーがズレる。
  // ローカル年月日から直接文字列を生成する。
  const localYM = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const localYMD = (d: Date) =>
    `${localYM(d)}-${String(d.getDate()).padStart(2, '0')}`;

  if (period === 'week') {
    // 直近7日間（今日を含む）
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    since = new Date(start).toISOString();
    buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = localYMD(d);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return { key, label: `${mm}/${dd}`, views: 0, clicks: 0 };
    });
  } else if (period === 'year') {
    // 直近12ヶ月（今月を含む）
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    since = new Date(start).toISOString();
    buckets = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = localYM(d);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return { key, label: `${mm}月`, views: 0, clicks: 0 };
    });
  } else {
    // month: 直近6ヶ月（今月を含む）
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    since = new Date(start).toISOString();
    buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = localYM(d);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return { key, label: `${mm}月`, views: 0, clicks: 0 };
    });
  }

  const bucketMap = new Map(buckets.map(b => [b.key, b]));

  const buildViewsCount = () => {
    let q = supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).gte('viewed_at', since);
    if (productId) q = q.eq('product_id', productId);
    return q;
  };
  const buildClicksCount = () => {
    let q = supabase.from('product_clicks').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).gte('clicked_at', since);
    if (productId) q = q.eq('product_id', productId);
    return q;
  };
  const buildBucketViews = () => {
    let q = supabase.from('page_views').select('viewed_at').eq('organization_id', organizationId).gte('viewed_at', since).limit(10000);
    if (productId) q = q.eq('product_id', productId);
    return q;
  };
  const buildBucketClicks = () => {
    let q = supabase.from('product_clicks').select('clicked_at').eq('organization_id', organizationId).gte('clicked_at', since).limit(10000);
    if (productId) q = q.eq('product_id', productId);
    return q;
  };

  const [{ count: totalViews }, { count: totalClicks }, { data: bucketViews }, { data: bucketClicks }, { data: topProducts }, { data: topClicks }] = await Promise.all([
    buildViewsCount(),
    buildClicksCount(),
    buildBucketViews(),
    buildBucketClicks(),
    supabase.from('page_views').select('product_id, session_id, products!inner(id, name)').eq('organization_id', organizationId).gte('viewed_at', since).not('product_id', 'is', null).limit(2000),
    supabase.from('product_clicks').select('product_id, session_id, products!inner(id, name)').eq('organization_id', organizationId).gte('clicked_at', since).not('product_id', 'is', null).limit(2000),
  ]);

  // バケット集計
  // DBのタイムスタンプ（UTC文字列）をローカル時刻のキーに変換してバケットに集計
  const utcToLocalKey = (utcStr: string): string => {
    const d = new Date(utcStr);
    return period === 'week' ? localYMD(d) : localYM(d);
  };
  for (const v of bucketViews || []) {
    const k = utcToLocalKey(v.viewed_at as string);
    const b = bucketMap.get(k);
    if (b) b.views++;
  }
  for (const c of bucketClicks || []) {
    const k = utcToLocalKey(c.clicked_at as string);
    const b = bucketMap.get(k);
    if (b) b.clicks++;
  }

  // 商品ランキング（同一セッションの重複を除去してカウント）
  const productMap = new Map<string, { name: string; views: number; clicks: number }>();
  const viewSessionSeen = new Set<string>();
  for (const pv of topProducts || []) {
    const pid = pv.product_id as string;
    const sid = (pv as unknown as { session_id?: string | null }).session_id;
    const product = ((pv as unknown) as { products: { id: string; name: string } }).products;
    if (!product) continue;
    // session_id がある場合は同一セッションの重複閲覧を除去
    if (sid) {
      const key = `${pid}:${sid}`;
      if (viewSessionSeen.has(key)) continue;
      viewSessionSeen.add(key);
    }
    const e = productMap.get(pid);
    if (e) e.views++;
    else productMap.set(pid, { name: product.name, views: 1, clicks: 0 });
  }
  const clickSessionSeen = new Set<string>();
  for (const pc of topClicks || []) {
    const pid = pc.product_id as string;
    const sid = (pc as unknown as { session_id?: string | null }).session_id;
    const product = ((pc as unknown) as { products: { id: string; name: string } }).products;
    if (!product) continue;
    // session_id がある場合は同一セッションの重複クリックを除去
    if (sid) {
      const key = `${pid}:${sid}`;
      if (clickSessionSeen.has(key)) continue;
      clickSessionSeen.add(key);
    }
    const e = productMap.get(pid);
    if (e) e.clicks++;
    else productMap.set(pid, { name: product.name, views: 0, clicks: 1 });
  }
  const productRanking = Array.from(productMap.entries())
    .map(([id, d]) => ({ id, ...d }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return {
    totalViews: totalViews ?? 0,
    totalClicks: totalClicks ?? 0,
    buckets,
    productRanking,
  };
}

// ─── メルマガ履歴 ─────────────────────────────────────────
export async function getNewsletterHistory(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('newsletter_sends')
    .select('id, subject, sent_count, status, sent_at, created_at, supplier:customers!newsletter_sends_supplier_id_fkey(id, name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function deleteNewsletterSend(
  organizationId: string,
  newsletterId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('newsletter_sends')
    .delete()
    .eq('id', newsletterId)
    .eq('organization_id', organizationId);
  if (error) return { error: error.message };
  return { error: null };
}

// ─── メッセージ ───────────────────────────────────────────
export async function getSentMessages(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('messages')
    .select('id, subject, body, target, created_at, from_customer:customers!messages_from_customer_id_fkey(id, name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

// ─── イベント ─────────────────────────────────────────────
export async function getEvents(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select('id, title, event_date, venue, genres, regions, notified_count, status, created_at, buyer:customers!events_buyer_id_fkey(id, name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function createEvent(organizationId: string, input: {
  title: string;
  event_date?: string;
  venue?: string;
  body?: string;
  genres: string[];
  regions: string[];
  buyer_id?: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('events')
    .insert({ ...input, organization_id: organizationId, status: 'draft' })
    .select()
    .single();
  return { data, error: error?.message || null };
}

// ─── メルマガ送信（管理画面から） ────────────────────────
export async function sendNewsletter(organizationId: string, input: {
  supplierId?: string;
  subject: string;
  body: string;
}): Promise<{ data: { sentCount: number; totalRecipients: number } | null; error: string | null }> {
  const supabase = await createClient();

  let supplierId = input.supplierId || null;

  // お気に入り登録者（有効会員）を取得
  let query = supabase
    .from('product_favorites')
    .select('customer_id, customers!inner(id, email, name, status)')
    .eq('organization_id', organizationId);

  if (supplierId) {
    const { data: pids } = await supabase
      .from('products')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('supplier_id', supplierId);
    if (pids && pids.length > 0) {
      query = query.in('product_id', pids.map(p => p.id));
    }
  }

  const { data: favorites } = await query;

  const recipientMap = new Map<string, { email: string; name: string }>();
  for (const fav of favorites || []) {
    const c = ((fav as unknown) as { customers: { id: string; email: string; name: string; status: string } }).customers;
    if (c?.email && c.status === 'active') recipientMap.set(c.id, { email: c.email, name: c.name });
  }
  const recipients = Array.from(recipientMap.values());

  // 送信履歴作成
  const { data: record, error: insertErr } = await supabase
    .from('newsletter_sends')
    .insert({
      organization_id: organizationId,
      supplier_id: supplierId,
      subject: input.subject,
      body: input.body,
      sent_count: 0,
      status: 'pending',
    })
    .select()
    .single();

  if (insertErr || !record) return { data: null, error: insertErr?.message || 'Failed to create record' };

  const html = `<div>${input.body.replace(/\n/g, '<br>')}</div>`;
  let sentCount = 0;
  for (const r of recipients) {
    const { success } = await sendEmail({ to: r.email, subject: input.subject, html, organizationId });
    if (success) sentCount++;
  }

  await supabase.from('newsletter_sends').update({
    sent_count: sentCount,
    status: sentCount === recipients.length ? 'sent' : sentCount > 0 ? 'partial' : 'failed',
    sent_at: new Date().toISOString(),
  }).eq('id', record.id);

  return { data: { sentCount, totalRecipients: recipients.length }, error: null };
}

// ─── メッセージ送信（管理画面から） ──────────────────────
export async function sendMessage(organizationId: string, input: {
  fromCustomerId?: string;
  target: 'all' | 'buyer' | 'customer';
  toCustomerId?: string;
  subject: string;
  body: string;
}): Promise<{ data: { sentCount: number } | null; error: string | null }> {
  const supabase = await createClient();

  let recipients: { id: string; email: string; name: string }[] = [];
  if (input.target === 'all' || input.target === 'buyer') {
    const { data } = await supabase
      .from('customers')
      .select('id, email, name')
      .eq('organization_id', organizationId)
      .eq('role', 'buyer')
      .eq('status', 'active')
      .not('email', 'is', null);
    recipients = (data || []) as typeof recipients;
  } else if (input.target === 'customer' && input.toCustomerId) {
    const { data } = await supabase
      .from('customers')
      .select('id, email, name')
      .eq('id', input.toCustomerId)
      .eq('organization_id', organizationId)
      .single();
    if (!data) return { data: null, error: 'Recipient not found' };
    recipients = [data as typeof recipients[0]];
  }

  const html = `<div>${input.body.replace(/\n/g, '<br>')}</div>`;
  const inserts = recipients.map(r => ({
    organization_id: organizationId,
    from_customer_id: input.fromCustomerId || null,
    to_customer_id: r.id,
    target: input.target,
    subject: input.subject,
    body: input.body,
  }));

  await supabase.from('messages').insert(inserts);

  let sentCount = 0;
  for (const r of recipients) {
    const { success } = await sendEmail({ to: r.email, subject: input.subject, html, organizationId });
    if (success) sentCount++;
  }

  return { data: { sentCount }, error: null };
}

// ─── イベント作成＆通知（管理画面から） ──────────────────
export async function publishEvent(organizationId: string, input: {
  buyerId?: string;
  title: string;
  event_date?: string;
  venue?: string;
  body?: string;
  genres: string[];
  regions: string[];
}): Promise<{ data: { id: string; notifiedCount: number } | null; error: string | null }> {
  const supabase = await createClient();

  const { data: event, error: eventErr } = await supabase
    .from('events')
    .insert({
      organization_id: organizationId,
      buyer_id: input.buyerId || null,
      title: input.title,
      event_date: input.event_date || null,
      venue: input.venue || null,
      body: input.body || '',
      genres: input.genres,
      regions: input.regions,
      status: 'published',
    })
    .select()
    .single();

  if (eventErr || !event) return { data: null, error: eventErr?.message || 'Failed to create event' };

  // 条件に合うサプライヤーへ通知
  const { data: suppliers } = await supabase
    .from('customers')
    .select('id, email, name, metadata')
    .eq('organization_id', organizationId)
    .eq('role', 'supplier')
    .eq('status', 'active')
    .not('email', 'is', null);

  const filtered = (suppliers || []).filter(s => {
    const meta = (s.metadata as Record<string, unknown>) || {};
    const sGenres = (meta.genres as string[]) || [];
    const sRegions = (meta.regions as string[]) || (meta.prefecture ? [meta.prefecture as string] : []);
    const genreMatch = input.genres.length === 0 || input.genres.some(g => sGenres.includes(g));
    const regionMatch = input.regions.length === 0 || input.regions.some(r => sRegions.includes(r));
    return genreMatch && regionMatch;
  });

  let notifiedCount = 0;
  const dateStr = input.event_date ? new Date(input.event_date).toLocaleDateString('ja-JP') : '未定';
  for (const s of filtered) {
    const html = `<h2>【出展募集】${input.title}</h2><p>開催日: ${dateStr}</p>${input.venue ? `<p>会場: ${input.venue}</p>` : ''}<hr><div>${(input.body || '').replace(/\n/g, '<br>')}</div>`;
    const { success } = await sendEmail({ to: s.email!, subject: `【出展募集】${input.title}`, html, organizationId });
    if (success) notifiedCount++;
  }

  await supabase.from('events').update({ notified_count: notifiedCount }).eq('id', event.id);

  return { data: { id: event.id, notifiedCount }, error: null };
}

// ─── アナリティクス用商品一覧 ──────────────────────────────
export async function getProductsForAnalytics(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('name')
    .limit(200);
  return (data || []) as { id: string; name: string }[];
}

// ─── 顧客一覧（フォーム選択用） ──────────────────────────
export async function getCustomersForSelect(organizationId: string, role?: string) {
  const supabase = await createClient();
  let q = supabase
    .from('customers')
    .select('id, name, email, role')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('name');
  if (role) q = q.eq('role', role);
  const { data } = await q;
  return data || [];
}

// ─── 1対1メッセージ（問い合わせ）スレッド一覧 ──────────────
// 運営側モニタリング用。組織配下のすべてのスレッドを参照できる。
export interface InquiryThreadListItem {
  id: string;
  subject: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  initiator: { id: string; name: string; role: string } | null;
  recipient: { id: string; name: string; role: string } | null;
  product: { id: string; name: string; slug: string } | null;
  messageCount: number;
}

export async function getInquiryThreads(
  organizationId: string,
  filters?: {
    status?: 'open' | 'closed';
    productId?: string;
    customerId?: string;
    keyword?: string;
    limit?: number;
  }
): Promise<InquiryThreadListItem[]> {
  const supabase = await createClient();
  const limit = Math.min(200, Math.max(1, filters?.limit ?? 100));

  let q = supabase
    .from('inquiry_threads')
    .select(
      'id, subject, status, created_at, updated_at, last_message_at, last_message_preview, ' +
        'initiator:customers!inquiry_threads_initiator_customer_id_fkey(id, name, role), ' +
        'recipient:customers!inquiry_threads_recipient_customer_id_fkey(id, name, role), ' +
        'product:products!inquiry_threads_product_id_fkey(id, name, slug)'
    )
    .eq('organization_id', organizationId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.productId) q = q.eq('product_id', filters.productId);
  if (filters?.customerId) {
    q = q.or(
      `initiator_customer_id.eq.${filters.customerId},recipient_customer_id.eq.${filters.customerId}`
    );
  }
  if (filters?.keyword?.trim()) {
    const kw = filters.keyword.trim().replace(/[%]/g, '\\%');
    q = q.or(`subject.ilike.%${kw}%,last_message_preview.ilike.%${kw}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error('Failed to fetch inquiry threads:', error);
    return [];
  }

  // メッセージ件数を一括取得
  const threadIds = (data || []).map((row) => (row as unknown as { id: string }).id);
  let countsMap = new Map<string, number>();
  if (threadIds.length > 0) {
    const { data: msgRows } = await supabase
      .from('inquiry_messages')
      .select('thread_id')
      .in('thread_id', threadIds);
    countsMap = (msgRows || []).reduce<Map<string, number>>((acc, row) => {
      const tid = (row as unknown as { thread_id: string }).thread_id;
      acc.set(tid, (acc.get(tid) ?? 0) + 1);
      return acc;
    }, new Map());
  }

  return (data || []).map((row) => {
    const r = row as unknown as {
      id: string;
      subject: string;
      status: 'open' | 'closed';
      created_at: string;
      updated_at: string;
      last_message_at: string | null;
      last_message_preview: string | null;
      initiator: { id: string; name: string; role: string } | null;
      recipient: { id: string; name: string; role: string } | null;
      product: { id: string; name: string; slug: string } | null;
    };
    return {
      id: r.id,
      subject: r.subject,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      lastMessageAt: r.last_message_at,
      lastMessagePreview: r.last_message_preview,
      initiator: r.initiator,
      recipient: r.recipient,
      product: r.product,
      messageCount: countsMap.get(r.id) ?? 0,
    };
  });
}

// ─── 1対1メッセージ：スレッド詳細（運営閲覧用） ──────────────
export interface InquiryMessageItem {
  id: string;
  fromCustomerId: string;
  body: string;
  attachments: { url: string; name: string; size: number; mimeType: string }[];
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface InquiryThreadDetail {
  thread: InquiryThreadListItem;
  messages: InquiryMessageItem[];
}

export async function getInquiryThreadDetail(
  organizationId: string,
  threadId: string
): Promise<InquiryThreadDetail | null> {
  const supabase = await createClient();

  const { data: threadRow, error: threadError } = await supabase
    .from('inquiry_threads')
    .select(
      'id, subject, status, created_at, updated_at, last_message_at, last_message_preview, ' +
        'initiator:customers!inquiry_threads_initiator_customer_id_fkey(id, name, role), ' +
        'recipient:customers!inquiry_threads_recipient_customer_id_fkey(id, name, role), ' +
        'product:products!inquiry_threads_product_id_fkey(id, name, slug)'
    )
    .eq('id', threadId)
    .eq('organization_id', organizationId)
    .single();

  if (threadError || !threadRow) return null;
  const r = threadRow as unknown as {
    id: string;
    subject: string;
    status: 'open' | 'closed';
    created_at: string;
    updated_at: string;
    last_message_at: string | null;
    last_message_preview: string | null;
    initiator: { id: string; name: string; role: string } | null;
    recipient: { id: string; name: string; role: string } | null;
    product: { id: string; name: string; slug: string } | null;
  };

  const { data: messages } = await supabase
    .from('inquiry_messages')
    .select('id, from_customer_id, body, attachments, is_read, read_at, created_at')
    .eq('thread_id', threadId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  return {
    thread: {
      id: r.id,
      subject: r.subject,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      lastMessageAt: r.last_message_at,
      lastMessagePreview: r.last_message_preview,
      initiator: r.initiator,
      recipient: r.recipient,
      product: r.product,
      messageCount: messages?.length ?? 0,
    },
    messages: (messages || []).map((m) => {
      const msg = m as unknown as {
        id: string;
        from_customer_id: string;
        body: string;
        attachments: { url: string; name: string; size: number; mimeType: string }[] | null;
        is_read: boolean;
        read_at: string | null;
        created_at: string;
      };
      return {
        id: msg.id,
        fromCustomerId: msg.from_customer_id,
        body: msg.body,
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
        isRead: msg.is_read,
        readAt: msg.read_at,
        createdAt: msg.created_at,
      };
    }),
  };
}

// ─── 1対1メッセージ：スレッド削除（運営） ──────────────────
// スレッドを削除する。inquiry_messages は ON DELETE CASCADE で連動削除される。
export async function deleteInquiryThread(
  organizationId: string,
  threadId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('inquiry_threads')
    .delete()
    .eq('id', threadId)
    .eq('organization_id', organizationId);
  if (error) {
    console.error('Failed to delete inquiry thread:', error);
    return { error: error.message };
  }
  return { error: null };
}

'use server';

import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

// ─── アナリティクス ───────────────────────────────────────
export async function getAnalyticsOverview(organizationId: string, productId?: string) {
  const supabase = await createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);
  const since = sixMonthsAgo.toISOString();

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
  const buildMonthlyViews = () => {
    let q = supabase.from('page_views').select('viewed_at').eq('organization_id', organizationId).gte('viewed_at', since);
    if (productId) q = q.eq('product_id', productId);
    return q;
  };
  const buildMonthlyClicks = () => {
    let q = supabase.from('product_clicks').select('clicked_at').eq('organization_id', organizationId).gte('clicked_at', since);
    if (productId) q = q.eq('product_id', productId);
    return q;
  };

  const [{ count: totalViews }, { count: totalClicks }, { data: monthlyViews }, { data: monthlyClicks }, { data: topProducts }, { data: topClicks }] = await Promise.all([
    buildViewsCount(),
    buildClicksCount(),
    buildMonthlyViews(),
    buildMonthlyClicks(),
    supabase.from('page_views').select('product_id, products!inner(id, name)').eq('organization_id', organizationId).gte('viewed_at', since).not('product_id', 'is', null),
    supabase.from('product_clicks').select('product_id, click_type, products!inner(id, name)').eq('organization_id', organizationId).gte('clicked_at', since).not('product_id', 'is', null),
  ]);

  // 月別集計
  const monthMap = new Map<string, { views: number; clicks: number }>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthMap.set(d.toISOString().slice(0, 7), { views: 0, clicks: 0 });
  }
  for (const v of monthlyViews || []) {
    const m = (v.viewed_at as string).slice(0, 7);
    if (monthMap.has(m)) monthMap.get(m)!.views++;
  }
  for (const c of monthlyClicks || []) {
    const m = (c.clicked_at as string).slice(0, 7);
    if (monthMap.has(m)) monthMap.get(m)!.clicks++;
  }

  // 商品ランキング（閲覧）
  const productMap = new Map<string, { name: string; views: number; clicks: number }>();
  for (const pv of topProducts || []) {
    const pid = pv.product_id as string;
    const product = ((pv as unknown) as { products: { id: string; name: string } }).products;
    if (!product) continue;
    const e = productMap.get(pid);
    if (e) e.views++;
    else productMap.set(pid, { name: product.name, views: 1, clicks: 0 });
  }
  // 商品ランキング（クリック）
  for (const pc of topClicks || []) {
    const pid = pc.product_id as string;
    const product = ((pc as unknown) as { products: { id: string; name: string } }).products;
    if (!product) continue;
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
    monthly: Array.from(monthMap.entries()).map(([month, d]) => ({ month, ...d })),
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

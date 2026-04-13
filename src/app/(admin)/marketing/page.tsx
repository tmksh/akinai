'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  BarChart3, Mail, MessageSquare, Calendar,
  TrendingUp, Eye, MousePointerClick, Loader2,
  Send, Plus, X, CheckCircle2, Users, Megaphone, ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrganization } from '@/components/providers/organization-provider';
import {
  getAnalyticsOverview,
  getNewsletterHistory,
  getSentMessages,
  getEvents,
  sendNewsletter,
  sendMessage,
  publishEvent,
  getCustomersForSelect,
} from '@/lib/actions/marketing';
import { getEmailDomainStatus, type EmailDomainStatus } from '@/lib/actions/email-domain';
import { toast } from 'sonner';

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsOverview>>;
type NewsletterItem = Awaited<ReturnType<typeof getNewsletterHistory>>[number];
type MessageItem = Awaited<ReturnType<typeof getSentMessages>>[number];
type EventItem = Awaited<ReturnType<typeof getEvents>>[number];
type Customer = { id: string; name: string; email: string; role: string };

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  sent:      { label: '送信済み',   variant: 'default' },
  pending:   { label: '処理中',     variant: 'secondary' },
  partial:   { label: '一部送信',   variant: 'outline' },
  failed:    { label: '失敗',       variant: 'destructive' },
  draft:     { label: '下書き',     variant: 'secondary' },
  published: { label: '公開中',     variant: 'default' },
  cancelled: { label: 'キャンセル', variant: 'destructive' },
};

// ─── メールドメイン未設定バナー ─────────────────────────
function EmailDomainBanner({ status }: { status: EmailDomainStatus | null }) {
  if (!status) return null;
  if (status.verified) return null; // 認証済みなら不要

  const isNotRegistered = !status.domainId;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50/80 dark:border-yellow-900/40 dark:bg-yellow-950/20 px-4 py-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/40">
        <Mail className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          {isNotRegistered ? '送信ドメインが設定されていません' : 'ドメイン認証が完了していません'}
        </p>
        <p className="text-xs text-yellow-700/80 dark:text-yellow-300/70 mt-0.5">
          {isNotRegistered
            ? '自社ドメインを登録しないと、メールが noreply@akinai.jp から送信されます。'
            : 'DNSレコードを設定して認証を完了すると、自社アドレスから送信できます。'}
        </p>
      </div>
      <Button size="sm" variant="outline" className="shrink-0 border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300" asChild>
        <a href="/settings/email-domain">
          設定する →
        </a>
      </Button>
    </div>
  );
}


function AnalyticsTab({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsOverview(organizationId).then(d => { setData(d); setLoading(false); });
  }, [organizationId]);

  if (loading) return <LoadingState />;

  const maxViews = Math.max(...(data?.monthly.map(m => m.views) || [1]), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Eye, label: '合計閲覧数（6ヶ月）', value: (data?.totalViews ?? 0).toLocaleString(), color: 'sky' },
          { icon: MousePointerClick, label: '合計クリック数（6ヶ月）', value: (data?.totalClicks ?? 0).toLocaleString(), color: 'emerald' },
          { icon: TrendingUp, label: 'クリック率（CTR）', value: data && data.totalViews > 0 ? `${Math.round((data.totalClicks / data.totalViews) * 1000) / 10}%` : '—', color: 'violet' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-${color}-100 dark:bg-${color}-900/30`}>
                  <Icon className={`h-4 w-4 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">月別 閲覧数 / クリック数</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(data?.monthly || []).map(m => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-xs text-muted-foreground">{m.month.slice(5)}月</span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 rounded-full bg-sky-400" style={{ width: `${(m.views / maxViews) * 100}%`, minWidth: m.views > 0 ? '4px' : '0' }} />
                    <span className="text-xs text-muted-foreground">{m.views} 閲覧</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 rounded-full bg-emerald-400" style={{ width: `${(m.clicks / maxViews) * 100}%`, minWidth: m.clicks > 0 ? '4px' : '0' }} />
                    <span className="text-xs text-muted-foreground">{m.clicks} クリック</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {(data?.productRanking || []).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">商品閲覧ランキング（上位5件）</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.productRanking.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className={`w-5 text-center text-sm font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>{i + 1}</span>
                  <span className="flex-1 text-sm">{p.name}</span>
                  <span className="text-sm text-muted-foreground">{p.views.toLocaleString()} 閲覧</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data?.totalViews === 0 && (
        <EmptyState icon={BarChart3} title="データがまだありません" description="フロントエンドからトラッキングAPIを呼ぶとここに反映されます" />
      )}

      {/* 実装ガイド */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-500" />
            フロントエンドへの組み込み方
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">商品ページに以下のコードを追加するだけで計測が始まります。</p>
          <div className="rounded-lg bg-muted/60 p-3 font-mono text-xs space-y-2 overflow-x-auto">
            <p className="text-slate-400">{'// 商品ページを開いたとき（閲覧）'}</p>
            <p>{'await fetch("https://your-domain/api/v1/analytics/track", {'}</p>
            <p className="pl-4">{'method: "POST",'}</p>
            <p className="pl-4">{'headers: { "Authorization": "Bearer {APIキー}", "Content-Type": "application/json" },'}</p>
            <p className="pl-4">{'body: JSON.stringify({'}</p>
            <p className="pl-8">{'type: "view",          // "view" | "click"'}</p>
            <p className="pl-8">{'productId: "商品ID",'}</p>
            <p className="pl-8">{'sessionId: "セッションID",  // 任意'}</p>
            <p className="pl-4">{'})'}</p>
            <p>{'});'}</p>
            <br />
            <p className="text-slate-400">{'// カートに追加・詳細ボタンを押したとき（クリック）'}</p>
            <p>{'// type: "click", clickType: "buy" | "detail" | "inquiry"'}</p>
          </div>
          <p className="text-xs text-muted-foreground">APIキーは <span className="font-mono bg-muted px-1 rounded">設定 → API設定</span> で確認できます。</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── メルマガタブ ────────────────────────────────────────
function NewsletterTab({ organizationId }: { organizationId: string }) {
  const [history, setHistory] = useState<NewsletterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [suppliers, setSuppliers] = useState<Customer[]>([]);
  const [emailStatus, setEmailStatus] = useState<EmailDomainStatus | null>(null);
  const [form, setForm] = useState({ supplierId: '', subject: '', body: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([
      getNewsletterHistory(organizationId),
      getCustomersForSelect(organizationId, 'supplier'),
      getEmailDomainStatus(organizationId),
    ]).then(([h, s, { data: emailData }]) => {
      setHistory(h);
      setSuppliers(s);
      setEmailStatus(emailData);
      setLoading(false);
    });
  }, [organizationId]);

  const handleSend = () => {
    if (!form.subject || !form.body) { toast.error('件名と本文を入力してください'); return; }
    startTransition(async () => {
      const { data, error } = await sendNewsletter(organizationId, {
        supplierId: form.supplierId || undefined,
        subject: form.subject,
        body: form.body,
      });
      if (error) { toast.error(error); return; }
      toast.success(`${data?.sentCount}件送信しました（対象: ${data?.totalRecipients}件）`);
      setForm({ supplierId: '', subject: '', body: '' });
      setShowForm(false);
      const h = await getNewsletterHistory(organizationId);
      setHistory(h);
    });
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <EmailDomainBanner status={emailStatus} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">商品お気に入り登録者に一斉メールを送信します</p>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Send className="mr-2 h-4 w-4" />メルマガを送る
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="space-y-2">
              <Label>サプライヤー絞り込み（任意）</Label>
              <select
                className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm"
                value={form.supplierId}
                onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
              >
                <option value="">全商品のお気に入り登録者</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>件名 *</Label>
              <Input placeholder="例: 新商品のお知らせ" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>本文 *</Label>
              <Textarea rows={6} placeholder="メール本文を入力..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSend} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                送信
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>キャンセル</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {history.length === 0
        ? <EmptyState icon={Mail} title="送信履歴がありません" description="メルマガを送信すると履歴が表示されます" />
        : <div className="space-y-2">
          {history.map(item => {
            const s = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
            return (
              <Card key={item.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{item.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.sent_at ? new Date(item.sent_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        {(item.supplier as { name: string } | null)?.name && `　— ${(item.supplier as { name: string }).name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{item.sent_count}件</span>
                      <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      }
    </div>
  );
}

// ─── メッセージタブ ──────────────────────────────────────
function MessagesTab({ organizationId }: { organizationId: string }) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [suppliers, setSuppliers] = useState<Customer[]>([]);
  const [emailStatus, setEmailStatus] = useState<EmailDomainStatus | null>(null);
  const [form, setForm] = useState({ fromCustomerId: '', target: 'all' as 'all' | 'buyer', subject: '', body: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([
      getSentMessages(organizationId),
      getCustomersForSelect(organizationId, 'supplier'),
      getEmailDomainStatus(organizationId),
    ]).then(([m, s, { data: emailData }]) => {
      setMessages(m);
      setSuppliers(s);
      setEmailStatus(emailData);
      setLoading(false);
    });
  }, [organizationId]);

  const handleSend = () => {
    if (!form.subject || !form.body) { toast.error('件名と本文を入力してください'); return; }
    startTransition(async () => {
      const { data, error } = await sendMessage(organizationId, {
        fromCustomerId: form.fromCustomerId || undefined,
        target: form.target,
        subject: form.subject,
        body: form.body,
      });
      if (error) { toast.error(error); return; }
      toast.success(`${data?.sentCount}件のバイヤーに送信しました`);
      setForm({ fromCustomerId: '', target: 'all', subject: '', body: '' });
      setShowForm(false);
      const m = await getSentMessages(organizationId);
      setMessages(m);
    });
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <EmailDomainBanner status={emailStatus} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">サプライヤーからバイヤー全員へメッセージを送信します</p>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <MessageSquare className="mr-2 h-4 w-4" />メッセージを送る
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>送信者（サプライヤー）任意</Label>
                <select
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.fromCustomerId}
                  onChange={e => setForm(f => ({ ...f, fromCustomerId: e.target.value }))}
                >
                  <option value="">管理者</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>送信対象</Label>
                <select
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.target}
                  onChange={e => setForm(f => ({ ...f, target: e.target.value as 'all' | 'buyer' }))}
                >
                  <option value="all">全バイヤー</option>
                  <option value="buyer">バイヤーのみ</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>件名 *</Label>
              <Input placeholder="例: 新商品入荷のお知らせ" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>本文 *</Label>
              <Textarea rows={5} placeholder="本文を入力..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSend} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                送信
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>キャンセル</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {messages.length === 0
        ? <EmptyState icon={MessageSquare} title="送信履歴がありません" description="メッセージを送信すると履歴が表示されます" />
        : <div className="space-y-2">
          {messages.map(msg => (
            <Card key={msg.id}>
              <CardContent className="py-4 px-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{msg.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{msg.body}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />全バイヤー
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at as string).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}

// ─── イベントタブ ────────────────────────────────────────
function EventsTab({ organizationId }: { organizationId: string }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [buyers, setBuyers] = useState<Customer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [genreInput, setGenreInput] = useState('');
  const [regionInput, setRegionInput] = useState('');
  const [form, setForm] = useState({
    buyerId: '', title: '', event_date: '', venue: '', body: '',
    genres: [] as string[], regions: [] as string[],
  });

  useEffect(() => {
    Promise.all([
      getEvents(organizationId),
      getCustomersForSelect(organizationId, 'buyer'),
    ]).then(([e, b]) => { setEvents(e); setBuyers(b); setLoading(false); });
  }, [organizationId]);

  const addTag = (field: 'genres' | 'regions', value: string) => {
    const v = value.trim();
    if (!v) return;
    setForm(f => ({ ...f, [field]: [...f[field], v] }));
    if (field === 'genres') setGenreInput('');
    else setRegionInput('');
  };

  const removeTag = (field: 'genres' | 'regions', idx: number) => {
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }));
  };

  const handlePublish = () => {
    if (!form.title) { toast.error('タイトルを入力してください'); return; }
    startTransition(async () => {
      const { data, error } = await publishEvent(organizationId, {
        buyerId: form.buyerId || undefined,
        title: form.title,
        event_date: form.event_date || undefined,
        venue: form.venue || undefined,
        body: form.body || undefined,
        genres: form.genres,
        regions: form.regions,
      });
      if (error) { toast.error(error); return; }
      toast.success(`イベントを公開しました。${data?.notifiedCount}社のサプライヤーに通知しました`);
      setForm({ buyerId: '', title: '', event_date: '', venue: '', body: '', genres: [], regions: [] });
      setShowForm(false);
      const e = await getEvents(organizationId);
      setEvents(e);
    });
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">バイヤーからサプライヤーへ出展募集を告知します</p>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />イベントを作成
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>バイヤー（任意）</Label>
                <select
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.buyerId}
                  onChange={e => setForm(f => ({ ...f, buyerId: e.target.value }))}
                >
                  <option value="">選択しない</option>
                  {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>開催日</Label>
                <Input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>イベントタイトル *</Label>
              <Input placeholder="例: 2026年春の商談会" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>会場</Label>
              <Input placeholder="例: 東京ビッグサイト" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea rows={4} placeholder="イベントの詳細、募集条件など..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>対象ジャンル（空=全て）</Label>
                <div className="flex gap-1 flex-wrap mb-1">
                  {form.genres.map((g, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 text-xs">
                      {g}<button onClick={() => removeTag('genres', i)}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
                <Input placeholder="Enterで追加" value={genreInput} onChange={e => setGenreInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('genres', genreInput))} />
              </div>
              <div className="space-y-2">
                <Label>対象地域（空=全て）</Label>
                <div className="flex gap-1 flex-wrap mb-1">
                  {form.regions.map((r, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 text-xs">
                      {r}<button onClick={() => removeTag('regions', i)}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
                <Input placeholder="Enterで追加（例: 東京）" value={regionInput} onChange={e => setRegionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('regions', regionInput))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePublish} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
                公開して通知
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>キャンセル</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {events.length === 0
        ? <EmptyState icon={Calendar} title="イベントがありません" description="イベントを作成するとサプライヤーに通知が届きます" />
        : <div className="space-y-2">
          {events.map(ev => {
            const s = STATUS_BADGE[ev.status] || STATUS_BADGE.draft;
            return (
              <Card key={ev.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{ev.title}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {ev.event_date && <span className="text-xs text-muted-foreground">{new Date(ev.event_date as string).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
                        {ev.venue && <span className="text-xs text-muted-foreground">{ev.venue}</span>}
                        {(ev.genres as string[]).slice(0, 3).map(g => <Badge key={g} variant="outline" className="text-[10px] h-4 px-1">{g}</Badge>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{ev.notified_count}社通知</span>
                      <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      }
    </div>
  );
}

// ─── 共通コンポーネント ──────────────────────────────────
function LoadingState() {
  return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ─── メインページ ────────────────────────────────────────
export default function MarketingPage() {
  const { organization } = useOrganization();

  if (!organization?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30">
          <Megaphone className="h-5 w-5 text-sky-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">マーケティング</h1>
          <p className="text-sm text-muted-foreground">アナリティクス・メルマガ・メッセージ・イベント管理</p>
        </div>
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">アナリティクス</span>
          </TabsTrigger>
          <TabsTrigger value="newsletter" className="flex items-center gap-1.5">
            <Mail className="h-4 w-4" /><span className="hidden sm:inline">メルマガ</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" /><span className="hidden sm:inline">メッセージ</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /><span className="hidden sm:inline">イベント</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab organizationId={organization.id} />
        </TabsContent>
        <TabsContent value="newsletter" className="mt-6">
          <NewsletterTab organizationId={organization.id} />
        </TabsContent>
        <TabsContent value="messages" className="mt-6">
          <MessagesTab organizationId={organization.id} />
        </TabsContent>
        <TabsContent value="events" className="mt-6">
          <EventsTab organizationId={organization.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

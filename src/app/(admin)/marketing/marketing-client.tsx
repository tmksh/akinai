'use client';

import { useState, useEffect, useRef } from 'react';
import { useOrganization } from '@/components/providers/organization-provider';
import {
  BarChart3, Mail, MessageSquare, Calendar,
  TrendingUp, Eye, MousePointerClick, Loader2,
  X, CheckCircle2, Users, Megaphone, ChevronDown,
  Inbox, Package, ArrowRight, Paperclip, Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getAnalyticsOverview,
  getNewsletterHistory,
  getEvents,
  deleteNewsletterSend,
  type AnalyticsPeriod,
  getInquiryThreads,
  getInquiryThreadDetail,
  deleteInquiryThread,
  type InquiryThreadListItem,
  type InquiryThreadDetail,
} from '@/lib/actions/marketing';
import { getEmailDomainStatus, type EmailDomainStatus } from '@/lib/actions/email-domain';
import { toast } from 'sonner';

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsOverview>>;
type NewsletterItem = Awaited<ReturnType<typeof getNewsletterHistory>>[number];
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


function AnalyticsTab({
  organizationId,
  initialData,
}: {
  organizationId: string;
  initialData?: AnalyticsData | null;
}) {
  const [data, setData] = useState<AnalyticsData | null>(initialData ?? null);
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [initialLoading, setInitialLoading] = useState(!initialData);
  const [fetching, setFetching] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const skipInitialFetch = useRef(!!initialData);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    if (initialLoading) {
      getAnalyticsOverview(organizationId, undefined, period).then(d => {
        setData(d);
        setInitialLoading(false);
      });
    } else {
      setFetching(true);
      getAnalyticsOverview(organizationId, undefined, period).then(d => {
        setData(d);
        setFetching(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, period]);

  if (initialLoading) return <LoadingState />;

  const buckets = (data?.buckets || []).slice().reverse();
  const maxBar = Math.max(...buckets.flatMap(b => [b.views, b.clicks]), 1);
  const ctrValue = data && data.totalViews > 0 ? `${Math.round((data.totalClicks / data.totalViews) * 1000) / 10}%` : '—';

  return (
    <div className="space-y-3">
      {/* ── サマリー＋切り替え ── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* 上段: 週/月/年 切り替え */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {period === 'week' ? '直近7日' : period === 'year' ? '直近1年' : '直近6ヶ月'}
            </span>
            <div className="flex rounded-lg border border-input overflow-hidden text-xs">
              {(['week', 'month', 'year'] as const).map((p, i) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={[
                    'px-2.5 py-1 transition-colors',
                    i > 0 ? 'border-l border-input' : '',
                    period === p
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  ].join(' ')}
                >
                  {p === 'week' ? '週' : p === 'month' ? '月' : '年'}
                </button>
              ))}
            </div>
          </div>

          {/* 下段: 3指標を横並び（カード内分割） */}
          <div className="grid grid-cols-3 divide-x">
            <div className="px-3 first:pl-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Eye className="h-3 w-3 text-sky-500" />閲覧数
              </div>
              <p className="text-2xl font-bold tabular-nums">{(data?.totalViews ?? 0).toLocaleString()}</p>
            </div>
            <div className="px-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <MousePointerClick className="h-3 w-3 text-emerald-500" />クリック数
              </div>
              <p className="text-2xl font-bold tabular-nums">{(data?.totalClicks ?? 0).toLocaleString()}</p>
            </div>
            <div className="px-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3 text-violet-500" />CTR
              </div>
              <p className="text-2xl font-bold tabular-nums">{ctrValue}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── チャート（縦棒グラフ・週/月/年切り替え） ── */}
      <Card>
        <CardContent className={`p-4 transition-opacity ${fetching ? 'opacity-50' : 'opacity-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground">
              {period === 'week' ? '日別推移' : '月別推移'}
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-sky-400" />閲覧</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-400" />クリック</span>
            </div>
          </div>
          <div
            className="gap-1 h-32"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
          >
            {buckets.map(b => (
              <div key={b.key} className="flex flex-col items-center justify-end gap-1.5">
                <div className="flex items-end gap-0.5 w-full justify-center h-full">
                  <div
                    className="w-2/5 rounded-t bg-sky-400 transition-all"
                    style={{ height: `${(b.views / maxBar) * 100}%`, minHeight: b.views > 0 ? '2px' : '0' }}
                    title={`${b.views} 閲覧`}
                  />
                  <div
                    className="w-2/5 rounded-t bg-emerald-400 transition-all"
                    style={{ height: `${(b.clicks / maxBar) * 100}%`, minHeight: b.clicks > 0 ? '2px' : '0' }}
                    title={`${b.clicks} クリック`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums leading-none">{b.label}</span>
                <span className="text-[10px] tabular-nums leading-none">
                  <span className="text-sky-600 dark:text-sky-400">{b.views}</span>
                  <span className="text-muted-foreground mx-0.5">/</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{b.clicks}</span>
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 商品別テーブル ── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-xs font-semibold text-muted-foreground">商品別ランキング（上位20件）</h3>
          </div>
          {(data?.productRanking || []).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8 px-4">
              データがありません。<button className="underline hover:text-foreground" onClick={() => setShowGuide(true)}>トラッキングAPIの組み込み方</button>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] text-muted-foreground bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium w-8">#</th>
                    <th className="text-left py-2 pr-3 font-medium">商品名</th>
                    <th className="text-right py-2 pr-3 font-medium whitespace-nowrap w-20">閲覧</th>
                    <th className="text-right py-2 pr-3 font-medium whitespace-nowrap w-20">クリック</th>
                    <th className="text-right px-4 py-2 font-medium w-16">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.productRanking.map((p, i) => {
                    const rawCtr = p.views > 0 ? (p.clicks / p.views) * 100 : 0;
                    const ctr = Math.round(Math.min(rawCtr, 100) * 10) / 10;
                    return (
                      <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2">
                          <span className={`text-xs font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>{i + 1}</span>
                        </td>
                        <td className="py-2 pr-3 max-w-[200px] truncate">{p.name}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-sky-600 dark:text-sky-400">{p.views.toLocaleString()}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{p.clicks.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-xs text-muted-foreground">{ctr > 0 ? `${ctr}%` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 実装ガイド（折りたたみ） ── */}
      <button
        onClick={() => setShowGuide(s => !s)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
        フロントエンドへの組み込み方
      </button>
      {showGuide && (
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">商品ページに以下のコードを追加するだけで計測が始まります。</p>
            <div className="rounded-lg bg-muted/60 p-3 font-mono text-[11px] space-y-1 overflow-x-auto leading-relaxed">
              <p className="text-slate-400">{'// 商品ページを開いたとき（閲覧）'}</p>
              <p>{'await fetch("https://your-domain/api/v1/analytics/track", {'}</p>
              <p className="pl-4">{'method: "POST",'}</p>
              <p className="pl-4">{'headers: { "Authorization": "Bearer {APIキー}", "Content-Type": "application/json" },'}</p>
              <p className="pl-4">{'body: JSON.stringify({ type: "view", productId: "商品ID", sessionId: "セッションID" })'}</p>
              <p>{'});'}</p>
              <p className="text-slate-400 pt-1">{'// クリック計測: type: "click", clickType: "buy" | "detail" | "inquiry"'}</p>
            </div>
            <p className="text-xs text-muted-foreground">APIキーは <span className="font-mono bg-muted px-1 rounded">設定 → API設定</span> で確認できます。</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── メルマガタブ ────────────────────────────────────────
function NewsletterTab({
  organizationId,
  initialHistory,
  initialEmailStatus,
}: {
  organizationId: string;
  initialHistory?: NewsletterItem[];
  initialEmailStatus?: EmailDomainStatus | null;
}) {
  const [history, setHistory] = useState<NewsletterItem[]>(initialHistory ?? []);
  const [loading, setLoading] = useState(!initialHistory);
  const [emailStatus, setEmailStatus] = useState<EmailDomainStatus | null>(initialEmailStatus ?? null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (initialHistory) return;
    Promise.all([
      getNewsletterHistory(organizationId),
      getEmailDomainStatus(organizationId),
    ]).then(([h, { data: emailData }]) => {
      setHistory(h);
      setEmailStatus(emailData);
      setLoading(false);
    });
  }, [organizationId, initialHistory]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await deleteNewsletterSend(organizationId, id);
    if (error) {
      toast.error('削除に失敗しました');
    } else {
      setHistory(prev => prev.filter(h => h.id !== id));
      toast.success('送信履歴を削除しました');
    }
    setDeletingId(null);
    setConfirmId(null);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <EmailDomainBanner status={emailStatus} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">商品お気に入り登録者に一斉メールを送信します</p>
      </div>

      {history.length === 0
        ? <EmptyState icon={Mail} title="送信履歴がありません" description="メルマガを送信すると履歴が表示されます" />
        : <div className="space-y-2">
          {history.map(item => {
            const s = STATUS_BADGE[item.status] || STATUS_BADGE.pending;
            const isConfirming = confirmId === item.id;
            const isDeleting = deletingId === item.id;
            return (
              <Card key={item.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{item.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.sent_at ? new Date(item.sent_at).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        {((item.supplier as unknown) as { name: string } | null)?.name && `　— ${((item.supplier as unknown) as { name: string }).name}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">{item.sent_count}件</span>
                      <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                      {isConfirming ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            disabled={isDeleting}
                            onClick={() => handleDelete(item.id)}
                          >
                            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : '削除する'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            disabled={isDeleting}
                            onClick={() => setConfirmId(null)}
                          >
                            キャンセル
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmId(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
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


// ─── イベントタブ ────────────────────────────────────────
function EventsTab({
  organizationId,
  initialEvents,
}: {
  organizationId: string;
  initialEvents?: EventItem[];
}) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents ?? []);
  const [loading, setLoading] = useState(!initialEvents);

  useEffect(() => {
    if (initialEvents) return;
    getEvents(organizationId).then(e => { setEvents(e); setLoading(false); });
  }, [organizationId, initialEvents]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">バイヤーからサプライヤーへ出展募集を告知します</p>
      </div>

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

// ─── 問い合わせ（1対1メッセージ）タブ ─────────────────────
function InquiriesTab({
  organizationId,
  initialThreads,
}: {
  organizationId: string;
  initialThreads?: InquiryThreadListItem[];
}) {
  const [threads, setThreads] = useState<InquiryThreadListItem[]>(initialThreads ?? []);
  const [loading, setLoading] = useState(!initialThreads);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [keyword, setKeyword] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InquiryThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const data = await getInquiryThreads(organizationId, {
      status: statusFilter === 'all' ? undefined : statusFilter,
      keyword: keyword.trim() || undefined,
    });
    setThreads(data);
    setLoading(false);
  };

  const skipInitialRefresh = useRef(!!initialThreads);

  useEffect(() => {
    if (skipInitialRefresh.current) {
      skipInitialRefresh.current = false;
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, statusFilter]);

  const openDetail = async (threadId: string) => {
    setSelectedThreadId(threadId);
    setDetailLoading(true);
    setDetail(null);
    const data = await getInquiryThreadDetail(organizationId, threadId);
    setDetail(data);
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setSelectedThreadId(null);
    setDetail(null);
  };

  const handleDelete = async (threadId: string) => {
    setDeletingId(threadId);
    const { error } = await deleteInquiryThread(organizationId, threadId);
    if (error) {
      toast.error('削除に失敗しました');
    } else {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (selectedThreadId === threadId) closeDetail();
      toast.success('問い合わせを削除しました');
    }
    setDeletingId(null);
    setConfirmId(null);
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      refresh();
    }
  };

  if (loading && threads.length === 0) return <LoadingState />;

  return (
    <div className="space-y-3">
      {/* ── フィルター ── */}
      <Card>
        <CardContent className="p-3 flex items-center gap-2 flex-wrap">
          <Inbox className="h-4 w-4 text-muted-foreground ml-1" />
          <span className="text-xs text-muted-foreground">会員間の問い合わせ履歴を閲覧します</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {(['all', 'open', 'closed'] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'すべて' : s === 'open' ? 'オープン' : 'クローズ'}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Input
              className="h-8 w-56"
              placeholder="件名・本文で検索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleSearchKey}
            />
          </div>
          <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : '更新'}
          </Button>
        </CardContent>
      </Card>

      {/* ── スレッド一覧 ── */}
      {threads.length === 0 ? (
        <EmptyState icon={Inbox} title="問い合わせがありません" description="会員同士のメッセージ送受信が発生すると、ここに表示されます" />
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
              onClick={() => openDetail(t.id)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={t.status === 'open' ? 'default' : 'secondary'} className="text-[10px] h-5">
                        {t.status === 'open' ? 'オープン' : 'クローズ'}
                      </Badge>
                      <p className="font-medium text-sm truncate">{t.subject || '（件名なし）'}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1.5 text-xs text-muted-foreground">
                      {t.product && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/60 dark:bg-amber-950/40 px-1.5 py-0.5 text-amber-800 dark:text-amber-300">
                          <Package className="h-3 w-3" />
                          {t.product.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span className="font-medium">{t.initiator?.name || '—'}</span>
                        <span className="text-[10px] uppercase opacity-60">({t.initiator?.role})</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium">{t.recipient?.name || '—'}</span>
                        <span className="text-[10px] uppercase opacity-60">({t.recipient?.role})</span>
                      </span>
                    </div>
                    {t.lastMessagePreview && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {t.lastMessagePreview}
                      </p>
                    )}
                  </div>
                  <div className="flex items-start gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">
                        {t.lastMessageAt
                          ? new Date(t.lastMessageAt).toLocaleString('ja-JP', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </span>
                      <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5">
                        <MessageSquare className="h-2.5 w-2.5" />
                        {t.messageCount}件
                      </span>
                    </div>
                    {confirmId === t.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2 text-xs"
                          disabled={deletingId === t.id}
                          onClick={() => handleDelete(t.id)}
                        >
                          {deletingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : '削除する'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          disabled={deletingId === t.id}
                          onClick={() => setConfirmId(null)}
                        >
                          キャンセル
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmId(t.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── 詳細ダイアログ ── */}
      <Dialog open={!!selectedThreadId} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">
              {detail?.thread.subject || '会話履歴'}
            </DialogTitle>
            <DialogDescription className="space-y-1.5">
              {detail?.thread.product && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Package className="h-3 w-3" />
                  関連商品：{detail.thread.product.name}
                </span>
              )}
              {detail && (
                <span className="block text-xs">
                  <span className="font-medium">{detail.thread.initiator?.name}</span>
                  <span className="opacity-60"> ({detail.thread.initiator?.role})</span>
                  <ArrowRight className="inline h-3 w-3 mx-1" />
                  <span className="font-medium">{detail.thread.recipient?.name}</span>
                  <span className="opacity-60"> ({detail.thread.recipient?.role})</span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {detailLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : detail ? (
              detail.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">メッセージはありません</p>
              ) : (
                detail.messages.map((m) => {
                  const isInitiator = detail.thread.initiator?.id === m.fromCustomerId;
                  const sender = isInitiator ? detail.thread.initiator : detail.thread.recipient;
                  return (
                    <div
                      key={m.id}
                      className={`rounded-lg border px-3 py-2 ${
                        isInitiator
                          ? 'bg-sky-50/60 dark:bg-sky-950/20 border-sky-200/60 dark:border-sky-900/40'
                          : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {sender?.name}
                          <span className="ml-1 text-[10px] uppercase opacity-60">
                            ({sender?.role})
                          </span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(m.createdAt).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {m.isRead && (
                            <span className="ml-2 inline-flex items-center gap-0.5">
                              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" />
                              既読
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                      {m.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {m.attachments.map((att, i) => (
                            <a
                              key={i}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs rounded-md border bg-white/60 dark:bg-slate-900/60 px-1.5 py-0.5 hover:bg-white"
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate max-w-[180px]">{att.name}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">スレッドが見つかりません</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
export default function MarketingClient({
  organizationId: orgIdProp,
  initialAnalytics,
  initialNewsletterHistory,
  initialEmailStatus,
  initialThreads,
  initialEvents,
}: {
  organizationId?: string;
  initialAnalytics?: AnalyticsData | null;
  initialNewsletterHistory?: NewsletterItem[];
  initialEmailStatus?: EmailDomainStatus | null;
  initialThreads?: InquiryThreadListItem[];
  initialEvents?: EventItem[];
} = {}) {
  const { organization } = useOrganization();
  const organizationId = orgIdProp || organization?.id || '';

  if (!organizationId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">マーケティング</h1>
          <p className="text-sm text-muted-foreground">アナリティクス・メルマガ・イベント管理</p>
        </div>
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
          <p className="text-sm text-muted-foreground">アナリティクス・メルマガ・イベント管理</p>
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
          <TabsTrigger value="inquiries" className="flex items-center gap-1.5">
            <Inbox className="h-4 w-4" /><span className="hidden sm:inline">問い合わせ</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /><span className="hidden sm:inline">イベント</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab organizationId={organizationId} initialData={initialAnalytics} />
        </TabsContent>
        <TabsContent value="newsletter" className="mt-6">
          <NewsletterTab
            organizationId={organizationId}
            initialHistory={initialNewsletterHistory}
            initialEmailStatus={initialEmailStatus}
          />
        </TabsContent>
        <TabsContent value="inquiries" className="mt-6">
          <InquiriesTab organizationId={organizationId} initialThreads={initialThreads} />
        </TabsContent>
        <TabsContent value="events" className="mt-6">
          <EventsTab organizationId={organizationId} initialEvents={initialEvents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

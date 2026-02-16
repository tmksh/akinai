'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  DollarSign,
  MoreHorizontal,
  Send,
  FileCheck,
  XCircle,
  ShoppingCart,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Building2,
  Calendar,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { QuoteStatus } from '@/types';
import { useOrganization } from '@/components/providers/organization-provider';
import { getQuotes, deleteQuote, updateQuoteStatus, sendQuote, convertQuoteToOrder, type QuoteWithItems } from '@/lib/actions/quotes';

// ステータス設定
const statusConfig: Record<QuoteStatus, { label: string; color: string; icon: React.ElementType; bgColor: string }> = {
  draft: { label: '下書き', color: 'text-slate-600', icon: FileText, bgColor: 'bg-slate-100' },
  sent: { label: '送付済', color: 'text-blue-600', icon: Send, bgColor: 'bg-blue-100' },
  negotiating: { label: '交渉中', color: 'text-amber-600', icon: MessageSquare, bgColor: 'bg-amber-100' },
  accepted: { label: '承認済', color: 'text-emerald-600', icon: CheckCircle, bgColor: 'bg-emerald-100' },
  rejected: { label: '却下', color: 'text-red-600', icon: XCircle, bgColor: 'bg-red-100' },
  expired: { label: '期限切れ', color: 'text-gray-600', icon: AlertCircle, bgColor: 'bg-gray-100' },
  ordered: { label: '発注済', color: 'text-purple-600', icon: ShoppingCart, bgColor: 'bg-purple-100' },
};

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

const formatDate = (dateString: string) => 
  new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });

export default function QuotesPage() {
  const { organization } = useOrganization();
  const [quotes, setQuotes] = useState<QuoteWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // データ取得
  useEffect(() => {
    async function fetchQuotes() {
      if (!organization) return;
      
      setIsLoading(true);
      const { data, error } = await getQuotes(organization.id);
      if (error) {
        console.error('Failed to fetch quotes:', error);
      } else {
        setQuotes(data || []);
      }
      setIsLoading(false);
    }

    fetchQuotes();
  }, [organization?.id]);

  // フィルタリング
  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quote.customer_company?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 統計
  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => ['sent', 'negotiating'].includes(q.status)).length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    totalAmount: quotes.filter(q => ['sent', 'negotiating', 'accepted'].includes(q.status))
      .reduce((sum, q) => sum + q.total, 0),
  };

  // アクション: 削除
  const handleDelete = async (quoteId: string) => {
    if (!confirm('この見積を削除しますか？')) return;
    
    const { error } = await deleteQuote(quoteId);
    if (error) {
      alert('削除に失敗しました: ' + error);
    } else {
      setQuotes(quotes.filter(q => q.id !== quoteId));
    }
  };

  // アクション: 送付
  const handleSend = async (quoteId: string) => {
    const { error } = await sendQuote(quoteId);
    if (error) {
      alert('送付に失敗しました: ' + error);
    } else {
      setQuotes(quotes.map(q => q.id === quoteId ? { ...q, status: 'sent' as const } : q));
    }
  };

  // アクション: 注文に変換
  const handleConvertToOrder = async (quoteId: string) => {
    if (!confirm('この見積を注文に変換しますか？')) return;
    
    const { orderId, error } = await convertQuoteToOrder(quoteId);
    if (error) {
      alert('変換に失敗しました: ' + error);
    } else {
      setQuotes(quotes.map(q => q.id === quoteId ? { ...q, status: 'ordered' as const, order_id: orderId } : q));
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">見積管理</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            B2B見積の作成・管理・承認フローを管理します
          </p>
        </div>
        <Button className="btn-premium" size="sm" asChild>
          <Link href="/quotes/new">
            <Plus className="mr-2 h-4 w-4" />
            見積を作成
          </Link>
        </Button>
      </div>

      {/* 統計カード - オレンジグラデーション */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* 総見積数 - 薄いオレンジ */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100/50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/40 border border-orange-100 dark:border-orange-800/30 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <FileText className="h-4 w-4 text-orange-500" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-orange-700 dark:text-orange-300">総見積数</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.total}<span className="text-sm font-normal ml-1">件</span></p>
        </div>
        
        {/* 対応中 - やや濃いオレンジ */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-100 via-orange-200/60 to-amber-100 dark:from-orange-900/50 dark:via-orange-800/40 dark:to-amber-900/50 border border-orange-200 dark:border-orange-700/40 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-orange-800 dark:text-orange-200">対応中</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.pending}<span className="text-sm font-normal ml-1">件</span></p>
        </div>
        
        {/* 承認済み - 濃いオレンジ */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-200 via-orange-300/70 to-amber-200 dark:from-orange-800/60 dark:via-orange-700/50 dark:to-amber-800/60 border border-orange-300 dark:border-orange-600/50 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70">
              <CheckCircle className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-orange-800 dark:text-orange-200">承認済み</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.accepted}<span className="text-sm font-normal ml-1">件</span></p>
        </div>
        
        {/* 見積総額 - 最も濃いオレンジ */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 dark:from-orange-600 dark:via-orange-500 dark:to-amber-600 border border-orange-400 dark:border-orange-500 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/30">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-white/90">見積総額</span>
          </div>
          <p className="text-base sm:text-xl font-bold text-white">{formatCurrency(stats.totalAmount)}</p>
        </div>
      </div>

      {/* フロー図 - モバイルでは非表示 */}
      <Card className="hidden sm:block overflow-hidden">
        <CardContent className="p-0">
          <div className="flex">
            {[
              { status: 'draft', label: '下書き', desc: '見積書を作成' },
              { status: 'sent', label: '送付済み', desc: '顧客へ送付' },
              { status: 'negotiating', label: '交渉中', desc: '条件調整中' },
              { status: 'accepted', label: '承認', desc: '顧客が承認' },
              { status: 'ordered', label: '発注', desc: '受注確定' },
            ].map((step, index) => {
              const Icon = statusConfig[step.status as QuoteStatus].icon;
              const count = quotes.filter(q => q.status === step.status).length;
              return (
                <div 
                  key={step.status} 
                  className={cn(
                    "flex-1 relative py-4 px-3 text-center",
                    index < 4 && "after:content-[''] after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2 after:border-t-[20px] after:border-b-[20px] after:border-l-[12px] after:border-t-transparent after:border-b-transparent after:border-l-border after:z-10",
                    index === 0 && "bg-slate-100 dark:bg-slate-800/50",
                    index === 1 && "bg-blue-50 dark:bg-blue-950/30",
                    index === 2 && "bg-amber-50 dark:bg-amber-950/30",
                    index === 3 && "bg-green-50 dark:bg-green-950/30",
                    index === 4 && "bg-purple-50 dark:bg-purple-950/30",
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center mb-1",
                      index === 0 && "bg-slate-200 dark:bg-slate-700",
                      index === 1 && "bg-blue-100 dark:bg-blue-900/50",
                      index === 2 && "bg-amber-100 dark:bg-amber-900/50",
                      index === 3 && "bg-green-100 dark:bg-green-900/50",
                      index === 4 && "bg-purple-100 dark:bg-purple-900/50",
                    )}>
                      <Icon className={cn("h-5 w-5", statusConfig[step.status as QuoteStatus].color)} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-sm font-semibold", statusConfig[step.status as QuoteStatus].color)}>
                        {step.label}
                      </span>
                      {count > 0 && (
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full font-medium",
                          index === 0 && "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200",
                          index === 1 && "bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-200",
                          index === 2 && "bg-amber-200 text-amber-700 dark:bg-amber-800 dark:text-amber-200",
                          index === 3 && "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-200",
                          index === 4 && "bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200",
                        )}>
                          {count}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{step.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 見積一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>見積一覧</CardTitle>
          <CardDescription>作成した見積書を管理します</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 検索・フィルター */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="見積番号・顧客名・会社名で検索..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="sent">送付済</SelectItem>
                <SelectItem value="negotiating">交渉中</SelectItem>
                <SelectItem value="accepted">承認済</SelectItem>
                <SelectItem value="rejected">却下</SelectItem>
                <SelectItem value="expired">期限切れ</SelectItem>
                <SelectItem value="ordered">発注済</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* テーブル */}
          <div className="rounded-lg border overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>見積番号</TableHead>
                  <TableHead>顧客</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>有効期限</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 text-muted-foreground/50 mb-2 animate-spin" />
                        <p className="text-muted-foreground">読み込み中...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-muted-foreground">該当する見積がありません</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotes.map((quote) => {
                    const config = statusConfig[quote.status];
                    const StatusIcon = config.icon;
                    const isExpired = new Date(quote.valid_until) < new Date() && quote.status !== 'ordered';

                    return (
                      <TableRow key={quote.id} className="group">
                        <TableCell>
                          <Link href={`/quotes/${quote.id}`} className="font-medium text-primary hover:underline">
                            {quote.quote_number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                              <Building2 className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{quote.customer_company || quote.customer_name}</p>
                              {quote.customer_company && (
                                <p className="text-xs text-muted-foreground">{quote.customer_name}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">{formatCurrency(quote.total)}</p>
                          <p className="text-xs text-muted-foreground">{quote.items.length}品目</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", config.bgColor, config.color, "border-0")}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className={cn("flex items-center gap-1 text-sm", isExpired && "text-red-600")}>
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(quote.valid_until)}
                            {isExpired && <AlertCircle className="h-3.5 w-3.5" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(quote.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="sm:opacity-0 sm:group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/quotes/${quote.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  詳細を見る
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/quotes/${quote.id}/edit`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  編集
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="mr-2 h-4 w-4" />
                                複製
                              </DropdownMenuItem>
                              {quote.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handleSend(quote.id)}>
                                  <Send className="mr-2 h-4 w-4" />
                                  送付
                                </DropdownMenuItem>
                              )}
                              {quote.status === 'accepted' && (
                                <DropdownMenuItem onClick={() => handleConvertToOrder(quote.id)}>
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  注文に変換
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(quote.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                削除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

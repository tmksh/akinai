'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle,
  MoreHorizontal,
  Send,
  XCircle,
  ShoppingCart,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Building2,
  Calendar,
  MessageSquare,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  getQuotes,
  deleteQuote,
  sendQuote,
  convertQuoteToOrder,
  type QuoteWithItems,
} from '@/lib/actions/quotes';

const statusConfig: Record<
  QuoteStatus,
  { label: string; color: string; icon: React.ElementType; bgColor: string }
> = {
  draft: { label: '作成中', color: 'text-slate-600', icon: FileText, bgColor: 'bg-slate-100' },
  sent: { label: '送付済み', color: 'text-blue-600', icon: Send, bgColor: 'bg-blue-100' },
  negotiating: { label: 'やりとり中', color: 'text-amber-600', icon: MessageSquare, bgColor: 'bg-amber-100' },
  accepted: { label: 'OK済み', color: 'text-emerald-600', icon: CheckCircle, bgColor: 'bg-emerald-100' },
  rejected: { label: 'お断り', color: 'text-red-600', icon: XCircle, bgColor: 'bg-red-100' },
  expired: { label: '期限切れ', color: 'text-gray-600', icon: AlertCircle, bgColor: 'bg-gray-100' },
  ordered: { label: '注文済み', color: 'text-purple-600', icon: ShoppingCart, bgColor: 'bg-purple-100' },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });

// 見積もり行をメモ化
const QuoteRow = memo(function QuoteRow({
  quote,
  onDelete,
  onSend,
  onConvert,
}: {
  quote: QuoteWithItems;
  onDelete: (id: string) => void;
  onSend: (id: string) => void;
  onConvert: (id: string) => void;
}) {
  const config = statusConfig[quote.status];
  const StatusIcon = config.icon;
  const isExpired = new Date(quote.valid_until) < new Date() && quote.status !== 'ordered';

  return (
    <TableRow className="group">
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
        <Badge className={cn('gap-1', config.bgColor, config.color, 'border-0')}>
          <StatusIcon className="h-3 w-3" />
          {config.label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className={cn('flex items-center gap-1 text-sm', isExpired && 'text-red-600')}>
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(quote.valid_until)}
          {isExpired && <AlertCircle className="h-3.5 w-3.5" />}
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatDate(quote.created_at)}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/quotes/${quote.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                詳しく見る
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/quotes/${quote.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                内容を編集
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="mr-2 h-4 w-4" />
              コピーして新規作成
            </DropdownMenuItem>
            {quote.status === 'draft' && (
              <DropdownMenuItem onClick={() => onSend(quote.id)}>
                <Send className="mr-2 h-4 w-4" />
                お客様に送る
              </DropdownMenuItem>
            )}
            {quote.status === 'accepted' && (
              <DropdownMenuItem onClick={() => onConvert(quote.id)}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                注文として登録
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(quote.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              削除する
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

export function QuotesTab() {
  const { organization } = useOrganization();
  const [quotes, setQuotes] = useState<QuoteWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    let mounted = true;

    async function fetchQuotes() {
      if (!organization) return;

      setIsLoading(true);
      const { data, error } = await getQuotes(organization.id);
      if (mounted) {
        if (error) {
          console.error('Failed to fetch quotes:', error);
        } else {
          setQuotes(data || []);
        }
        setIsLoading(false);
      }
    }

    fetchQuotes();
    return () => {
      mounted = false;
    };
  }, [organization?.id]);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((quote) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        quote.quote_number.toLowerCase().includes(query) ||
        quote.customer_name.toLowerCase().includes(query) ||
        (quote.customer_company?.toLowerCase() || '').includes(query);
      const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotes, searchQuery, statusFilter]);

  const handleDelete = useCallback(
    async (quoteId: string) => {
      if (!confirm('この見積書を削除してもよろしいですか？')) return;

      const { error } = await deleteQuote(quoteId);
      if (error) {
        alert('削除できませんでした: ' + error);
      } else {
        setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
      }
    },
    []
  );

  const handleSend = useCallback(async (quoteId: string) => {
    const { error } = await sendQuote(quoteId);
    if (error) {
      alert('送付できませんでした: ' + error);
    } else {
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: 'sent' as const } : q))
      );
    }
  }, []);

  const handleConvertToOrder = useCallback(async (quoteId: string) => {
    if (!confirm('この見積書から注文を作成しますか？')) return;

    const { orderId, error } = await convertQuoteToOrder(quoteId);
    if (error) {
      alert('注文の作成ができませんでした: ' + error);
    } else {
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === quoteId ? { ...q, status: 'ordered' as const, order_id: orderId } : q
        )
      );
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="見積番号やお客様名で探す..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="状態で絞り込む" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="draft">作成中</SelectItem>
            <SelectItem value="sent">送付済み</SelectItem>
            <SelectItem value="negotiating">やりとり中</SelectItem>
            <SelectItem value="accepted">OK済み</SelectItem>
            <SelectItem value="rejected">お断り</SelectItem>
            <SelectItem value="expired">期限切れ</SelectItem>
            <SelectItem value="ordered">注文済み</SelectItem>
          </SelectContent>
        </Select>
        <Button className="btn-premium" size="sm" asChild>
          <Link href="/quotes/new">
            <Plus className="mr-2 h-4 w-4" />
            新しい見積書
          </Link>
        </Button>
      </div>

      {/* テーブル */}
      <div className="rounded-lg border overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead>見積番号</TableHead>
              <TableHead>お客様</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>回答期限</TableHead>
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
                    <p className="text-muted-foreground">データを読み込んでいます...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredQuotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">条件に合う見積書が見つかりませんでした</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredQuotes.map((quote) => (
                <QuoteRow
                  key={quote.id}
                  quote={quote}
                  onDelete={handleDelete}
                  onSend={handleSend}
                  onConvert={handleConvertToOrder}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

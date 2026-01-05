'use client';

import { useState } from 'react';
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
import { mockQuotes } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import type { QuoteStatus } from '@/types';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // フィルタリング
  const filteredQuotes = mockQuotes.filter((quote) => {
    const matchesSearch =
      quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quote.customerCompany.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 統計
  const stats = {
    total: mockQuotes.length,
    pending: mockQuotes.filter(q => ['sent', 'negotiating'].includes(q.status)).length,
    accepted: mockQuotes.filter(q => q.status === 'accepted').length,
    totalAmount: mockQuotes.filter(q => ['sent', 'negotiating', 'accepted'].includes(q.status))
      .reduce((sum, q) => sum + q.total, 0),
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
      <Card className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 hidden sm:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">見積フロー</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 text-sm">
            {[
              { status: 'draft', label: '下書き' },
              { status: 'sent', label: '送付' },
              { status: 'negotiating', label: '交渉' },
              { status: 'accepted', label: '承認' },
              { status: 'ordered', label: '発注' },
            ].map((step, index) => (
              <div key={step.status} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg",
                  statusConfig[step.status as QuoteStatus].bgColor
                )}>
                  {(() => {
                    const Icon = statusConfig[step.status as QuoteStatus].icon;
                    return <Icon className={cn("h-4 w-4", statusConfig[step.status as QuoteStatus].color)} />;
                  })()}
                  <span className={cn("font-medium", statusConfig[step.status as QuoteStatus].color)}>
                    {step.label}
                  </span>
                </div>
                {index < 4 && <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />}
              </div>
            ))}
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
          <div className="flex items-center gap-4 mb-6">
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
              <SelectTrigger className="w-[160px]">
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
          <div className="rounded-lg border">
            <Table>
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
                {filteredQuotes.length === 0 ? (
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
                    const isExpired = new Date(quote.validUntil) < new Date() && quote.status !== 'ordered';

                    return (
                      <TableRow key={quote.id} className="group">
                        <TableCell>
                          <Link href={`/quotes/${quote.id}`} className="font-medium text-primary hover:underline">
                            {quote.quoteNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                              <Building2 className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{quote.customerCompany}</p>
                              <p className="text-xs text-muted-foreground">{quote.customerName}</p>
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
                            {formatDate(quote.validUntil)}
                            {isExpired && <AlertCircle className="h-3.5 w-3.5" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(quote.createdAt)}
                        </TableCell>
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
                                  詳細を見る
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                編集
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="mr-2 h-4 w-4" />
                                複製
                              </DropdownMenuItem>
                              {quote.status === 'draft' && (
                                <DropdownMenuItem>
                                  <Send className="mr-2 h-4 w-4" />
                                  送付
                                </DropdownMenuItem>
                              )}
                              {quote.status === 'accepted' && (
                                <DropdownMenuItem>
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  注文に変換
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
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

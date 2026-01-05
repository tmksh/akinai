'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  DollarSign,
  ShoppingCart,
  AlertCircle,
  Loader2,
  Calendar as CalendarIcon,
  ChevronDown,
  X,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { mockOrders } from '@/lib/mock-data';
import type { OrderStatus, PaymentStatus } from '@/types';
import { cn } from '@/lib/utils';

// 注文ステータス設定
const orderStatusConfig: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }
> = {
  pending: { label: '未処理', variant: 'outline', icon: Clock },
  confirmed: { label: '確認済', variant: 'secondary', icon: CheckCircle },
  processing: { label: '処理中', variant: 'default', icon: Package },
  shipped: { label: '発送済', variant: 'default', icon: Truck },
  delivered: { label: '配達完了', variant: 'secondary', icon: CheckCircle },
  cancelled: { label: 'キャンセル', variant: 'destructive', icon: XCircle },
  refunded: { label: '返金済', variant: 'destructive', icon: XCircle },
};

// 支払いステータス設定
const paymentStatusConfig: Record<
  PaymentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: '未払い', variant: 'outline' },
  paid: { label: '支払済', variant: 'default' },
  failed: { label: '失敗', variant: 'destructive' },
  refunded: { label: '返金済', variant: 'secondary' },
};

// 期間プリセット
type PresetType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'custom';

const presetOptions: { value: PresetType; label: string }[] = [
  { value: 'all', label: 'すべての期間' },
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'week', label: '今週' },
  { value: 'month', label: '今月' },
  { value: 'lastMonth', label: '先月' },
  { value: 'custom', label: 'カスタム期間' },
];

// プリセットから日付範囲を取得
const getPresetDateRange = (preset: PresetType): DateRange | undefined => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return { from: yesterday, to: yesterday };
    }
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { from: weekStart, to: today };
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: monthStart, to: today };
    }
    case 'lastMonth': {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: lastMonthStart, to: lastMonthEnd };
    }
    default:
      return undefined;
  }
};

// 数値フォーマット
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(value);
};

// 日付フォーマット
const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<PresetType>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  // プリセット選択時
  const handlePresetChange = (preset: PresetType) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      setCalendarOpen(true);
    } else {
      setDateRange(getPresetDateRange(preset));
      setCalendarOpen(false);
    }
  };

  // カレンダーで日付選択時
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setDatePreset('custom');
    }
  };

  // 日付フィルターをクリア
  const clearDateFilter = () => {
    setDatePreset('all');
    setDateRange(undefined);
  };

  // 日付表示テキスト
  const getDateDisplayText = () => {
    if (datePreset === 'all') return 'すべての期間';
    if (datePreset === 'custom' && dateRange?.from) {
      if (dateRange.to) {
        return `${format(dateRange.from, 'M/d', { locale: ja })} - ${format(dateRange.to, 'M/d', { locale: ja })}`;
      }
      return format(dateRange.from, 'M/d', { locale: ja });
    }
    return presetOptions.find(o => o.value === datePreset)?.label || 'すべての期間';
  };

  // フィルタリング
  const filteredOrders = useMemo(() => {
    return mockOrders.filter((order) => {
      // テキスト検索
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
      
      // ステータスフィルター
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      // 支払いフィルター
      const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;
      
      // 日付フィルター
      let matchesDate = true;
      if (dateRange?.from) {
        const orderDate = new Date(order.createdAt);
        const startOfDay = new Date(dateRange.from);
        startOfDay.setHours(0, 0, 0, 0);
        
        if (dateRange.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          matchesDate = orderDate >= startOfDay && orderDate <= endOfDay;
        } else {
          matchesDate = orderDate >= startOfDay;
        }
      }
      
      return matchesSearch && matchesStatus && matchesPayment && matchesDate;
    });
  }, [searchQuery, statusFilter, paymentFilter, dateRange]);

  // 統計計算
  const stats = useMemo(() => {
    const totalRevenue = filteredOrders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = filteredOrders.filter((o) => o.status === 'pending').length;
    const processingOrders = filteredOrders.filter((o) => o.status === 'processing').length;
    return { totalRevenue, pendingOrders, processingOrders, totalOrders: filteredOrders.length };
  }, [filteredOrders]);

  // フィルターをリセット
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setDatePreset('all');
    setDateRange(undefined);
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || datePreset !== 'all';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ページヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">注文管理</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            注文の確認・処理・発送管理を行います
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">CSVエクスポート</span>
          <span className="sm:hidden">CSV</span>
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100/50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/40 border border-orange-100 dark:border-orange-800/30 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <DollarSign className="h-4 w-4 text-orange-500" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-orange-700 dark:text-orange-300">総売上</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{formatCurrency(stats.totalRevenue)}</p>
        </div>
        
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-100 via-orange-200/60 to-amber-100 dark:from-orange-900/50 dark:via-orange-800/40 dark:to-amber-900/50 border border-orange-200 dark:border-orange-700/40 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <ShoppingCart className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-orange-800 dark:text-orange-200">注文数</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.totalOrders}</p>
        </div>
        
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-200 via-orange-300/70 to-amber-200 dark:from-orange-800/60 dark:via-orange-700/50 dark:to-amber-800/60 border border-orange-300 dark:border-orange-600/50 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70">
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-orange-800 dark:text-orange-200">未処理</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.pendingOrders}</p>
        </div>
        
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 dark:from-orange-600 dark:via-orange-500 dark:to-amber-600 border border-orange-400 dark:border-orange-500 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/30">
              <Loader2 className="h-4 w-4 text-white" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-white/90">処理中</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-white">{stats.processingOrders}</p>
        </div>
      </div>

      {/* フィルター・検索 */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-3">
          <div className="flex flex-col gap-3">
            {/* 上段：検索 + 日付フィルター */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="注文番号・顧客名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
              
              {/* 日付フィルター（プリセット + カレンダー） */}
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "sm:w-[200px] justify-between",
                      datePreset !== 'all' && "border-orange-300 bg-orange-50 text-orange-700"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span className="text-sm truncate">{getDateDisplayText()}</span>
                    </div>
                    {datePreset !== 'all' ? (
                      <X 
                        className="h-4 w-4 hover:text-destructive" 
                        onClick={(e) => {
                          e.stopPropagation();
                          clearDateFilter();
                        }}
                      />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="flex">
                    {/* プリセット選択 */}
                    <div className="border-r p-2 space-y-1">
                      {presetOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handlePresetChange(option.value)}
                          className={cn(
                            "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                            datePreset === option.value
                              ? "bg-orange-100 text-orange-700 font-medium"
                              : "hover:bg-muted"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {/* カレンダー */}
                    <div className="p-2">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={handleDateRangeSelect}
                        numberOfMonths={1}
                        locale={ja}
                        disabled={{ after: new Date() }}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* 下段：ステータス + 支払い + リセット */}
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] text-sm">
                  <Filter className="mr-1 h-4 w-4" />
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="pending">未処理</SelectItem>
                  <SelectItem value="confirmed">確認済</SelectItem>
                  <SelectItem value="processing">処理中</SelectItem>
                  <SelectItem value="shipped">発送済</SelectItem>
                  <SelectItem value="delivered">配達完了</SelectItem>
                  <SelectItem value="cancelled">キャンセル</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-[130px] text-sm">
                  <SelectValue placeholder="支払状況" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="pending">未払い</SelectItem>
                  <SelectItem value="paid">支払済</SelectItem>
                  <SelectItem value="failed">失敗</SelectItem>
                  <SelectItem value="refunded">返金済</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground">
                  リセット
                </Button>
              )}
              <div className="ml-auto text-xs text-muted-foreground">
                {filteredOrders.length}件表示
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>注文番号</TableHead>
                  <TableHead>顧客</TableHead>
                  <TableHead>商品数</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>支払状況</TableHead>
                  <TableHead>日時</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">該当する注文がありません</p>
                        {hasActiveFilters && (
                          <Button variant="link" size="sm" onClick={resetFilters}>
                            フィルターをリセット
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const StatusIcon = orderStatusConfig[order.status].icon;
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link
                            href={`/orders/${order.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {order.customerEmail}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)}点
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={orderStatusConfig[order.status].variant}
                            className="gap-1"
                          >
                            <StatusIcon className="h-3 w-3" />
                            {orderStatusConfig[order.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={paymentStatusConfig[order.paymentStatus].variant}
                          >
                            {paymentStatusConfig[order.paymentStatus].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">メニュー</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/orders/${order.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  詳細を見る
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {order.status === 'pending' && (
                                <DropdownMenuItem>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  注文を確認
                                </DropdownMenuItem>
                              )}
                              {order.status === 'processing' && (
                                <DropdownMenuItem>
                                  <Truck className="mr-2 h-4 w-4" />
                                  発送処理
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-destructive">
                                <XCircle className="mr-2 h-4 w-4" />
                                キャンセル
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

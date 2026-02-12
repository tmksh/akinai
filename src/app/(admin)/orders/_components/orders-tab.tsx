'use client';

import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useOrganization } from '@/components/providers/organization-provider';
import { getOrders } from '@/lib/actions/orders';
import {
  Search,
  Filter,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import type { Order, OrderStatus, PaymentStatus } from '@/types';
import { cn } from '@/lib/utils';

const orderStatusConfig: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }
> = {
  pending: { label: '新規', variant: 'outline', icon: Clock },
  confirmed: { label: '確認済み', variant: 'secondary', icon: CheckCircle },
  processing: { label: '準備中', variant: 'default', icon: Package },
  shipped: { label: '発送済み', variant: 'default', icon: Truck },
  delivered: { label: 'お届け済み', variant: 'secondary', icon: CheckCircle },
  cancelled: { label: '取り消し', variant: 'destructive', icon: XCircle },
  refunded: { label: '返金済み', variant: 'destructive', icon: XCircle },
};

const paymentStatusConfig: Record<
  PaymentStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  pending: { label: '未払い', variant: 'outline' },
  paid: { label: '入金済み', variant: 'default' },
  failed: { label: '決済エラー', variant: 'destructive' },
  refunded: { label: '返金済み', variant: 'secondary' },
};

type PresetType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'custom';

const presetOptions: { value: PresetType; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'week', label: '今週' },
  { value: 'month', label: '今月' },
  { value: 'lastMonth', label: '先月' },
  { value: 'custom', label: '日付を指定' },
];

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// 注文行をメモ化
const OrderRow = memo(function OrderRow({
  order,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  const StatusIcon = orderStatusConfig[order.status].icon;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <TableRow
      className="cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors"
      onClick={onClick}
    >
      <TableCell>
        <span className="font-medium text-orange-600 dark:text-orange-400">
          {order.orderNumber}
        </span>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{order.customerName}</p>
          <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
        </div>
      </TableCell>
      <TableCell>{itemCount}点</TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(order.total)}
      </TableCell>
      <TableCell>
        <Badge variant={orderStatusConfig[order.status].variant} className="gap-1">
          <StatusIcon className="h-3 w-3" />
          {orderStatusConfig[order.status].label}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={paymentStatusConfig[order.paymentStatus].variant}>
          {paymentStatusConfig[order.paymentStatus].label}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDateTime(order.createdAt)}
      </TableCell>
      <TableCell>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </TableCell>
    </TableRow>
  );
});

function mapOrderFromApi(row: Record<string, unknown>): Order {
  const items = (row.items as Record<string, unknown>[] || []).map((item) => ({
    id: item.id as string,
    productId: item.product_id as string,
    variantId: item.variant_id as string,
    productName: (item.product_name as string) ?? '',
    variantName: (item.variant_name as string) ?? '',
    sku: (item.sku as string) ?? '',
    quantity: (item.quantity as number) ?? 0,
    unitPrice: (item.unit_price as number) ?? 0,
    totalPrice: (item.total_price as number) ?? 0,
  }));
  return {
    id: row.id as string,
    orderNumber: (row.order_number as string) ?? '',
    customerId: (row.customer_id as string) ?? '',
    customerName: (row.customer_name as string) ?? '',
    customerEmail: (row.customer_email as string) ?? '',
    items,
    subtotal: (row.subtotal as number) ?? 0,
    shippingCost: (row.shipping_cost as number) ?? 0,
    tax: (row.tax as number) ?? 0,
    total: (row.total as number) ?? 0,
    status: (row.status as OrderStatus) ?? 'pending',
    paymentStatus: (row.payment_status as PaymentStatus) ?? 'pending',
    paymentMethod: (row.payment_method as string) ?? '',
    shippingAddress: (row.shipping_address as Order['shippingAddress']) ?? { postalCode: '', prefecture: '', city: '', line1: '', phone: '' },
    billingAddress: row.billing_address as Order['billingAddress'] | undefined,
    notes: row.notes as string | undefined,
    trackingNumber: row.tracking_number as string | undefined,
    shippedAt: row.shipped_at as string | undefined,
    deliveredAt: row.delivered_at as string | undefined,
    createdAt: (row.created_at as string) ?? '',
    updatedAt: (row.updated_at as string) ?? '',
  };
}

export function OrdersTab() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<PresetType>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (!organization?.id) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }
    let cancelled = false;
    setOrdersLoading(true);
    getOrders(organization.id).then(({ data, error }) => {
      if (cancelled) return;
      setOrdersLoading(false);
      if (error || !data) {
        setOrders([]);
        return;
      }
      setOrders(data.map((o) => mapOrderFromApi(o as Record<string, unknown>)));
    });
    return () => { cancelled = true; };
  }, [organization?.id]);

  const handlePresetChange = useCallback((preset: PresetType) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      setCalendarOpen(true);
    } else {
      setDateRange(getPresetDateRange(preset));
      setCalendarOpen(false);
    }
  }, []);

  const handleDateRangeSelect = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      setDatePreset('custom');
    }
  }, []);

  const clearDateFilter = useCallback(() => {
    setDatePreset('all');
    setDateRange(undefined);
  }, []);

  const getDateDisplayText = useCallback(() => {
    if (datePreset === 'all') return 'すべての期間';
    if (datePreset === 'custom' && dateRange?.from) {
      if (dateRange.to) {
        return `${format(dateRange.from, 'M/d', { locale: ja })} 〜 ${format(dateRange.to, 'M/d', { locale: ja })}`;
      }
      return format(dateRange.from, 'M/d', { locale: ja });
    }
    return presetOptions.find((o) => o.value === datePreset)?.label || 'すべての期間';
  }, [datePreset, dateRange]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(query) ||
        order.customerName.toLowerCase().includes(query) ||
        order.customerEmail.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || order.paymentStatus === paymentFilter;

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
  }, [orders, searchQuery, statusFilter, paymentFilter, dateRange]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setDatePreset('all');
    setDateRange(undefined);
  }, []);

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || datePreset !== 'all';

  const handleOrderClick = useCallback(
    (orderId: string) => {
      router.push(`/orders/${orderId}`);
    },
    [router]
  );

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="注文番号やお客様名で探す..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'sm:w-[200px] justify-between',
                  datePreset !== 'all' && 'border-orange-300 bg-orange-50 text-orange-700'
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
                <div className="border-r p-2 space-y-1">
                  {presetOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handlePresetChange(option.value)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm rounded-md transition-colors',
                        datePreset === option.value
                          ? 'bg-orange-100 text-orange-700 font-medium'
                          : 'hover:bg-muted'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
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

          <Button variant="outline" size="sm" className="sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">データを書き出す</span>
            <span className="sm:hidden">書き出し</span>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] text-sm">
              <Filter className="mr-1 h-4 w-4" />
              <SelectValue placeholder="注文の状態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="pending">新規</SelectItem>
              <SelectItem value="confirmed">確認済み</SelectItem>
              <SelectItem value="processing">準備中</SelectItem>
              <SelectItem value="shipped">発送済み</SelectItem>
              <SelectItem value="delivered">お届け済み</SelectItem>
              <SelectItem value="cancelled">取り消し</SelectItem>
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[130px] text-sm">
              <SelectValue placeholder="入金の状態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="pending">未払い</SelectItem>
              <SelectItem value="paid">入金済み</SelectItem>
              <SelectItem value="failed">決済エラー</SelectItem>
              <SelectItem value="refunded">返金済み</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              条件をクリア
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">{filteredOrders.length}件</div>
        </div>
      </div>

      {/* テーブル */}
      <div className="rounded-lg border overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>注文番号</TableHead>
              <TableHead>お客様</TableHead>
              <TableHead>商品数</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead>注文の状態</TableHead>
              <TableHead>入金の状態</TableHead>
              <TableHead>注文日</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordersLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">条件に合う注文が見つかりませんでした</p>
                    {hasActiveFilters && (
                      <Button variant="link" size="sm" onClick={resetFilters}>
                        条件をクリアして全件表示
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onClick={() => handleOrderClick(order.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

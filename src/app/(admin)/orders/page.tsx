'use client';

import { useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { mockOrders } from '@/lib/mock-data';
import type { OrderStatus, PaymentStatus } from '@/types';

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

  // フィルタリング
  const filteredOrders = mockOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter;
    const matchesPayment =
      paymentFilter === 'all' || order.paymentStatus === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  // 統計計算
  const totalRevenue = mockOrders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = mockOrders.filter((o) => o.status === 'pending').length;
  const processingOrders = mockOrders.filter(
    (o) => o.status === 'processing'
  ).length;

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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card className="widget-card-pink border-0 shadow-lg">
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-white/80 text-[10px] sm:text-sm">総売上（支払済）</CardDescription>
            <CardTitle className="text-lg sm:text-3xl font-bold text-white">{formatCurrency(totalRevenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="widget-card-purple border-0 shadow-lg">
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-white/80 text-[10px] sm:text-sm">全注文数</CardDescription>
            <CardTitle className="text-lg sm:text-3xl font-bold text-white">{mockOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="widget-card-orange border-0 shadow-lg">
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-white/80 text-[10px] sm:text-sm">未処理</CardDescription>
            <CardTitle className="text-lg sm:text-3xl font-bold text-white">
              {pendingOrders}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="widget-card-cyan border-0 shadow-lg">
          <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
            <CardDescription className="text-white/80 text-[10px] sm:text-sm">処理中</CardDescription>
            <CardTitle className="text-lg sm:text-3xl font-bold text-white">{processingOrders}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* フィルター・検索 */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="注文番号・顧客名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] sm:w-[140px] text-sm">
                  <Filter className="mr-1 sm:mr-2 h-4 w-4" />
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
                <SelectTrigger className="w-[120px] sm:w-[140px] text-sm">
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
                      該当する注文がありません
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


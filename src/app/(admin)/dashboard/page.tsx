'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  ArrowRight,
  AlertCircle,
  GripVertical,
  Lock,
  Unlock,
  CreditCard,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  mockDashboardStats,
  mockRevenueData,
  mockTopProducts,
  mockRecentOrders,
  mockInventorySummary,
} from '@/lib/mock-data';
import type { OrderStatus } from '@/types';
import { cn } from '@/lib/utils';

// ステータスの表示設定
const orderStatusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '未処理', variant: 'outline' },
  confirmed: { label: '確認済', variant: 'secondary' },
  processing: { label: '処理中', variant: 'default' },
  shipped: { label: '発送済', variant: 'default' },
  delivered: { label: '配達完了', variant: 'secondary' },
  cancelled: { label: 'キャンセル', variant: 'destructive' },
  refunded: { label: '返金済', variant: 'destructive' },
};

// チャート設定 - オレンジ系で統一
const revenueChartConfig = {
  revenue: { label: '売上', color: '#f97316' },
} satisfies ChartConfig;

const ordersChartConfig = {
  orders: { label: '注文数', color: '#fb923c' },
} satisfies ChartConfig;

// 数値フォーマット
const formatCurrency = (value: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
const formatNumber = (value: number) => new Intl.NumberFormat('ja-JP').format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

// 大きな数字を短縮表示（統計カード用）
const formatCompactNumber = (value: number): string => {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}億`;
  }
  if (value >= 10000) {
    return `${Math.round(value / 10000)}万`;
  }
  return formatNumber(value);
};

const formatCompactCurrency = (value: number): string => {
  if (value >= 100000000) {
    return `¥${(value / 100000000).toFixed(1)}億`;
  }
  if (value >= 10000) {
    return `¥${Math.round(value / 10000)}万`;
  }
  return `¥${formatNumber(value)}`;
};

// ソート可能なウィジェットコンポーネント
function SortableWidget({ id, isEditing, children, className }: { id: string; isEditing: boolean; children: React.ReactNode; className?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("relative group/widget", className, isDragging && "shadow-2xl")}>
      {isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-orange-500 cursor-grab active:cursor-grabbing z-20 shadow-lg hover:bg-orange-600 transition-all opacity-0 group-hover/widget:opacity-100"
        >
          <GripVertical className="h-4 w-4 text-white" />
        </div>
      )}
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const stats = mockDashboardStats;
  const lowStockItems = mockInventorySummary.filter((item) => item.isLowStock);
  const [isEditing, setIsEditing] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState(['revenue-chart', 'orders-chart', 'recent-orders', 'popular-products', 'stock-alert']);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ローカルストレージから読み込み
  useEffect(() => {
    const saved = localStorage.getItem('dashboardWidgetOrder');
    if (saved) {
      try {
        setWidgetOrder(JSON.parse(saved));
      } catch (e) { console.error('Failed to parse saved order'); }
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('dashboardWidgetOrder', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }, []);

  const resetLayout = () => {
    const defaultOrder = ['revenue-chart', 'orders-chart', 'recent-orders', 'popular-products', 'stock-alert'];
    setWidgetOrder(defaultOrder);
    localStorage.removeItem('dashboardWidgetOrder');
  };

  // ウィジェットのレンダリング関数
  const renderWidget = (id: string) => {
    switch (id) {
      case 'revenue-chart':
        return (
          <Card className="h-full border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">売上推移</CardTitle>
                  <CardDescription className="text-xs text-slate-400">過去7日間</CardDescription>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg btn-premium">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <ChartContainer config={revenueChartConfig} className="h-[180px] sm:h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockRevenueData}>
                    <defs>
                      <linearGradient id="fillRevenuePremium" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff8a47" stopOpacity={0.5} />
                        <stop offset="30%" stopColor="#ff6b35" stopOpacity={0.4} />
                        <stop offset="60%" stopColor="#f7931e" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#e85d04" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="strokeRevenuePremium" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#e85d04" />
                        <stop offset="50%" stopColor="#ff6b35" />
                        <stop offset="100%" stopColor="#f7931e" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                    <Area type="monotone" dataKey="revenue" stroke="url(#strokeRevenuePremium)" strokeWidth={3} fillOpacity={1} fill="url(#fillRevenuePremium)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        );

      case 'orders-chart':
        return (
          <Card className="h-full border-0 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">注文数推移</CardTitle>
                  <CardDescription className="text-xs text-slate-400">過去7日間</CardDescription>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg btn-premium">
                  <ShoppingCart className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <ChartContainer config={ordersChartConfig} className="h-[180px] sm:h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockRevenueData}>
                    <defs>
                      <linearGradient id="barGradientPremium" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff8a47" />
                        <stop offset="50%" stopColor="#f7931e" />
                        <stop offset="100%" stopColor="#e85d04" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="orders" fill="url(#barGradientPremium)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        );

      case 'recent-orders':
        return (
          <Card className="h-full border-0 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950">
                    <CreditCard className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">最近の注文</CardTitle>
                    <CardDescription className="text-xs">直近の注文一覧</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 h-8 px-3" asChild>
                  <Link href="/orders">すべて見る<ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-1">
              {mockRecentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {order.customerName.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{order.orderNumber}</p>
                      <p className="text-xs text-slate-500">{order.customerName}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(order.total)}</p>
                    <Badge className={cn(
                      "text-[10px] font-medium rounded-full px-2 py-0.5",
                      order.status === 'pending' && "bg-amber-50 text-amber-600 border-amber-200",
                      order.status === 'processing' && "bg-blue-50 text-blue-600 border-blue-200",
                      order.status === 'delivered' && "bg-emerald-50 text-emerald-600 border-emerald-200",
                    )} variant="outline">
                      {orderStatusConfig[order.status].label}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 'popular-products':
        return (
          <Card className="h-full border-0 shadow-sm bg-white dark:bg-slate-900">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950">
                    <Package className="h-4 w-4 text-orange-500" />
                  </div>
                  <CardTitle className="text-sm font-medium">人気商品</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-orange-500" asChild>
                  <Link href="/products"><ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
              {mockTopProducts.slice(0, 4).map((product, index) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-4">{index + 1}</span>
                  <Avatar className="h-10 w-10 rounded-lg border border-slate-100 dark:border-slate-800">
                    <AvatarImage src={product.image} className="object-cover" />
                    <AvatarFallback className="text-xs bg-slate-100 dark:bg-slate-800 rounded-lg">{product.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.sales}件販売</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );

      case 'stock-alert':
        return (
          <Card className={cn(
            "h-full border-0 shadow-sm",
            lowStockItems.length > 0 ? "bg-orange-50 dark:bg-orange-950/30" : "bg-white dark:bg-slate-900"
          )}>
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  lowStockItems.length > 0 ? "bg-orange-100 dark:bg-orange-900" : "bg-slate-100 dark:bg-slate-800"
                )}>
                  <AlertCircle className={cn("h-4 w-4", lowStockItems.length > 0 ? "text-orange-500" : "text-slate-400")} />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium">在庫アラート</CardTitle>
                  {lowStockItems.length > 0 && <CardDescription className="text-xs text-orange-600">{lowStockItems.length}件の警告</CardDescription>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {lowStockItems.length > 0 ? (
                <div className="space-y-3">
                  {lowStockItems.map((item) => (
                    <div key={`${item.productId}-${item.variantId}`} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border border-orange-100 dark:border-orange-900">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                          <Package className="h-4 w-4 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.productName}</p>
                          <p className="text-xs text-slate-500">{item.variantName}</p>
                        </div>
                      </div>
                      <Badge className="bg-orange-500 text-white border-0 rounded-full text-xs px-2">
                        残り{item.availableStock}点
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950 mb-3">
                    <Package className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-sm text-slate-500">在庫は十分です</p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  // ウィジェットのサイズクラス
  const getWidgetClass = (id: string) => {
    switch (id) {
      case 'revenue-chart':
      case 'orders-chart':
        return 'col-span-1';
      case 'recent-orders':
        return 'col-span-1 lg:col-span-2';
      case 'popular-products':
      case 'stock-alert':
        return 'col-span-1';
      default:
        return 'col-span-1';
    }
  };

  return (
    <div className="space-y-6">
      {/* ページタイトル */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">ダッシュボード</h1>
          <p className="text-sm text-slate-500 hidden sm:block">ショップの概要と最新情報</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className={cn("hidden sm:flex border-slate-200 text-slate-600", isEditing && "btn-premium")}
          >
            {isEditing ? (<><Lock className="mr-2 h-4 w-4" />完了</>) : (<><Unlock className="mr-2 h-4 w-4" />編集</>)}
          </Button>
          {isEditing && <Button variant="outline" size="sm" className="hidden sm:flex border-slate-200" onClick={resetLayout}>リセット</Button>}
          <Button className="btn-premium text-sm" size="sm" asChild>
            <Link href="/reports">レポートを見る</Link>
          </Button>
        </div>
      </div>

      {/* メイン統計カード - 横4枚レイアウト */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {/* 総売上 - 薄いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100/50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/40 border border-orange-100 dark:border-orange-800/30 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <DollarSign className="h-4 w-4 text-orange-500" />
            </div>
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">総売上</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-orange-900 dark:text-orange-100 whitespace-nowrap">{formatCompactCurrency(stats.totalRevenue)}</p>
          <div className="flex items-center gap-1 mt-1">
            {stats.revenueChange >= 0 ? (
              <><TrendingUp className="h-3 w-3 text-emerald-500" /><span className="text-xs text-emerald-600">+{stats.revenueChange}%</span></>
            ) : (
              <><TrendingDown className="h-3 w-3 text-red-500" /><span className="text-xs text-red-500">{stats.revenueChange}%</span></>
            )}
          </div>
        </div>

        {/* 注文数 - やや濃いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-100 via-orange-200/60 to-amber-100 dark:from-orange-900/50 dark:via-orange-800/40 dark:to-amber-900/50 border border-orange-200 dark:border-orange-700/40 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <ShoppingCart className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-800 dark:text-orange-200">注文数</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-orange-900 dark:text-orange-100 whitespace-nowrap">{formatCompactNumber(stats.totalOrders)}</p>
          <div className="flex items-center gap-1 mt-1">
            {stats.ordersChange >= 0 ? (
              <><TrendingUp className="h-3 w-3 text-emerald-500" /><span className="text-xs text-emerald-600">+{stats.ordersChange}%</span></>
            ) : (
              <><TrendingDown className="h-3 w-3 text-red-500" /><span className="text-xs text-red-500">{stats.ordersChange}%</span></>
            )}
          </div>
        </div>

        {/* 商品数 - 濃いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-200 via-orange-300/70 to-amber-200 dark:from-orange-800/60 dark:via-orange-700/50 dark:to-amber-800/60 border border-orange-300 dark:border-orange-600/50 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70">
              <Package className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-800 dark:text-orange-200">商品数</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-orange-900 dark:text-orange-100 whitespace-nowrap">{formatCompactNumber(stats.totalProducts)}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span className="text-xs text-emerald-600">+{stats.productsChange}</span>
          </div>
        </div>

        {/* 顧客数 - 最も濃いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 dark:from-orange-600 dark:via-orange-500 dark:to-amber-600 border border-orange-400 dark:border-orange-500 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/30">
              <Users className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-medium text-white/90">顧客数</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white whitespace-nowrap">{formatCompactNumber(stats.totalCustomers)}</p>
          <div className="flex items-center gap-1 mt-1">
            {stats.customersChange >= 0 ? (
              <><TrendingUp className="h-3 w-3 text-white/80" /><span className="text-xs text-white/80">+{stats.customersChange}%</span></>
            ) : (
              <><TrendingDown className="h-3 w-3 text-white/80" /><span className="text-xs text-white/80">{stats.customersChange}%</span></>
            )}
          </div>
        </div>
      </div>

      {/* ドラッグ可能なウィジェットエリア */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {widgetOrder.slice(0, 2).map((id) => (
              <SortableWidget key={id} id={id} isEditing={isEditing} className={getWidgetClass(id)}>
                {renderWidget(id)}
              </SortableWidget>
            ))}
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {widgetOrder.slice(2).map((id) => (
              <SortableWidget key={id} id={id} isEditing={isEditing} className={getWidgetClass(id)}>
                {renderWidget(id)}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

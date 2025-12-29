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

// チャート設定
const revenueChartConfig = {
  revenue: { label: '売上', color: 'oklch(0.7 0.18 50)' },
} satisfies ChartConfig;

const ordersChartConfig = {
  orders: { label: '注文数', color: 'oklch(0.65 0.15 180)' },
} satisfies ChartConfig;

// 数値フォーマット
const formatCurrency = (value: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
const formatNumber = (value: number) => new Intl.NumberFormat('ja-JP').format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

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
          className="absolute top-2 right-2 p-1.5 rounded-lg bg-orange-500/90 cursor-grab active:cursor-grabbing z-20 shadow-lg hover:bg-orange-600 transition-all opacity-0 group-hover/widget:opacity-100"
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
          <Card className="h-full bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-sm sm:text-base">売上推移</CardTitle>
              <CardDescription className="text-xs sm:text-sm">過去7日間の売上推移</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <ChartContainer config={revenueChartConfig} className="h-[180px] sm:h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockRevenueData}>
                    <defs>
                      <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.7 0.18 50)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="oklch(0.7 0.18 50)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tickFormatter={formatDate} className="text-xs" />
                    <YAxis tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                    <Area type="monotone" dataKey="revenue" stroke="oklch(0.7 0.18 50)" fillOpacity={1} fill="url(#fillRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        );

      case 'orders-chart':
        return (
          <Card className="h-full bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2 p-3 sm:p-6 sm:pb-2">
              <CardTitle className="text-sm sm:text-base">注文数推移</CardTitle>
              <CardDescription className="text-xs sm:text-sm">過去7日間の注文数</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
              <ChartContainer config={ordersChartConfig} className="h-[180px] sm:h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tickFormatter={formatDate} className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="orders" fill="oklch(0.65 0.15 180)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        );

      case 'recent-orders':
        return (
          <div className="h-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border shadow-lg">
            <div className="p-4 border-b bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">最近の注文</h3>
                    <p className="text-xs text-muted-foreground">直近の注文一覧</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-full" asChild>
                  <Link href="/orders">すべて見る<ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {mockRecentOrders.map((order) => (
                <div key={order.id} className="group flex items-center justify-between rounded-xl p-3 transition-all hover:bg-gradient-to-r hover:from-purple-500/5 hover:to-pink-500/5 hover:shadow-md border border-transparent hover:border-purple-200/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110",
                      order.status === 'pending' && "bg-amber-100 dark:bg-amber-900/30",
                      order.status === 'processing' && "bg-blue-100 dark:bg-blue-900/30",
                      order.status === 'delivered' && "bg-emerald-100 dark:bg-emerald-900/30",
                    )}>
                      <ShoppingCart className={cn(
                        "h-4 w-4",
                        order.status === 'pending' && "text-amber-600",
                        order.status === 'processing' && "text-blue-600",
                        order.status === 'delivered' && "text-emerald-600",
                      )} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{order.customerName}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <p className="font-bold text-sm">{formatCurrency(order.total)}</p>
                    <Badge className={cn(
                      "text-xs rounded-full px-3",
                      order.status === 'pending' && "bg-amber-100 text-amber-700",
                      order.status === 'processing' && "bg-blue-100 text-blue-700",
                      order.status === 'delivered' && "bg-emerald-100 text-emerald-700",
                    )}>
                      {orderStatusConfig[order.status].label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'popular-products':
        return (
          <div className="h-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border shadow-lg">
            <div className="p-4 border-b bg-gradient-to-r from-blue-500/10 via-transparent to-cyan-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25">
                    <Package className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold">人気商品</h3>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" asChild>
                  <Link href="/products"><ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {mockTopProducts.slice(0, 3).map((product, index) => {
                const rankColors = ["from-amber-400 to-yellow-500", "from-slate-300 to-slate-400", "from-orange-400 to-amber-600"];
                return (
                  <div key={product.id} className="group flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-cyan-500/5">
                    <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-white text-xs font-bold shadow-lg", rankColors[index])}>
                      {index + 1}
                    </div>
                    <Avatar className="h-9 w-9 rounded-lg border-2 border-white shadow-md">
                      <AvatarImage src={product.image} />
                      <AvatarFallback className="text-xs">{product.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sales}件販売</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'stock-alert':
        return (
          <div className={cn(
            "h-full rounded-xl overflow-hidden border shadow-lg",
            lowStockItems.length > 0 
              ? "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200" 
              : "bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800"
          )}>
            <div className={cn(
              "p-4 border-b",
              lowStockItems.length > 0 ? "bg-gradient-to-r from-red-500/10 via-transparent to-orange-500/10" : ""
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl shadow-lg",
                  lowStockItems.length > 0 ? "bg-gradient-to-br from-red-500 to-orange-500" : "bg-gradient-to-br from-slate-400 to-slate-500"
                )}>
                  <AlertCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">在庫アラート</h3>
                  {lowStockItems.length > 0 && <p className="text-xs text-red-600">{lowStockItems.length}件の警告</p>}
                </div>
              </div>
            </div>
            <div className="p-4">
              {lowStockItems.length > 0 ? (
                <div className="space-y-2">
                  {lowStockItems.map((item) => (
                    <div key={`${item.productId}-${item.variantId}`} className="flex items-center justify-between rounded-xl bg-white/60 dark:bg-slate-800/60 p-3 border border-red-200/50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                          <Package className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.variantName}</p>
                        </div>
                      </div>
                      <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 rounded-full px-3">
                        残り{item.availableStock}点
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-2">
                    <Package className="h-6 w-6 text-emerald-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">在庫は十分です</p>
                </div>
              )}
            </div>
          </div>
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
    <div className="space-y-4">
      {/* ページタイトル */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">ショップの概要と最新情報をご確認ください</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className={cn("hidden sm:flex", isEditing && "bg-orange-500 hover:bg-orange-600")}
          >
            {isEditing ? (<><Lock className="mr-2 h-4 w-4" />編集完了</>) : (<><Unlock className="mr-2 h-4 w-4" />レイアウト編集</>)}
          </Button>
          {isEditing && <Button variant="outline" size="sm" className="hidden sm:flex" onClick={resetLayout}>リセット</Button>}
          <Button className="gradient-brand text-white hover:opacity-90 text-sm" size="sm" asChild>
            <Link href="/reports">レポートを見る</Link>
          </Button>
        </div>
      </div>

      {/* 統計カード（固定） */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* 総売上 */}
        <div className="h-[100px] sm:h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-pink-400 via-pink-500 to-rose-500 p-3 sm:p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
            <path d="M100,20 C70,35 85,60 70,100 L100,100 Z" fill="white" opacity="0.5"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-[10px] sm:text-xs font-medium">総売上</p>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                {stats.revenueChange >= 0 ? (<><TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" /><span className="text-white font-medium">+{stats.revenueChange}%</span></>) : (<><TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/80" /><span className="text-white/80 font-medium">{stats.revenueChange}%</span></>)}
                <span className="text-white/70 hidden sm:inline">先月比</span>
              </div>
            </div>
          </div>
        </div>

        {/* 注文数 */}
        <div className="h-[100px] sm:h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-violet-500 via-purple-500 to-purple-600 p-3 sm:p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
            <path d="M100,20 C70,35 85,60 70,100 L100,100 Z" fill="white" opacity="0.5"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-[10px] sm:text-xs font-medium">注文数</p>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-white">{formatNumber(stats.totalOrders)}</div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                {stats.ordersChange >= 0 ? (<><TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" /><span className="text-white font-medium">+{stats.ordersChange}%</span></>) : (<><TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/80" /><span className="text-white/80 font-medium">{stats.ordersChange}%</span></>)}
                <span className="text-white/70 hidden sm:inline">先月比</span>
              </div>
            </div>
          </div>
        </div>

        {/* 商品数 */}
        <div className="h-[100px] sm:h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-500 p-3 sm:p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
            <path d="M100,20 C70,35 85,60 70,100 L100,100 Z" fill="white" opacity="0.5"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-[10px] sm:text-xs font-medium">商品数</p>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-white">{formatNumber(stats.totalProducts)}</div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" />
                <span className="text-white font-medium">+{stats.productsChange}</span>
                <span className="text-white/70 hidden sm:inline">今月追加</span>
              </div>
            </div>
          </div>
        </div>

        {/* 顧客数 */}
        <div className="h-[100px] sm:h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 p-3 sm:p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
            <path d="M100,20 C70,35 85,60 70,100 L100,100 Z" fill="white" opacity="0.5"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-[10px] sm:text-xs font-medium">顧客数</p>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-white">{formatNumber(stats.totalCustomers)}</div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs mt-0.5 sm:mt-1">
                {stats.customersChange >= 0 ? (<><TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white" /><span className="text-white font-medium">+{stats.customersChange}%</span></>) : (<><TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-white/80" /><span className="text-white/80 font-medium">{stats.customersChange}%</span></>)}
                <span className="text-white/70 hidden sm:inline">先月比</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ドラッグ可能なウィジェットエリア */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
            {widgetOrder.slice(0, 2).map((id) => (
              <SortableWidget key={id} id={id} isEditing={isEditing} className={getWidgetClass(id)}>
                {renderWidget(id)}
              </SortableWidget>
            ))}
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-3 sm:mt-4">
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

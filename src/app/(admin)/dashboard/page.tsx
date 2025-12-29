'use client';

import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  ArrowRight,
  AlertCircle,
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
  revenue: {
    label: '売上',
    color: 'oklch(0.7 0.18 50)',
  },
} satisfies ChartConfig;

const ordersChartConfig = {
  orders: {
    label: '注文数',
    color: 'oklch(0.65 0.15 180)',
  },
} satisfies ChartConfig;

// 数値フォーマット
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('ja-JP').format(value);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
};

export default function DashboardPage() {
  const stats = mockDashboardStats;
  const lowStockItems = mockInventorySummary.filter((item) => item.isLowStock);

  return (
    <div className="space-y-4">
      {/* ページタイトル */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="text-muted-foreground">
            ショップの概要と最新情報をご確認ください
          </p>
        </div>
        <Button className="gradient-brand text-white hover:opacity-90" asChild>
          <Link href="/reports">レポートを見る</Link>
        </Button>
      </div>

      {/* 統計カード（固定高さ） */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 総売上 */}
        <div className="h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-pink-400 via-pink-500 to-rose-500 p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
            <path d="M100,20 C70,35 85,60 70,100 L100,100 Z" fill="white" opacity="0.5"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <DollarSign className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-medium">総売上</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</div>
              <div className="flex items-center gap-1 text-xs mt-1">
                {stats.revenueChange >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-white" />
                    <span className="text-white font-medium">+{stats.revenueChange}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-white/80" />
                    <span className="text-white/80 font-medium">{stats.revenueChange}%</span>
                  </>
                )}
                <span className="text-white/70">先月比</span>
              </div>
            </div>
          </div>
        </div>

        {/* 注文数 */}
        <div className="h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-violet-500 via-purple-500 to-purple-600 p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
            <path d="M100,20 C70,35 85,60 70,100 L100,100 Z" fill="white" opacity="0.5"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <ShoppingCart className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-medium">注文数</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{formatNumber(stats.totalOrders)}</div>
              <div className="flex items-center gap-1 text-xs mt-1">
                {stats.ordersChange >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-white" />
                    <span className="text-white font-medium">+{stats.ordersChange}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-white/80" />
                    <span className="text-white/80 font-medium">{stats.ordersChange}%</span>
                  </>
                )}
                <span className="text-white/70">先月比</span>
              </div>
            </div>
          </div>
        </div>

        {/* 商品数 */}
        <div className="h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-500 p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
            <path d="M100,20 C70,35 85,60 70,100 L100,100 Z" fill="white" opacity="0.5"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Package className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-medium">商品数</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{formatNumber(stats.totalProducts)}</div>
              <div className="flex items-center gap-1 text-xs mt-1">
                <TrendingUp className="h-3 w-3 text-white" />
                <span className="text-white font-medium">+{stats.productsChange}</span>
                <span className="text-white/70">今月追加</span>
              </div>
            </div>
          </div>
        </div>

        {/* 顧客数 */}
        <div className="h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
            <path d="M100,20 C70,35 85,60 70,100 L100,100 Z" fill="white" opacity="0.5"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Users className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-xs font-medium">顧客数</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{formatNumber(stats.totalCustomers)}</div>
              <div className="flex items-center gap-1 text-xs mt-1">
                {stats.customersChange >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-white" />
                    <span className="text-white font-medium">+{stats.customersChange}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-white/80" />
                    <span className="text-white/80 font-medium">{stats.customersChange}%</span>
                  </>
                )}
                <span className="text-white/70">先月比</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* チャートセクション */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 売上推移チャート */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">売上推移</CardTitle>
            <CardDescription>過去7日間の売上推移</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockRevenueData}>
                  <defs>
                    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="oklch(0.7 0.18 50)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="oklch(0.7 0.18 50)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    className="text-xs"
                  />
                  <YAxis
                    tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                    className="text-xs"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="oklch(0.7 0.18 50)"
                    fillOpacity={1}
                    fill="url(#fillRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* 注文数推移チャート */}
        <Card className="bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">注文数推移</CardTitle>
            <CardDescription>過去7日間の注文数</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ordersChartConfig} className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="orders"
                    fill="oklch(0.65 0.15 180)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* 下部セクション */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 最近の注文 */}
        <Card className="lg:col-span-2 bg-card/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">最近の注文</CardTitle>
              <CardDescription>直近の注文一覧</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/orders">
                すべて見る
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockRecentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.customerName}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatCurrency(order.total)}</p>
                    <Badge variant={orderStatusConfig[order.status].variant} className="text-xs">
                      {orderStatusConfig[order.status].label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 人気商品 & 在庫アラート */}
        <div className="space-y-4">
          {/* 人気商品 */}
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">人気商品</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/products">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockTopProducts.slice(0, 3).map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <Avatar className="h-7 w-7 rounded">
                      <AvatarImage src={product.image} />
                      <AvatarFallback className="text-xs">{product.name.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sales}件販売
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 在庫アラート */}
          <Card className={cn("bg-card/80 backdrop-blur-sm", lowStockItems.length > 0 && "border-destructive/50")}>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <AlertCircle className={cn("h-5 w-5", lowStockItems.length > 0 ? "text-destructive" : "text-muted-foreground")} />
              <CardTitle className="text-base">在庫アラート</CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length > 0 ? (
                <div className="space-y-2">
                  {lowStockItems.map((item) => (
                    <div
                      key={`${item.productId}-${item.variantId}`}
                      className="flex items-center justify-between rounded bg-destructive/10 p-2 text-sm"
                    >
                      <div>
                        <p className="font-medium text-xs">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.variantName}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">残り{item.availableStock}点</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">在庫アラートはありません</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

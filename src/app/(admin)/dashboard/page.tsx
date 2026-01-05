'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  ArrowRight,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
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
const orderStatusConfig: Record<OrderStatus, { label: string; color: string }> = {
  pending: { label: '入金待ち', color: 'bg-amber-100 text-amber-700' },
  confirmed: { label: '確認済', color: 'bg-blue-100 text-blue-700' },
  processing: { label: '対応中', color: 'bg-orange-100 text-orange-700' },
  shipped: { label: '発送済', color: 'bg-emerald-100 text-emerald-700' },
  delivered: { label: '対応済', color: 'bg-slate-100 text-slate-700' },
  cancelled: { label: 'キャンセル', color: 'bg-red-100 text-red-700' },
  refunded: { label: '返金済', color: 'bg-red-100 text-red-700' },
};

// 数値フォーマット
const formatCurrency = (value: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
const formatNumber = (value: number) => new Intl.NumberFormat('ja-JP').format(value);
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });

// 大きな数字を短縮表示
const formatCompactCurrency = (value: number): string => {
  if (value >= 100000000) return `¥${(value / 100000000).toFixed(1)}億`;
  if (value >= 10000) return `¥${Math.round(value / 10000)}万`;
  return `¥${formatNumber(value)}`;
};

// 期間タイプ
type PeriodType = 'month' | 'year' | 'total';
type ChartPeriodType = 'week' | 'month' | 'year';

// 期間別のモックデータ
const getStatsByPeriod = (period: PeriodType) => {
  switch (period) {
    case 'month':
      return { totalRevenue: 2580000, revenueChange: 12.5, totalOrders: 156, ordersChange: 8.2, totalCustomers: 89, customersChange: 15.3 };
    case 'year':
      return { totalRevenue: 28500000, revenueChange: 23.4, totalOrders: 1842, ordersChange: 18.7, totalCustomers: 567, customersChange: 42.1 };
    case 'total':
      return { totalRevenue: 125800000, revenueChange: 0, totalOrders: 8934, ordersChange: 0, totalCustomers: 2341, customersChange: 0 };
  }
};

const getChartDataByPeriod = (period: ChartPeriodType) => {
  switch (period) {
    case 'week': return mockRevenueData;
    case 'month':
      return [
        { date: '2024-01-01', revenue: 850000 },
        { date: '2024-01-08', revenue: 920000 },
        { date: '2024-01-15', revenue: 780000 },
        { date: '2024-01-22', revenue: 1050000 },
      ];
    case 'year':
      return [
        { date: '1月', revenue: 2100000 },
        { date: '2月', revenue: 1950000 },
        { date: '3月', revenue: 2400000 },
        { date: '4月', revenue: 2200000 },
        { date: '5月', revenue: 2650000 },
        { date: '6月', revenue: 2800000 },
      ];
  }
};

const periodLabels: Record<PeriodType, string> = { month: '月', year: '年', total: '総計' };

// カテゴリ別売上データ（ドーナツチャート用）
const categoryData = [
  { name: 'アパレル', value: 45, color: '#f97316' },
  { name: '雑貨', value: 25, color: '#fb923c' },
  { name: '食品', value: 20, color: '#fdba74' },
  { name: 'その他', value: 10, color: '#fed7aa' },
];

export default function DashboardPage() {
  const lowStockItems = mockInventorySummary.filter((item) => item.isLowStock);
  
  const [revenuePeriod, setRevenuePeriod] = useState<PeriodType>('month');
  const [ordersPeriod, setOrdersPeriod] = useState<PeriodType>('month');
  const [customersPeriod, setCustomersPeriod] = useState<PeriodType>('month');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriodType>('week');
  
  const revenueStats = getStatsByPeriod(revenuePeriod);
  const ordersStats = getStatsByPeriod(ordersPeriod);
  const customersStats = getStatsByPeriod(customersPeriod);
  const chartData = getChartDataByPeriod(chartPeriod);

  const formatChartDate = (dateString: string) => {
    if (chartPeriod === 'year') return dateString;
    return formatDate(dateString);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ダッシュボード</h1>
          <p className="text-sm text-slate-500">ショップの概要</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-sm" asChild>
          <Link href="/reports">レポートを見る</Link>
        </Button>
      </div>

      {/* メイン統計カード */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* 売上カード */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-orange-500" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                  {periodLabels[revenuePeriod]}<ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setRevenuePeriod('month')}>月</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRevenuePeriod('year')}>年</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRevenuePeriod('total')}>総計</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-xs text-slate-500 mb-1">売上</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCompactCurrency(revenueStats.totalRevenue)}</p>
          {revenuePeriod !== 'total' && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn("text-xs font-medium", revenueStats.revenueChange >= 0 ? "text-emerald-600" : "text-red-600")}>
                {revenueStats.revenueChange >= 0 ? '+' : ''}{revenueStats.revenueChange}%
              </span>
              {revenueStats.revenueChange >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
            </div>
          )}
        </div>

        {/* 注文数カード */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-orange-500" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                  {periodLabels[ordersPeriod]}<ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setOrdersPeriod('month')}>月</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOrdersPeriod('year')}>年</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOrdersPeriod('total')}>総計</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-xs text-slate-500 mb-1">注文数</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(ordersStats.totalOrders)}<span className="text-sm font-normal ml-1">件</span></p>
          {ordersPeriod !== 'total' && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn("text-xs font-medium", ordersStats.ordersChange >= 0 ? "text-emerald-600" : "text-red-600")}>
                {ordersStats.ordersChange >= 0 ? '+' : ''}{ordersStats.ordersChange}%
              </span>
              {ordersStats.ordersChange >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
            </div>
          )}
        </div>

        {/* 商品数カード */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <Package className="h-5 w-5 text-orange-500" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-1">商品数</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(mockDashboardStats.totalProducts)}<span className="text-sm font-normal ml-1">点</span></p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs font-medium text-emerald-600">+{mockDashboardStats.productsChange}</span>
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          </div>
        </div>

        {/* 顧客数カード */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                  {periodLabels[customersPeriod]}<ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCustomersPeriod('month')}>月</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCustomersPeriod('year')}>年</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCustomersPeriod('total')}>総計</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-xs text-slate-500 mb-1">顧客数</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatNumber(customersStats.totalCustomers)}<span className="text-sm font-normal ml-1">人</span></p>
          {customersPeriod !== 'total' && (
            <div className="flex items-center gap-1 mt-2">
              <span className={cn("text-xs font-medium", customersStats.customersChange >= 0 ? "text-emerald-600" : "text-red-600")}>
                {customersStats.customersChange >= 0 ? '+' : ''}{customersStats.customersChange}%
              </span>
              {customersStats.customersChange >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
            </div>
          )}
        </div>
      </div>

      {/* グラフエリア */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 売上推移グラフ */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">売上推移</h3>
              <p className="text-xs text-slate-500">期間別の売上推移</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
              {(['week', 'month', 'year'] as ChartPeriodType[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    chartPeriod === period
                      ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {period === 'week' ? '週' : period === 'month' ? '月' : '年'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tickFormatter={formatChartDate} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fill="url(#fillRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* カテゴリ別売上 */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">カテゴリ別売上</h3>
            <p className="text-xs text-slate-500">今月の売上構成</p>
          </div>
          <div className="h-[160px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">¥258万</p>
                <p className="text-xs text-slate-500">今月</p>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs text-slate-600 dark:text-slate-400">{cat.name}</span>
                </div>
                <span className="text-xs font-medium text-slate-900 dark:text-white">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 下部グリッド */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 最近の注文 */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">最近の注文</h3>
              <p className="text-xs text-slate-500">直近の注文一覧</p>
            </div>
            <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 text-xs" asChild>
              <Link href="/orders">すべて見る<ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
          <div className="space-y-0">
            {mockRecentOrders.slice(0, 5).map((order, index) => (
              <div key={order.id} className={cn("flex items-center justify-between py-3", index !== mockRecentOrders.length - 1 && "border-b border-slate-100 dark:border-slate-700")}>
                <div className="flex items-center gap-3">
                  <Badge className={cn("text-[10px] font-medium rounded-md px-2 py-1", orderStatusConfig[order.status].color)}>
                    {orderStatusConfig[order.status].label}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{order.customerName}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(order.total)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString('ja-JP')}</p>
                  <Avatar className="h-8 w-8 mt-1 ml-auto">
                    <AvatarFallback className="text-[10px] bg-slate-100 dark:bg-slate-700">{order.customerName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右サイドバー */}
        <div className="space-y-4">
          {/* 人気商品 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">人気商品</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-orange-500" asChild>
                <Link href="/products"><ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="space-y-3">
              {mockTopProducts.slice(0, 3).map((product, index) => (
                <div key={product.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-orange-500 w-4">{index + 1}</span>
                  <Avatar className="h-10 w-10 rounded-xl">
                    <AvatarImage src={product.image} className="object-cover" />
                    <AvatarFallback className="text-xs bg-slate-100 dark:bg-slate-700 rounded-xl">{product.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.sales}件</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 在庫アラート */}
          <div className={cn(
            "rounded-2xl p-5 shadow-sm border",
            lowStockItems.length > 0 
              ? "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800" 
              : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
          )}>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                lowStockItems.length > 0 ? "bg-orange-100 dark:bg-orange-900/50" : "bg-slate-100 dark:bg-slate-700"
              )}>
                <AlertCircle className={cn("h-5 w-5", lowStockItems.length > 0 ? "text-orange-500" : "text-slate-400")} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">在庫アラート</h3>
                {lowStockItems.length > 0 && <p className="text-xs text-orange-600">{lowStockItems.length}件の警告</p>}
              </div>
            </div>
            {lowStockItems.length > 0 ? (
              <div className="space-y-2">
                {lowStockItems.slice(0, 3).map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{item.productName}</p>
                      <p className="text-xs text-slate-500">{item.variantName}</p>
                    </div>
                    <Badge className="bg-orange-500 text-white text-xs">残り{item.availableStock}点</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500">在庫は十分です ✓</p>
              </div>
            )}
          </div>

          {/* ストレージ使用量 */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">ストレージ</h3>
              <span className="text-xs text-slate-500">70%</span>
            </div>
            <Progress value={70} className="h-2" />
            <p className="text-xs text-slate-500 mt-2">7GB / 10GB 使用中</p>
          </div>
        </div>
      </div>
    </div>
  );
}

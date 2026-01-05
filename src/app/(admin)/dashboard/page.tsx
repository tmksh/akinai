'use client';

import {
  Package,
  ShoppingCart,
  Users,
  ArrowUpRight,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  mockRecentOrders,
  mockInventorySummary,
  mockDashboardStats,
  mockRevenueData,
} from '@/lib/mock-data';
import { cn } from '@/lib/utils';

// 数値フォーマット
const formatCurrency = (value: number) => 
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

const formatCompact = (value: number) => {
  if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
  return value.toLocaleString();
};

export default function DashboardPage() {
  const lowStockItems = mockInventorySummary.filter((item) => item.isLowStock);
  const pendingOrders = mockRecentOrders.filter((order) => order.status === 'pending');
  const processingOrders = mockRecentOrders.filter((order) => order.status === 'processing');

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            ダッシュボード
          </h1>
          <p className="text-slate-500 text-sm mt-1">ショップの概要を確認</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-full" asChild>
            <Link href="/reports">レポート</Link>
          </Button>
          <Button className="rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100" asChild>
            <Link href="/products/new">
              <Sparkles className="h-4 w-4 mr-2" />
              商品を追加
            </Link>
          </Button>
        </div>
      </div>

      {/* メイン統計 + グラフ */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* 統計カード群 */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {/* 売上 */}
          <div className="col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <p className="text-slate-400 text-sm font-medium">今月の売上</p>
              <p className="text-3xl font-bold mt-2 tracking-tight">¥{formatCompact(2580000)}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1 text-emerald-400 text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  +12.5%
                </span>
                <span className="text-slate-500 text-sm">vs 先月</span>
              </div>
            </div>
          </div>

          {/* 注文数 */}
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-5 border border-amber-100 dark:border-amber-900/50">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-800 bg-white dark:bg-amber-950">
                +8.2%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-4">156</p>
            <p className="text-slate-500 text-sm mt-1">今月の注文</p>
          </div>

          {/* 商品数 */}
          <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-900/50">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-800 bg-white dark:bg-emerald-950">
                +{mockDashboardStats.productsChange}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-4">{mockDashboardStats.totalProducts}</p>
            <p className="text-slate-500 text-sm mt-1">登録商品</p>
          </div>

          {/* 顧客数 */}
          <div className="col-span-2 bg-violet-50 dark:bg-violet-950/30 rounded-2xl p-5 border border-violet-100 dark:border-violet-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">顧客数</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">2,341</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                <Users className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <div className="flex-1 h-2 bg-violet-100 dark:bg-violet-900/50 rounded-full overflow-hidden">
                <div className="h-full w-[72%] bg-violet-500 rounded-full" />
              </div>
              <span className="text-sm text-slate-500">72% リピーター</span>
            </div>
          </div>
        </div>

        {/* グラフ */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">売上推移</h3>
              <p className="text-sm text-slate-500 mt-0.5">過去7日間</p>
            </div>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1">
              <button className="px-3 py-1 text-xs font-medium rounded-full bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm">週</button>
              <button className="px-3 py-1 text-xs font-medium rounded-full text-slate-500 hover:text-slate-700">月</button>
              <button className="px-3 py-1 text-xs font-medium rounded-full text-slate-500 hover:text-slate-700">年</button>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockRevenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('ja-JP', { day: 'numeric' })}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* タスク & 注文 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* タスク */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/50">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">やること</h3>
          <div className="space-y-3">
            {pendingOrders.length > 0 && (
              <Link href="/orders?status=pending" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">入金待ち</p>
                    <p className="text-xs text-slate-500">{pendingOrders.length}件の注文</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            )}
            
            {processingOrders.length > 0 && (
              <Link href="/orders?status=processing" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                    <Truck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">発送待ち</p>
                    <p className="text-xs text-slate-500">{processingOrders.length}件の注文</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            )}
            
            {lowStockItems.length > 0 && (
              <Link href="/inventory?filter=low" className="block">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">在庫少</p>
                    <p className="text-xs text-slate-500">{lowStockItems.length}件の商品</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            )}

            {pendingOrders.length === 0 && processingOrders.length === 0 && lowStockItems.length === 0 && (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">すべて完了</p>
                <p className="text-xs text-slate-500 mt-1">やることはありません</p>
              </div>
            )}
          </div>
        </div>

        {/* 最近の注文 */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">最近の注文</h3>
            <Link href="/orders" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1">
              すべて見る <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {mockRecentOrders.slice(0, 4).map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="block">
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold",
                    order.status === 'pending' && "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
                    order.status === 'processing' && "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
                    order.status === 'delivered' && "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
                  )}>
                    {order.customerName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{order.customerName}</p>
                      <span className="text-xs text-slate-400">{order.orderNumber}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {order.status === 'pending' && '入金待ち'}
                      {order.status === 'processing' && '発送待ち'}
                      {order.status === 'delivered' && '完了'}
                      {' · '}{new Date(order.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{formatCurrency(order.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* クイックリンク */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { href: '/products', icon: Package, label: '商品管理', color: 'bg-orange-500' },
          { href: '/orders', icon: ShoppingCart, label: '注文管理', color: 'bg-blue-500' },
          { href: '/customers', icon: Users, label: '顧客管理', color: 'bg-violet-500' },
          { href: '/contents', icon: Sparkles, label: 'コンテンツ', color: 'bg-emerald-500' },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="group bg-white dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 hover:border-slate-200 dark:hover:border-slate-600 transition-all hover:shadow-lg hover:-translate-y-0.5">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white mb-3", item.color)}>
                <item.icon className="h-5 w-5" />
              </div>
              <p className="font-medium text-slate-900 dark:text-white">{item.label}</p>
              <div className="flex items-center gap-1 mt-1 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                <span className="text-xs">開く</span>
                <ArrowUpRight className="h-3 w-3" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

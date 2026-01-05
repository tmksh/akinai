'use client';

import {
  Package,
  ShoppingCart,
  Users,
  ArrowUpRight,
  TrendingUp,
  Clock,
  Truck,
  MoreHorizontal,
  Target,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  mockRecentOrders,
  mockInventorySummary,
  mockDashboardStats,
  mockTopProducts,
} from '@/lib/mock-data';
import { cn } from '@/lib/utils';

// 数値フォーマット
const formatCurrency = (value: number) => 
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

const formatCompact = (value: number) => {
  if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
  return value.toLocaleString();
};

// 円形プログレス
const CircularProgress = ({ value, size = 120, strokeWidth = 8 }: { value: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(251,146,60,0.2)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#orangeGradient)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default function DashboardPage() {
  const lowStockItems = mockInventorySummary.filter((item) => item.isLowStock);
  const pendingOrders = mockRecentOrders.filter((order) => order.status === 'pending');
  const processingOrders = mockRecentOrders.filter((order) => order.status === 'processing');
  const todoCount = pendingOrders.length + processingOrders.length + lowStockItems.length;
  
  // 目標達成率（仮）
  const goalProgress = 78;

  return (
    <div className="space-y-4 pb-8">
      {/* Bento Grid レイアウト */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* メイン売上カード - 2x2 */}
        <div className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-orange-950 via-orange-900 to-amber-900 rounded-3xl p-6 relative overflow-hidden">
          {/* 背景装飾 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <span className="text-orange-300/80 text-sm font-medium">今月の売上</span>
              <button className="text-orange-300/60 hover:text-orange-200 transition-colors">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-8">
              <p className="text-5xl md:text-6xl font-bold text-white tracking-tight">
                ¥{formatCompact(2580000)}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                  <TrendingUp className="h-3.5 w-3.5" />
                  +12.5%
                </span>
                <span className="text-orange-300/60 text-sm">先月比</span>
              </div>
            </div>
            
            {/* ミニグラフ（ドット表示） */}
            <div className="flex items-end gap-1 h-16 mb-6">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div 
                  key={i}
                  className="flex-1 bg-gradient-to-t from-orange-500 to-amber-400 rounded-full opacity-80"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            
            {/* クイック統計 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur rounded-2xl p-4">
                <p className="text-orange-300/60 text-xs mb-1">注文数</p>
                <p className="text-2xl font-bold text-white">156</p>
              </div>
              <div className="bg-white/5 backdrop-blur rounded-2xl p-4">
                <p className="text-orange-300/60 text-xs mb-1">平均単価</p>
                <p className="text-2xl font-bold text-white">¥16.5k</p>
              </div>
            </div>
          </div>
        </div>

        {/* 目標達成カード */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-slate-400 text-sm font-medium mb-4">目標達成率</p>
            <div className="flex items-center justify-center">
              <div className="relative">
                <CircularProgress value={goalProgress} size={100} strokeWidth={8} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{goalProgress}%</span>
                </div>
              </div>
            </div>
            <p className="text-center text-slate-500 text-xs mt-3">今月の目標まであと¥57万</p>
          </div>
        </div>

        {/* タスクカード */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-400 text-sm font-medium">やること</p>
            <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-medium">
              {todoCount}件
            </span>
          </div>
          <div className="space-y-2">
            {pendingOrders.length > 0 && (
              <Link href="/orders?status=pending">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-white">入金待ち</span>
                  <span className="ml-auto text-xs text-amber-400">{pendingOrders.length}</span>
                </div>
              </Link>
            )}
            {processingOrders.length > 0 && (
              <Link href="/orders?status=processing">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                  <Truck className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-white">発送待ち</span>
                  <span className="ml-auto text-xs text-blue-400">{processingOrders.length}</span>
                </div>
              </Link>
            )}
            {lowStockItems.length > 0 && (
              <Link href="/inventory?filter=low">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 transition-colors">
                  <Package className="h-4 w-4 text-orange-400" />
                  <span className="text-sm text-white">在庫少</span>
                  <span className="ml-auto text-xs text-orange-400">{lowStockItems.length}</span>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* 商品数カード */}
        <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-emerald-400 text-xs font-medium">+{mockDashboardStats.productsChange}</span>
            </div>
            <p className="text-3xl font-bold text-white mt-4">{mockDashboardStats.totalProducts}</p>
            <p className="text-emerald-300/60 text-sm mt-1">登録商品</p>
          </div>
        </div>

        {/* 顧客数カード */}
        <div className="bg-gradient-to-br from-violet-950 to-violet-900 rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-violet-400" />
              </div>
              <span className="text-violet-400 text-xs font-medium">72% リピート</span>
            </div>
            <p className="text-3xl font-bold text-white mt-4">2,341</p>
            <p className="text-violet-300/60 text-sm mt-1">顧客数</p>
          </div>
        </div>

        {/* 最近の注文 - 2x1 */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-semibold">最近の注文</p>
            <Link href="/orders" className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
              すべて <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {mockRecentOrders.slice(0, 3).map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
                    order.status === 'pending' && "bg-amber-500/20 text-amber-400",
                    order.status === 'processing' && "bg-blue-500/20 text-blue-400",
                    order.status === 'delivered' && "bg-slate-500/20 text-slate-400",
                  )}>
                    {order.customerName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{order.customerName}</p>
                    <p className="text-slate-500 text-xs">
                      {order.status === 'pending' && '入金待ち'}
                      {order.status === 'processing' && '発送待ち'}
                      {order.status === 'delivered' && '完了'}
                    </p>
                  </div>
                  <p className="text-white font-semibold text-sm">{formatCurrency(order.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 人気商品 */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-semibold">人気商品</p>
            <Link href="/products" className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
              すべて <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {mockTopProducts.slice(0, 3).map((product, index) => (
              <div key={product.id} className="bg-white/5 rounded-2xl p-4 text-center relative">
                <div className="absolute top-2 left-2 h-5 w-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <span className="text-orange-400 text-xs font-bold">{index + 1}</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-orange-400" />
                </div>
                <p className="text-white text-sm font-medium truncate">{product.name}</p>
                <p className="text-slate-500 text-xs mt-1">{product.sales}件販売</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: '/products/new', icon: Package, label: '商品追加', gradient: 'from-orange-600 to-amber-500' },
          { href: '/orders', icon: ShoppingCart, label: '注文管理', gradient: 'from-blue-600 to-cyan-500' },
          { href: '/customers', icon: Users, label: '顧客管理', gradient: 'from-violet-600 to-purple-500' },
          { href: '/contents/new', icon: Target, label: '記事作成', gradient: 'from-emerald-600 to-teal-500' },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={cn(
              "bg-gradient-to-r rounded-2xl p-4 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]",
              item.gradient
            )}>
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-white/90" />
                <span className="text-white font-medium">{item.label}</span>
                <ArrowUpRight className="h-4 w-4 text-white/60 ml-auto" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

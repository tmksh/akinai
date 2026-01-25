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
  ChevronLeft,
  ChevronRight,
  Mail,
  FileText,
  Bell,
} from 'lucide-react';
import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
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
import type { OrderStatus } from '@/types';
import { cn } from '@/lib/utils';
import { getPerformanceData } from '@/lib/actions/dashboard';

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

// 大きな数字を短縮表示
const formatCompactCurrency = (value: number): string => {
  if (value >= 100000000) return `¥${(value / 100000000).toFixed(1)}億`;
  if (value >= 10000) return `¥${Math.round(value / 10000)}万`;
  return `¥${formatNumber(value)}`;
};

// 期間タイプ
type PeriodType = 'month' | 'year' | 'total';

const periodLabels: Record<PeriodType, string> = { month: '月', year: '年', total: '総計' };

// 月ラベルを取得
const getMonthLabel = (offset: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() - offset);
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
};

// サークルプログレスコンポーネント
function CircleProgress({ 
  value, 
  max = 100, 
  size = 110, 
  strokeWidth = 10,
  label,
  sublabel,
  colorVariant = 'orange',
}: { 
  value: number; 
  max?: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  colorVariant?: 'orange' | 'amber' | 'warm';
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / max, 1);
  const offset = circumference - progress * circumference;
  
  const gradientIds = {
    orange: 'progressGradientOrange',
    amber: 'progressGradientAmber', 
    warm: 'progressGradientWarm',
  };
  
  const glowColors = {
    orange: 'rgba(249, 115, 22, 0.4)',
    amber: 'rgba(251, 191, 36, 0.4)',
    warm: 'rgba(234, 88, 12, 0.4)',
  };
  
  return (
    <div className="flex flex-col items-center group">
      <div className="relative" style={{ width: size, height: size }}>
        <div 
          className="absolute inset-2 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity"
          style={{ backgroundColor: glowColors[colorVariant] }}
        />
        <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-orange-100 dark:text-orange-900/20"
          />
        </svg>
        <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
          <defs>
            <linearGradient id={gradientIds.orange} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id={gradientIds.amber} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
            <linearGradient id={gradientIds.warm} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientIds[colorVariant]})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter="url(#glow)"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative">
            <span className="text-2xl font-bold bg-gradient-to-br from-orange-500 to-amber-600 bg-clip-text text-transparent">
              {value}%
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</p>
        {sublabel && <p className="text-[11px] text-slate-500 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

// Props型定義
interface DashboardData {
  revenue: {
    month: { total: number; change: number };
    year: { total: number; change: number };
    total: { total: number; change: number };
  };
  orders: {
    month: { total: number; change: number };
    year: { total: number; change: number };
    total: { total: number; change: number };
  };
  customers: {
    month: { total: number; change: number };
    year: { total: number; change: number };
    total: { total: number; change: number };
  };
  products: { total: number; newThisMonth: number };
  recentOrders: {
    id: string;
    order_number: string;
    customer_name: string;
    total: number;
    status: OrderStatus;
    created_at: string;
  }[];
  topProducts: {
    id: string;
    name: string;
    image: string | null;
    sales: number;
  }[];
  lowStockItems: {
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    sku: string;
    stock: number;
    threshold: number;
  }[];
  monthlySales: {
    name: string;
    sales: number;
    orders: number;
  }[];
  performance: {
    salesTarget: number;
    salesActual: number;
    salesAchievement: number;
    ordersTarget: number;
    ordersActual: number;
    ordersAchievement: number;
    customersTarget: number;
    customersActual: number;
    customersAchievement: number;
    growthRate: number;
    avgAchievement: number;
    grade: string;
  };
}

interface DashboardClientProps {
  initialData: DashboardData;
  organizationId: string;
}

export default function DashboardClient({ initialData, organizationId }: DashboardClientProps) {
  const [revenuePeriod, setRevenuePeriod] = useState<PeriodType>('month');
  const [ordersPeriod, setOrdersPeriod] = useState<PeriodType>('month');
  const [customersPeriod, setCustomersPeriod] = useState<PeriodType>('month');
  const [performanceMonth, setPerformanceMonth] = useState(0);
  const [performanceData, setPerformanceData] = useState(initialData.performance);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);
  
  // 期間ごとのデータを取得
  const getRevenueData = (period: PeriodType) => initialData.revenue[period];
  const getOrdersData = (period: PeriodType) => initialData.orders[period];
  const getCustomersData = (period: PeriodType) => initialData.customers[period];
  
  const revenueStats = getRevenueData(revenuePeriod);
  const ordersStats = getOrdersData(ordersPeriod);
  const customersStats = getCustomersData(customersPeriod);

  // パフォーマンス月を変更
  const handlePerformanceMonthChange = async (newMonth: number) => {
    setPerformanceMonth(newMonth);
    setIsLoadingPerformance(true);
    try {
      const data = await getPerformanceData(organizationId, newMonth);
      setPerformanceData(data);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsLoadingPerformance(false);
    }
  };

  // カード共通スタイル
  const cardBase = "bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm";

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ダッシュボード</h1>
          <p className="text-sm text-slate-500">ショップの概要・リアルタイム更新</p>
        </div>
        <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300" asChild>
          <Link href="/reports">レポートを見る</Link>
        </Button>
      </div>

      {/* メイン統計カード */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* 売上カード */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="h-8 w-8 opacity-80" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-xs text-white/80 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
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
            <p className="text-sm text-white/80">売上</p>
            <p className="text-3xl font-bold mt-1">{formatCompactCurrency(revenueStats.total)}</p>
            {revenuePeriod !== 'total' && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-sm font-medium bg-white/20 px-2 py-0.5 rounded-full">
                  {revenueStats.change >= 0 ? '+' : ''}{revenueStats.change}%
                </span>
                {revenueStats.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
            )}
          </div>
        </div>

        {/* 注文数カード */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <ShoppingCart className="h-8 w-8 opacity-80" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-xs text-white/80 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
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
            <p className="text-sm text-white/80">注文数</p>
            <p className="text-3xl font-bold mt-1">{formatNumber(ordersStats.total)}<span className="text-lg font-normal ml-1">件</span></p>
            {ordersPeriod !== 'total' && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-sm font-medium bg-white/20 px-2 py-0.5 rounded-full">
                  {ordersStats.change >= 0 ? '+' : ''}{ordersStats.change}%
                </span>
                {ordersStats.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
            )}
          </div>
        </div>

        {/* 商品数カード */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/25">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <Package className="h-8 w-8 opacity-80" />
            </div>
            <p className="text-sm text-white/80">商品数</p>
            <p className="text-3xl font-bold mt-1">{formatNumber(initialData.products.total)}<span className="text-lg font-normal ml-1">点</span></p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-sm font-medium bg-white/20 px-2 py-0.5 rounded-full">
                +{initialData.products.newThisMonth}
              </span>
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* 顧客数カード */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <Users className="h-8 w-8 opacity-80" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-xs text-white/80 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
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
            <p className="text-sm text-white/80">顧客数</p>
            <p className="text-3xl font-bold mt-1">{formatNumber(customersStats.total)}<span className="text-lg font-normal ml-1">人</span></p>
            {customersPeriod !== 'total' && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-sm font-medium bg-white/20 px-2 py-0.5 rounded-full">
                  {customersStats.change >= 0 ? '+' : ''}{customersStats.change}%
                </span>
                {customersStats.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* チャート & パフォーマンス */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* マルチシリーズエリアチャート */}
        <div className={cn("lg:col-span-2 p-5", cardBase)}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">売上サマリー</h3>
              <p className="text-xs text-slate-500">月別のトレンド</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span className="text-slate-500">売上(千円)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-slate-500">注文数</span>
              </div>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={initialData.monthlySales}>
                <defs>
                  <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Area type="monotone" dataKey="orders" stroke="#fbbf24" strokeWidth={2} fill="url(#fillOrders)" />
                <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={2.5} fill="url(#fillSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* パフォーマンス */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-orange-50/30 to-amber-50/50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800/90 border border-orange-100/50 dark:border-slate-700/50 shadow-sm p-5">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-orange-200/30 to-amber-200/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-amber-200/20 to-orange-200/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
          
          <div className="relative">
            {/* 月選択ヘッダー */}
            <div className="mb-5">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => handlePerformanceMonthChange(Math.min(performanceMonth + 1, 5))}
                  disabled={performanceMonth >= 5 || isLoadingPerformance}
                  className="p-1.5 rounded-lg hover:bg-orange-100/50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </button>
                <div className="text-center">
                  <h3 className="font-semibold text-slate-900 dark:text-white">パフォーマンス</h3>
                  <p className="text-xs text-orange-500 font-medium">{getMonthLabel(performanceMonth)}</p>
                </div>
                <button
                  onClick={() => handlePerformanceMonthChange(Math.max(performanceMonth - 1, 0))}
                  disabled={performanceMonth <= 0 || isLoadingPerformance}
                  className="p-1.5 rounded-lg hover:bg-orange-100/50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                </button>
              </div>
              {/* 月インジケーター */}
              <div className="flex justify-center gap-1 mt-2">
                {[0, 1, 2, 3, 4, 5].map((month) => (
                  <button
                    key={month}
                    onClick={() => handlePerformanceMonthChange(month)}
                    disabled={isLoadingPerformance}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      performanceMonth === month 
                        ? "w-4 bg-orange-500" 
                        : "w-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-orange-300"
                    )}
                  />
                ))}
              </div>
            </div>
            
            <div className={cn("flex justify-center gap-6", isLoadingPerformance && "opacity-50")}>
              <CircleProgress 
                value={Math.min(performanceData.salesAchievement, 150)} 
                colorVariant="orange"
                label="売上目標"
                sublabel={`¥${Math.round(performanceData.salesTarget / 10000)}万 / ¥${Math.round(performanceData.salesActual / 10000)}万`}
              />
              <CircleProgress 
                value={Math.min(performanceData.ordersAchievement, 150)} 
                colorVariant="amber"
                label="注文目標"
                sublabel={`${performanceData.ordersTarget}件 / ${performanceData.ordersActual}件`}
              />
              <CircleProgress 
                value={Math.min(performanceData.customersAchievement, 150)} 
                colorVariant="warm"
                label="顧客獲得"
                sublabel={`${performanceData.customersTarget}人 / ${performanceData.customersActual}人`}
              />
            </div>
            
            {/* 追加の統計 */}
            <div className="mt-5 pt-4 border-t border-orange-100/50 dark:border-slate-700/50">
              <div className="flex justify-around text-center">
                <div>
                  <p className={cn(
                    "text-lg font-bold",
                    performanceData.growthRate >= 0 ? "text-orange-500" : "text-red-500"
                  )}>
                    {performanceData.growthRate >= 0 ? '+' : ''}{performanceData.growthRate}%
                  </p>
                  <p className="text-[10px] text-slate-500">前月比成長</p>
                </div>
                <div className="w-px bg-orange-100 dark:bg-slate-700" />
                <div>
                  <p className="text-lg font-bold text-amber-500">{performanceData.avgAchievement}%</p>
                  <p className="text-[10px] text-slate-500">平均達成率</p>
                </div>
                <div className="w-px bg-orange-100 dark:bg-slate-700" />
                <div>
                  <p className="text-lg font-bold text-orange-600">{performanceData.grade}</p>
                  <p className="text-[10px] text-slate-500">評価</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 最近の注文 & クイックアクション & 在庫アラート */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* 最近の注文 */}
        <div className={cn("lg:col-span-2 p-4", cardBase)}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">最近の注文</h3>
            <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 text-xs rounded-lg h-7 px-2" asChild>
              <Link href="/orders">すべて<ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </div>
          {initialData.recentOrders.length > 0 ? (
            <div className="space-y-1.5">
              {initialData.recentOrders.map((order) => (
                <Link 
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-orange-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <Avatar className="h-8 w-8 rounded-full shadow-sm flex-shrink-0">
                    <AvatarFallback className="text-[10px] font-medium text-white bg-gradient-to-br from-orange-400 to-amber-500">
                      {order.customer_name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{order.customer_name}</p>
                    <p className="text-[10px] text-slate-500">{formatCurrency(order.total)}</p>
                  </div>
                  <Badge className={cn("text-[9px] font-medium rounded-full px-1.5 py-0.5 flex-shrink-0", orderStatusConfig[order.status].color)}>
                    {orderStatusConfig[order.status].label}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-slate-500">
              まだ注文がありません
            </div>
          )}
        </div>

        {/* クイックアクション */}
        <div className={cn("p-4", cardBase)}>
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">クイックアクション</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/orders" className="group flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 hover:from-orange-100 hover:to-amber-100 transition-all relative">
              <Mail className="h-5 w-5 text-orange-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium text-slate-600">メッセージ</span>
            </Link>
            <Link href="/orders" className="group flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 hover:from-amber-100 hover:to-orange-100 transition-all relative">
              <Bell className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium text-slate-600">通知</span>
            </Link>
            <Link href="/quotes/new" className="group flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 hover:from-orange-150 hover:to-amber-150 transition-all">
              <FileText className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium text-slate-600">見積作成</span>
            </Link>
            <Link href="/products/new" className="group flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 hover:from-amber-150 hover:to-orange-150 transition-all">
              <Package className="h-5 w-5 text-amber-600 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-medium text-slate-600">商品追加</span>
            </Link>
          </div>
        </div>

        {/* 在庫アラート */}
        <div className={cn(
          "p-4",
          initialData.lowStockItems.length > 0 
            ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-700/30 rounded-2xl" 
            : cardBase
        )}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className={cn("h-4 w-4", initialData.lowStockItems.length > 0 ? "text-amber-500" : "text-slate-400")} />
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">在庫アラート</h3>
            {initialData.lowStockItems.length > 0 && (
              <Badge className="bg-amber-500 text-white text-[9px] h-4 px-1.5">{initialData.lowStockItems.length}</Badge>
            )}
          </div>
          {initialData.lowStockItems.length > 0 ? (
            <div className="space-y-1.5">
              {initialData.lowStockItems.slice(0, 3).map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="flex items-center justify-between p-2 rounded-lg bg-white/80 dark:bg-slate-800/80">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{item.productName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{item.variantName}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-600 flex-shrink-0">残{item.stock}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-xs text-slate-500">在庫OK ✓</p>
            </div>
          )}
        </div>
      </div>

      {/* 人気商品 */}
      <div className={cn("p-5", cardBase)}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">人気商品</h3>
            <p className="text-xs text-slate-500">今月のベストセラー</p>
          </div>
          <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50 text-xs rounded-lg" asChild>
            <Link href="/products">すべて見る<ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
        {initialData.topProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {initialData.topProducts.map((product, index) => (
              <Link 
                key={product.id}
                href={`/products/${product.id}`}
                className="group relative p-3 rounded-xl bg-orange-50/50 dark:bg-slate-700/30 hover:bg-orange-100/50 dark:hover:bg-slate-700/50 transition-all cursor-pointer"
              >
                <div className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                  {index + 1}
                </div>
                <Avatar className="h-16 w-16 mx-auto rounded-xl shadow-sm">
                  <AvatarImage src={product.image || ''} className="object-cover" />
                  <AvatarFallback className="text-sm bg-gradient-to-br from-orange-100 to-amber-100 dark:from-slate-600 dark:to-slate-700 rounded-xl text-orange-600">{product.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white text-center truncate">{product.name}</p>
                <p className="text-xs text-slate-500 text-center">{product.sales}件販売</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-slate-500">
            まだ販売データがありません
          </div>
        )}
      </div>
    </div>
  );
}


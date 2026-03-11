'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ResponsiveProps } from 'react-grid-layout';

const DashboardChart = dynamic(
  () => import('./dashboard-chart').then(m => m.DashboardChart),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-slate-50 rounded" /> }
);
const ResponsiveOrig = dynamic(
  () => import('react-grid-layout').then(m => m.Responsive),
  { ssr: false }
) as React.ComponentType<ResponsiveProps>;

// デバウンス付きコンテナ幅フック（ResizeObserver の過剰発火を防ぐ）
function useStableContainerWidth() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevWidthRef = useRef(0);

  // まず mounted を true にして containerRef の div を DOM に出す
  useEffect(() => {
    setMounted(true);
  }, []);

  // mounted 後に幅を測定し ResizeObserver を設定
  useEffect(() => {
    if (!mounted) return;
    const el = containerRef.current;
    if (!el) return;

    const MIN_WIDTH_DELTA = 20;
    const update = (force = false) => {
      const newWidth = el.clientWidth;
      if (newWidth > 0 && (force || Math.abs(newWidth - prevWidthRef.current) >= MIN_WIDTH_DELTA)) {
        prevWidthRef.current = newWidth;
        setWidth(newWidth);
      }
    };

    // 初回測定（強制更新）
    update(true);

    const observer = new ResizeObserver(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => update(false), 150);
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mounted]);

  return { width, mounted, containerRef };
}

// react-grid-layout v2 の型定義が不完全なためanyでラップ
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Responsive = ResponsiveOrig as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Layout = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Layouts = any;

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
  pending: { label: '入金待ち', color: 'bg-sky-100 text-sky-700' },
  confirmed: { label: '確認済', color: 'bg-blue-100 text-blue-700' },
  processing: { label: '対応中', color: 'bg-sky-100 text-sky-700' },
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

// デフォルトレイアウト
const defaultLayouts: Layouts = {
  lg: [
    { i: 'revenue', x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'orders', x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'products', x: 6, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'customers', x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
    { i: 'chart', x: 0, y: 4, w: 8, h: 7, minW: 4, minH: 5 },
    { i: 'performance', x: 8, y: 4, w: 4, h: 7, minW: 3, minH: 5 },
    { i: 'recent-orders', x: 0, y: 11, w: 8, h: 6, minW: 4, minH: 4 },
    { i: 'stock-alert', x: 8, y: 11, w: 4, h: 6, minW: 3, minH: 4 },
    { i: 'top-products', x: 0, y: 17, w: 12, h: 6, minW: 6, minH: 4 },
  ],
  md: [
    { i: 'revenue', x: 0, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'orders', x: 4, y: 0, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'products', x: 0, y: 4, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'customers', x: 4, y: 4, w: 4, h: 4, minW: 2, minH: 3 },
    { i: 'chart', x: 0, y: 8, w: 8, h: 7, minW: 4, minH: 5 },
    { i: 'performance', x: 0, y: 15, w: 8, h: 7, minW: 3, minH: 5 },
    { i: 'recent-orders', x: 0, y: 22, w: 8, h: 6, minW: 4, minH: 4 },
    { i: 'stock-alert', x: 0, y: 28, w: 8, h: 6, minW: 3, minH: 4 },
    { i: 'top-products', x: 0, y: 34, w: 8, h: 6, minW: 4, minH: 4 },
  ],
  sm: [
    { i: 'revenue', x: 0, y: 0, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'orders', x: 2, y: 0, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'products', x: 0, y: 4, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'customers', x: 2, y: 4, w: 2, h: 4, minW: 2, minH: 3 },
    { i: 'chart', x: 0, y: 8, w: 4, h: 7, minW: 2, minH: 5 },
    { i: 'performance', x: 0, y: 15, w: 4, h: 7, minW: 2, minH: 5 },
    { i: 'recent-orders', x: 0, y: 22, w: 4, h: 6, minW: 2, minH: 4 },
    { i: 'stock-alert', x: 0, y: 28, w: 4, h: 6, minW: 2, minH: 4 },
    { i: 'top-products', x: 0, y: 34, w: 4, h: 6, minW: 2, minH: 4 },
  ],
  xs: [
    { i: 'revenue', x: 0, y: 0, w: 2, h: 4, minW: 1, minH: 3 },
    { i: 'orders', x: 0, y: 4, w: 2, h: 4, minW: 1, minH: 3 },
    { i: 'products', x: 0, y: 8, w: 2, h: 4, minW: 1, minH: 3 },
    { i: 'customers', x: 0, y: 12, w: 2, h: 4, minW: 1, minH: 3 },
    { i: 'chart', x: 0, y: 16, w: 2, h: 7, minW: 1, minH: 5 },
    { i: 'performance', x: 0, y: 23, w: 2, h: 8, minW: 1, minH: 5 },
    { i: 'recent-orders', x: 0, y: 31, w: 2, h: 6, minW: 1, minH: 4 },
    { i: 'stock-alert', x: 0, y: 37, w: 2, h: 6, minW: 1, minH: 4 },
    { i: 'top-products', x: 0, y: 43, w: 2, h: 6, minW: 1, minH: 4 },
  ],
};

const STORAGE_KEY = 'dashboard-widget-layouts';

// サークルプログレスコンポーネント
function CircleProgress({ 
  value, 
  max = 100, 
  size = 100, 
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
  
  return (
    <div className="flex flex-col items-center group">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-sky-100 dark:text-sky-900/20"
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
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div 
          className="absolute flex flex-col items-center justify-center"
          style={{ 
            top: strokeWidth, 
            left: strokeWidth, 
            right: strokeWidth, 
            bottom: strokeWidth 
          }}
        >
          <span 
            className={cn(
              "font-bold bg-clip-text text-transparent leading-none text-center",
              colorVariant === 'orange' ? "bg-gradient-to-br from-sky-500 to-sky-600" :
              colorVariant === 'amber' ? "bg-gradient-to-br from-sky-500 to-sky-600" :
              "bg-gradient-to-br from-sky-600 to-red-600"
            )}
            style={{ fontSize: `${Math.max((size - strokeWidth * 2) * 0.28, 14)}px` }}
          >
            {value}%
          </span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</p>
        {sublabel && <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

// ウィジェットラッパー
function WidgetWrapper({ 
  children, 
  className,
  noPadding = false,
}: { 
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div className={cn(
      "h-full w-full overflow-hidden rounded-2xl relative cursor-grab active:cursor-grabbing",
      "bg-white/60 dark:bg-[rgba(30,32,45,0.55)]",
      "backdrop-blur-2xl",
      "border border-white/70 dark:border-white/[0.08]",
      "shadow-[0_2px_24px_rgba(100,120,160,0.08),inset_0_1px_0_rgba(255,255,255,0.85)]",
      "dark:shadow-[0_2px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]",
      !noPadding && "p-4",
      className
    )}>
      {children}
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
    image: string | null;
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
  const [layouts, setLayouts] = useState<Layouts>(defaultLayouts);
  
  // コンテナの幅を取得（デバウンス付き）
  const { width, mounted, containerRef } = useStableContainerWidth();

  // クライアントサイドでのみレイアウトを読み込む
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 保存レイアウトに xs がなければデフォルトから補完
        if (!parsed.xs) {
          parsed.xs = defaultLayouts.xs;
        }
        setLayouts(parsed);
      } catch {
        // Invalid JSON, use default
      }
    }
  }, []);

  // レイアウト変更時に保存
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChange = useCallback((_currentLayout: any, allLayouts: any) => {
    setLayouts(allLayouts as Layouts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
  }, []);

  // レイアウトをリセット
  const handleResetLayout = useCallback(() => {
    setLayouts(defaultLayouts);
    localStorage.removeItem(STORAGE_KEY);
  }, []);
  
  // 期間ごとのデータを取得
  const getRevenueData = (period: PeriodType) => initialData.revenue[period];
  const getOrdersData = (period: PeriodType) => initialData.orders[period];
  const getCustomersData = (period: PeriodType) => initialData.customers[period];
  
  const revenueStats = getRevenueData(revenuePeriod);
  const ordersStats = getOrdersData(ordersPeriod);
  const customersStats = getCustomersData(customersPeriod);

  // パフォーマンス月を変更
  const handlePerformanceMonthChange = useCallback(async (newMonth: number) => {
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
  }, [organizationId]);

  // ウィジェットコンテンツをメモ化
  const widgets = useMemo(() => ({
    // 売上カード
    revenue: (
      <div className="h-full w-full relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/20 cursor-grab active:cursor-grabbing">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-sm text-white/80 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  {periodLabels[revenuePeriod]}<ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setRevenuePeriod('month')}>月</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRevenuePeriod('year')}>年</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRevenuePeriod('total')}>総計</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm sm:text-lg font-semibold text-white/90">売上</p>
          <p className="text-2xl sm:text-4xl font-extrabold mt-1 sm:mt-2">{formatCompactCurrency(revenueStats.total)}</p>
          {revenuePeriod !== 'total' && (
            <div className="flex items-center gap-2 mt-auto pt-3">
              <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
                {revenueStats.change >= 0 ? '+' : ''}{revenueStats.change}%
              </span>
              {revenueStats.change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
          )}
        </div>
      </div>
    ),

    // 注文数カード
    orders: (
      <div className="h-full w-full relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-sky-400 to-sky-500 text-white shadow-lg shadow-sky-400/20 cursor-grab active:cursor-grabbing">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-sm text-white/80 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  {periodLabels[ordersPeriod]}<ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setOrdersPeriod('month')}>月</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOrdersPeriod('year')}>年</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOrdersPeriod('total')}>総計</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm sm:text-lg font-semibold text-white/90">注文数</p>
          <p className="text-2xl sm:text-4xl font-extrabold mt-1 sm:mt-2">{formatNumber(ordersStats.total)}<span className="text-lg sm:text-2xl font-bold ml-1 sm:ml-1.5 opacity-80">件</span></p>
          {ordersPeriod !== 'total' && (
            <div className="flex items-center gap-2 mt-auto pt-3">
              <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
                {ordersStats.change >= 0 ? '+' : ''}{ordersStats.change}%
              </span>
              {ordersStats.change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
          )}
        </div>
      </div>
    ),

    // 商品数カード
    products: (
      <div className="h-full w-full relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20 cursor-grab active:cursor-grabbing">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm sm:text-lg font-semibold text-white/90">商品数</p>
          <p className="text-2xl sm:text-4xl font-extrabold mt-1 sm:mt-2">{formatNumber(initialData.products.total)}<span className="text-lg sm:text-2xl font-bold ml-1 sm:ml-1.5 opacity-80">点</span></p>
          <div className="flex items-center gap-2 mt-auto pt-3">
            <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
              +{initialData.products.newThisMonth}
            </span>
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>
    ),

    // 顧客数カード
    customers: (
      <div className="h-full w-full relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-sky-300 to-sky-400 text-white shadow-lg shadow-sky-300/20 cursor-grab active:cursor-grabbing">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
              <Users className="h-6 w-6 text-white" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-sm text-white/80 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  {periodLabels[customersPeriod]}<ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCustomersPeriod('month')}>月</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCustomersPeriod('year')}>年</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCustomersPeriod('total')}>総計</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm sm:text-lg font-semibold text-white/90">顧客数</p>
          <p className="text-2xl sm:text-4xl font-extrabold mt-1 sm:mt-2">{formatNumber(customersStats.total)}<span className="text-lg sm:text-2xl font-bold ml-1 sm:ml-1.5 opacity-80">人</span></p>
          {customersPeriod !== 'total' && (
            <div className="flex items-center gap-2 mt-auto pt-3">
              <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
                {customersStats.change >= 0 ? '+' : ''}{customersStats.change}%
              </span>
              {customersStats.change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
          )}
        </div>
      </div>
    ),

    // 売上サマリーチャート
    chart: (
      <WidgetWrapper>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">売上サマリー</p>
            <p className="text-2xl font-black text-foreground mt-0.5 tracking-tight tabular-nums">
              ¥{(initialData.revenue.month.total / 10000).toFixed(1)}<span className="text-sm font-medium text-muted-foreground ml-1">万</span>
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "text-xs font-semibold",
                initialData.revenue.month.change >= 0 ? "text-sky-500" : "text-destructive"
              )}>
                {initialData.revenue.month.change >= 0 ? '▲' : '▼'} {Math.abs(initialData.revenue.month.change)}%
              </span>
              <span className="text-[10px] text-muted-foreground">前月比</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs mt-1">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500" />
              <span className="text-muted-foreground">売上(千円)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-5 rounded-full bg-gradient-to-r from-violet-400 to-purple-500" />
              <span className="text-muted-foreground">注文数</span>
            </div>
          </div>
        </div>
        <div className="h-[calc(100%-80px)]">
          <DashboardChart data={initialData.monthlySales} />
        </div>
      </WidgetWrapper>
    ),

    // パフォーマンス
    performance: (
      <div className="h-full w-full relative overflow-hidden rounded-2xl backdrop-blur-2xl cursor-grab active:cursor-grabbing p-5"
        style={{
          background: 'linear-gradient(160deg, rgba(240,250,255,0.92) 0%, rgba(224,244,255,0.88) 100%)',
          border: '1px solid rgba(186,230,253,0.5)',
          boxShadow: 'inset 0 2px 8px rgba(14,165,233,0.08), inset 0 1px 3px rgba(14,165,233,0.05), 0 1px 0 rgba(255,255,255,0.85)',
        }}>
        <div className="h-full flex flex-col gap-4">
          {/* ヘッダー */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">パフォーマンス</p>
            </div>
            <div className="flex items-center rounded-full bg-white/60 dark:bg-white/[0.06] border border-white/70 dark:border-white/[0.08] p-0.5">
              <button
                onClick={() => handlePerformanceMonthChange(Math.max(performanceMonth - 1, 0))}
                disabled={performanceMonth <= 0 || isLoadingPerformance}
                className="rounded-full p-1 text-muted-foreground hover:bg-white/70 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <span className="min-w-[4rem] text-center text-[11px] font-semibold text-foreground px-1">
                {getMonthLabel(performanceMonth)}
              </span>
              <button
                onClick={() => handlePerformanceMonthChange(Math.min(performanceMonth + 1, 5))}
                disabled={performanceMonth >= 5 || isLoadingPerformance}
                className="rounded-full p-1 text-muted-foreground hover:bg-white/70 hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 中央コンテンツ：横分割 */}
          <div className={cn("flex gap-5 flex-1 min-h-0 items-center", isLoadingPerformance && "opacity-50 pointer-events-none")}>

            {/* 左：リング - 浮き感のある白カード */}
            <div className="relative flex items-center justify-center flex-shrink-0">
              {/* リング背景カード */}
              <div className="absolute inset-0 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.7)',
                  boxShadow: '0 4px_16px rgba(100,120,180,0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(8px)',
                }} />
              <svg className="-rotate-90" width={120} height={120} style={{ display: 'block', position: 'relative', zIndex: 1 }}>
                <defs>
                  <linearGradient id="perfMainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="60%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                </defs>
                <circle cx={60} cy={60} r={48} fill="none" stroke="rgba(14,165,233,0.1)" strokeWidth={10} />
                <circle cx={60} cy={60} r={48} fill="none"
                  stroke="url(#perfMainGrad)" strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={48 * 2 * Math.PI}
                  strokeDashoffset={48 * 2 * Math.PI * (1 - Math.min(performanceData.avgAchievement / 100, 1))}
                  className="transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 2 }}>
                <span className="text-2xl font-black text-foreground tabular-nums leading-none">
                  {performanceData.avgAchievement}<span className="text-sm">%</span>
                </span>
                <span className="text-[9px] text-muted-foreground mt-0.5">平均達成</span>
                <span className={cn(
                  "text-[10px] font-bold mt-1 px-1.5 py-0.5 rounded-full shadow-sm",
                  performanceData.avgAchievement >= 90 ? "text-emerald-600 bg-white"
                  : performanceData.avgAchievement >= 70 ? "text-sky-600 bg-white"
                  : "text-slate-500 bg-white"
                )}>
                  {performanceData.grade}
                </span>
              </div>
            </div>

            {/* 右：指標リスト - 浮き感のあるガラスカード */}
            <div className="flex-1 min-w-0 space-y-2">
              {[
                { label: '売上', value: performanceData.salesAchievement, actual: `¥${Math.round(performanceData.salesActual / 10000)}万`, target: `¥${Math.round(performanceData.salesTarget / 10000)}万` },
                { label: '注文', value: performanceData.ordersAchievement, actual: `${performanceData.ordersActual}件`, target: `${performanceData.ordersTarget}件` },
                { label: '顧客', value: performanceData.customersAchievement, actual: `${performanceData.customersActual}人`, target: `${performanceData.customersTarget}人` },
              ].map(({ label, value, actual, target }) => {
                const barColor = value >= 100
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : value >= 70
                    ? 'linear-gradient(90deg, #38bdf8, #0ea5e9)'
                    : 'linear-gradient(90deg, #94a3b8, #cbd5e1)';
                return (
                  <div key={label} className="rounded-xl px-3 py-2"
                    style={{
                      background: 'rgba(255,255,255,0.65)',
                      boxShadow: '0 2px 8px rgba(100,120,180,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
                      border: '1px solid rgba(255,255,255,0.7)',
                    }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-foreground/80">{label}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[10px] text-muted-foreground">{actual}</span>
                        <span className="text-[9px] text-muted-foreground/50">/ {target}</span>
                        <span className="text-xs font-black tabular-nums text-foreground ml-1">{value}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'rgba(0,0,0,0.06)' }}>
                      <div className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(value, 100)}%`, background: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* 前月比 */}
          <div className="flex items-center justify-between pt-2.5 border-t border-black/[0.05] flex-shrink-0">
            <span className="text-[10px] text-muted-foreground font-medium">前月比成長</span>
            <span className={cn(
              "text-sm font-black tabular-nums",
              performanceData.growthRate >= 0 ? "text-sky-500" : "text-destructive"
            )}>
              {performanceData.growthRate >= 0 ? '▲' : '▼'} {Math.abs(performanceData.growthRate)}%
            </span>
          </div>
        </div>
      </div>
    ),

    // 最近の注文
    'recent-orders': (
      <WidgetWrapper>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">最近の注文</h3>
          <Button variant="ghost" size="sm" className="text-sky-500 hover:text-sky-600 hover:bg-sky-50 text-xs rounded-lg h-7 px-2" asChild>
            <Link href="/orders">すべて<ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
        {initialData.recentOrders.length > 0 ? (
          <div className="space-y-1 overflow-y-auto h-[calc(100%-44px)] scrollbar-thin">
            {initialData.recentOrders.map((order) => {
              const statusConfig = orderStatusConfig[order.status as OrderStatus] ?? { label: String(order.status), color: 'bg-slate-100 text-slate-700' };
              const customerName = order.customer_name ?? '顧客';
              const total = Number(order.total) || 0;
              return (
                <Link 
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-sky-50/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <Avatar className="h-8 w-8 rounded-full shadow-sm flex-shrink-0">
                    <AvatarFallback className="text-[10px] font-medium text-white bg-gradient-to-br from-sky-400 to-sky-500">
                      {customerName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{customerName}</p>
                    <p className="text-[10px] text-slate-500">{formatCurrency(total)}</p>
                  </div>
                  <Badge className={cn("text-[9px] font-medium rounded-full px-1.5 py-0.5 flex-shrink-0", statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-slate-500">
            まだ注文がありません
          </div>
        )}
      </WidgetWrapper>
    ),

    // 在庫アラート
    'stock-alert': (
      <div className="h-full w-full rounded-2xl p-4 relative cursor-grab active:cursor-grabbing bg-white/60 dark:bg-[rgba(30,32,45,0.55)] backdrop-blur-2xl border border-white/70 dark:border-white/[0.08] shadow-[0_2px_24px_rgba(100,120,160,0.08),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_2px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className={cn("h-4 w-4", initialData.lowStockItems.length > 0 ? "text-sky-500" : "text-slate-400")} />
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">在庫アラート</h3>
          {initialData.lowStockItems.length > 0 && (
            <Badge className="bg-sky-500 text-white text-[9px] h-4 px-1.5">{initialData.lowStockItems.length}</Badge>
          )}
        </div>
        {initialData.lowStockItems.length > 0 ? (
          <div className="space-y-1.5 overflow-y-auto h-[calc(100%-44px)] scrollbar-thin">
            {initialData.lowStockItems.map((item) => (
              <Link
                key={`${item.productId}-${item.variantId}`}
                href={`/products/${item.productId}`}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-colors"
              >
                {/* 商品画像 */}
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-700">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-4 w-4 text-slate-300" />
                    </div>
                  )}
                </div>
                {/* テキスト */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{item.productName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{item.variantName}</p>
                </div>
                {/* 在庫数 */}
                <span className={`text-xs font-bold flex-shrink-0 ${item.stock === 0 ? 'text-red-500' : 'text-sky-600'}`}>
                  残{item.stock}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-xs text-slate-500">在庫OK ✓</p>
          </div>
        )}
      </div>
    ),

    // 人気商品
    'top-products': (
      <WidgetWrapper>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">人気商品</h3>
            <p className="text-xs text-slate-500">今月のベストセラー</p>
          </div>
          <Button variant="ghost" size="sm" className="text-sky-500 hover:text-sky-600 hover:bg-sky-50 text-xs rounded-lg" asChild>
            <Link href="/products">すべて見る<ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
        {initialData.topProducts.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto overflow-y-hidden h-[calc(100%-52px)] pb-2 scrollbar-thin">
            {initialData.topProducts.map((product, index) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group/item relative flex-shrink-0 w-36 rounded-xl bg-slate-50 dark:bg-slate-700/30 hover:bg-sky-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer overflow-hidden border border-slate-100 dark:border-slate-700/50"
              >
                <div className="absolute top-2 left-2 z-10 h-5.5 w-5.5 rounded-full bg-gradient-to-br from-sky-400 to-sky-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                  {index + 1}
                </div>
                <div className="relative aspect-square bg-white dark:bg-slate-800 overflow-hidden">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover/item:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{product.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{product.sales > 0 ? `${product.sales}個販売` : '販売データなし'}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-slate-500">
            まだ販売データがありません
          </div>
        )}
      </WidgetWrapper>
    ),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    revenuePeriod, revenueStats,
    ordersPeriod, ordersStats,
    customersPeriod, customersStats,
    performanceMonth, performanceData, isLoadingPerformance,
    handlePerformanceMonthChange,
  ]);

  // SSRの問題を回避
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ダッシュボード</h1>
            <p className="text-sm text-slate-500">ショップの概要・リアルタイム更新</p>
          </div>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-pulse text-slate-400">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">ダッシュボード</h1>
          <p className="text-xs sm:text-sm text-slate-500">ショップの概要・ドラッグで並び替え可能</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
            className="text-slate-500 hover:text-slate-700 rounded-xl text-xs sm:text-sm"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            <span className="hidden xs:inline">レイアウトを</span>リセット
          </Button>
          <Button className="bg-gradient-to-r from-sky-500 to-sky-500 hover:from-sky-600 hover:to-sky-600 text-white rounded-xl shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all duration-300 text-xs sm:text-sm" asChild>
            <Link href="/reports">レポートを見る</Link>
          </Button>
        </div>
      </div>

      {/* ウィジェットグリッド */}
      <div ref={containerRef} className="overflow-x-hidden w-full min-w-0">
        {width > 0 && (
        <Responsive
          className="layout"
          width={width}
          layouts={layouts}
          breakpoints={{ lg: 1024, md: 768, sm: 480, xs: 0 }}
          cols={{ lg: 12, md: 8, sm: 4, xs: 2 }}
          rowHeight={40}
          onLayoutChange={handleLayoutChange}
          isResizable={false}
          margin={width < 480 ? [10, 10] : [16, 16]}
          containerPadding={[0, 0]}
        >
          <div key="revenue">{widgets.revenue}</div>
          <div key="orders">{widgets.orders}</div>
          <div key="products">{widgets.products}</div>
          <div key="customers">{widgets.customers}</div>
          <div key="chart">{widgets.chart}</div>
          <div key="performance">{widgets.performance}</div>
          <div key="recent-orders">{widgets['recent-orders']}</div>
          <div key="stock-alert">{widgets['stock-alert']}</div>
          <div key="top-products">{widgets['top-products']}</div>
        </Responsive>
        )}
      </div>
    </div>
  );
}

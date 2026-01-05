'use client';

import {
  Package,
  ShoppingCart,
  FileText,
  Users,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Bell,
  TrendingUp,
  Eye,
  Truck,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  mockRecentOrders,
  mockInventorySummary,
  mockDashboardStats,
} from '@/lib/mock-data';
import { cn } from '@/lib/utils';

// 数値フォーマット
const formatCurrency = (value: number) => 
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

export default function DashboardPage() {
  const lowStockItems = mockInventorySummary.filter((item) => item.isLowStock);
  const pendingOrders = mockRecentOrders.filter((order) => order.status === 'pending');
  const processingOrders = mockRecentOrders.filter((order) => order.status === 'processing');
  
  // 今日やることの件数
  const todoCount = pendingOrders.length + processingOrders.length + lowStockItems.length;

  return (
    <div className="space-y-8 pb-8">
      {/* ウェルカムセクション */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-6 sm:p-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">こんにちは！👋</h1>
        <p className="text-white/90 text-sm sm:text-base mb-4">
          今日も頑張りましょう。やることが{todoCount}件あります。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="#todo">
            <Button className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-xl">
              <Bell className="mr-2 h-4 w-4" />
              やることを確認
            </Button>
          </Link>
          <Link href="/products/new">
            <Button className="bg-white text-orange-600 hover:bg-white/90 border-0 rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              商品を追加
            </Button>
          </Link>
        </div>
      </div>

      {/* クイックアクション */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          よく使う機能
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/products/new" className="group">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 hover:border-orange-300 hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3 group-hover:bg-orange-200 transition-colors">
                <Package className="h-6 w-6 text-orange-500" />
              </div>
              <p className="font-medium text-slate-900 dark:text-white">商品を追加</p>
              <p className="text-xs text-slate-500 mt-1">新しい商品を登録</p>
            </div>
          </Link>
          
          <Link href="/orders" className="group">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 hover:border-orange-300 hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                <ShoppingCart className="h-6 w-6 text-blue-500" />
              </div>
              <p className="font-medium text-slate-900 dark:text-white">注文を確認</p>
              <p className="text-xs text-slate-500 mt-1">受注・発送の管理</p>
            </div>
          </Link>
          
          <Link href="/contents/new" className="group">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 hover:border-orange-300 hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3 group-hover:bg-emerald-200 transition-colors">
                <FileText className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="font-medium text-slate-900 dark:text-white">記事を書く</p>
              <p className="text-xs text-slate-500 mt-1">ブログ・お知らせ</p>
            </div>
          </Link>
          
          <Link href="/customers" className="group">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 hover:border-orange-300 hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <p className="font-medium text-slate-900 dark:text-white">顧客を見る</p>
              <p className="text-xs text-slate-500 mt-1">顧客情報の管理</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 今日やること */}
      <div id="todo">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            今日やること
          </h2>
          {todoCount > 0 && (
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
              {todoCount}件
            </Badge>
          )}
        </div>
        
        {todoCount === 0 ? (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-8 text-center border border-emerald-100 dark:border-emerald-800">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-emerald-700 dark:text-emerald-300">すべて完了！</p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">今日やることはありません 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 未処理の注文 */}
            {pendingOrders.length > 0 && (
              <Link href="/orders?status=pending">
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-100 dark:border-amber-800 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                      <Clock className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-amber-900 dark:text-amber-100">入金待ちの注文</p>
                        <Badge className="bg-amber-200 text-amber-800">{pendingOrders.length}件</Badge>
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        入金確認が必要な注文があります
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-amber-500 shrink-0" />
                  </div>
                </div>
              </Link>
            )}
            
            {/* 処理中の注文 */}
            {processingOrders.length > 0 && (
              <Link href="/orders?status=processing">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                      <Truck className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-blue-900 dark:text-blue-100">発送待ちの注文</p>
                        <Badge className="bg-blue-200 text-blue-800">{processingOrders.length}件</Badge>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        発送処理が必要な注文があります
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-blue-500 shrink-0" />
                  </div>
                </div>
              </Link>
            )}
            
            {/* 在庫切れ間近 */}
            {lowStockItems.length > 0 && (
              <Link href="/inventory?filter=low">
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-5 border border-orange-100 dark:border-orange-800 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-orange-900 dark:text-orange-100">在庫が少ない商品</p>
                        <Badge className="bg-orange-200 text-orange-800">{lowStockItems.length}件</Badge>
                      </div>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        在庫の補充を検討してください
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-orange-500 shrink-0" />
                  </div>
                </div>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* 売上サマリー */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">今月の売上</p>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">¥258万</p>
          <p className="text-xs text-emerald-600 mt-1">先月比 +12.5%</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">今月の注文数</p>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">156件</p>
          <p className="text-xs text-emerald-600 mt-1">先月比 +8.2%</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-500">登録商品数</p>
            <Package className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{mockDashboardStats.totalProducts}点</p>
          <p className="text-xs text-slate-500 mt-1">今月 +{mockDashboardStats.productsChange}点追加</p>
        </div>
      </div>

      {/* 最近の注文 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">最近の注文</h2>
          <Link href="/orders">
            <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-600 hover:bg-orange-50">
              すべて見る <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          {mockRecentOrders.slice(0, 5).map((order, index) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <div className={cn(
                "flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer",
                index !== 0 && "border-t border-slate-100 dark:border-slate-700"
              )}>
                {/* ステータスアイコン */}
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                  order.status === 'pending' && "bg-amber-100 text-amber-600",
                  order.status === 'processing' && "bg-blue-100 text-blue-600",
                  order.status === 'delivered' && "bg-emerald-100 text-emerald-600",
                )}>
                  {order.status === 'pending' && <Clock className="h-5 w-5" />}
                  {order.status === 'processing' && <Truck className="h-5 w-5" />}
                  {order.status === 'delivered' && <CheckCircle2 className="h-5 w-5" />}
                </div>
                
                {/* 注文情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 dark:text-white">{order.customerName}</p>
                    <Badge variant="outline" className="text-[10px]">{order.orderNumber}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {order.status === 'pending' && '入金待ち'}
                    {order.status === 'processing' && '発送待ち'}
                    {order.status === 'delivered' && '対応済み'}
                  </p>
                </div>
                
                {/* 金額 */}
                <div className="text-right shrink-0">
                  <p className="font-semibold text-slate-900 dark:text-white">{formatCurrency(order.total)}</p>
                  <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString('ja-JP')}</p>
                </div>
                
                <Eye className="h-4 w-4 text-slate-400 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ヘルプセクション */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">困ったときは</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          初めての方向けのガイドやよくある質問をご用意しています。
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="rounded-xl">
            📖 使い方ガイド
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl">
            ❓ よくある質問
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl">
            💬 サポートに連絡
          </Button>
        </div>
      </div>
    </div>
  );
}

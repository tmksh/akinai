'use client';

import { useState } from 'react';
import {
  Search,
  Package,
  ArrowUpDown,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Boxes,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { mockInventorySummary } from '@/lib/mock-data';
import { PageTabs } from '@/components/layout/page-tabs';
import { cn } from '@/lib/utils';

const inventoryTabs = [
  { label: '在庫一覧', href: '/inventory', exact: true },
  { label: '入出庫履歴', href: '/inventory/movements' },
  { label: 'ロット管理', href: '/inventory/lots' },
];

// 在庫フィルタータブの定義
type StockFilterType = 'all' | 'out' | 'low' | 'ok';

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilterType>('all');
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out'>('in');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');

  // 統計
  const totalItems = mockInventorySummary.length;
  const lowStockItems = mockInventorySummary.filter((i) => i.isLowStock && i.availableStock > 0).length;
  const outOfStockItems = mockInventorySummary.filter((i) => i.availableStock === 0).length;
  const totalStock = mockInventorySummary.reduce((sum, i) => sum + i.currentStock, 0);
  const healthyItems = totalItems - lowStockItems - outOfStockItems;

  // フィルタリング
  const filteredInventory = mockInventorySummary.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && item.isLowStock && item.availableStock > 0) ||
      (stockFilter === 'out' && item.availableStock === 0) ||
      (stockFilter === 'ok' && !item.isLowStock && item.availableStock > 0);
    return matchesSearch && matchesStock;
  });

  // フィルタータブの設定
  const filterTabs = [
    { key: 'all' as StockFilterType, label: 'すべて', count: totalItems, icon: Boxes },
    { key: 'out' as StockFilterType, label: '在庫切れ', count: outOfStockItems, icon: XCircle, color: 'text-red-500' },
    { key: 'low' as StockFilterType, label: '在庫少', count: lowStockItems, icon: AlertTriangle, color: 'text-amber-500' },
    { key: 'ok' as StockFilterType, label: '在庫あり', count: healthyItems, icon: CheckCircle2, color: 'text-emerald-500' },
  ];

  // 在庫レベルを取得
  const getStockLevel = (item: typeof mockInventorySummary[0]) => {
    if (item.availableStock === 0) return 'out';
    if (item.isLowStock) return 'low';
    return 'ok';
  };

  // 在庫バーの割合を計算（最大在庫を50と仮定）
  const getStockPercentage = (stock: number) => {
    const maxStock = 50;
    return Math.min((stock / maxStock) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">在庫管理</h1>
          <p className="text-muted-foreground">
            商品の在庫状況をひと目で確認できます
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-100 dark:border-orange-900/30">
            <span className="text-xs text-muted-foreground">総在庫</span>
            <span className="text-lg font-bold text-orange-600">{totalStock.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">点</span>
          </div>
          <Button variant="outline">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            在庫調整履歴
          </Button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={inventoryTabs} />

      {/* 在庫フィルタータブ - 1クリックでフィルター */}
      <div className="flex flex-wrap items-center gap-2">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = stockFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStockFilter(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200",
                isActive
                  ? "bg-zinc-900 text-white border-zinc-800"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/20"
              )}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-white" : tab.color)} />
              <span className="font-medium text-sm">{tab.label}</span>
              <Badge 
                variant="secondary" 
                className={cn(
                  "ml-1 text-xs min-w-[24px] justify-center",
                  isActive 
                    ? "bg-white/20 text-white border-0" 
                    : "bg-slate-100 dark:bg-slate-800"
                )}
              >
                {tab.count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* 検索 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="商品名・商品コードで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 在庫一覧（カード形式） */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredInventory.length === 0 ? (
          <div className="col-span-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border shadow-lg p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 mb-4">
                <Package className="h-8 w-8 text-slate-500" />
              </div>
              <p className="text-muted-foreground">該当する在庫がありません</p>
            </div>
          </div>
        ) : (
          filteredInventory.map((item) => {
            const stockLevel = getStockLevel(item);
            const stockPercentage = getStockPercentage(item.availableStock);
            
            const gradientClasses = {
              ok: "from-emerald-500/10 via-transparent to-teal-500/10",
              low: "from-amber-500/10 via-transparent to-orange-500/10",
              out: "from-red-500/10 via-transparent to-rose-500/10"
            };
            
            const iconGradients = {
              ok: "from-emerald-500 to-teal-500 shadow-emerald-500/25",
              low: "from-amber-500 to-orange-500 shadow-amber-500/25",
              out: "from-red-500 to-rose-500 shadow-red-500/25"
            };
            
            return (
              <div 
                key={`${item.productId}-${item.variantId}`}
                className="group rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {/* ヘッダー */}
                <div className={cn("p-4 border-b bg-gradient-to-r", gradientClasses[stockLevel])}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110",
                      iconGradients[stockLevel]
                    )}>
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm leading-tight">{item.productName}</h3>
                        <Badge 
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] border-0 shadow-md",
                            stockLevel === 'ok' && "bg-gradient-to-r from-emerald-500 to-teal-500 text-white",
                            stockLevel === 'low' && "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
                            stockLevel === 'out' && "bg-gradient-to-r from-red-500 to-rose-500 text-white"
                          )}
                        >
                          {stockLevel === 'ok' && "在庫あり"}
                          {stockLevel === 'low' && "在庫少"}
                          {stockLevel === 'out' && "在庫切れ"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.variantName}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* 商品コード */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">商品コード</span>
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-xs">{item.sku}</span>
                  </div>
                  
                  {/* 在庫数 - メイン */}
                  <div className="rounded-xl bg-gradient-to-br from-slate-100/80 to-slate-50 dark:from-slate-800/80 dark:to-slate-900 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">利用可能在庫</span>
                      <span className={cn(
                        "text-3xl font-bold",
                        stockLevel === 'ok' && "text-emerald-600",
                        stockLevel === 'low' && "text-amber-600",
                        stockLevel === 'out' && "text-red-600"
                      )}>
                        {item.availableStock}
                      </span>
                    </div>
                    
                    {/* 在庫バー */}
                    <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all rounded-full",
                          stockLevel === 'ok' && "bg-gradient-to-r from-emerald-400 to-teal-500",
                          stockLevel === 'low' && "bg-gradient-to-r from-amber-400 to-orange-500",
                          stockLevel === 'out' && "bg-gradient-to-r from-red-400 to-rose-500"
                        )}
                        style={{ width: `${stockPercentage}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* 詳細数値 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-900/30">
                      <div className="text-muted-foreground text-xs mb-1">現在庫</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{item.currentStock}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 rounded-xl p-3 text-center border border-purple-100 dark:border-purple-900/30">
                      <div className="text-muted-foreground text-xs mb-1">予約済</div>
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{item.reservedStock}</div>
                    </div>
                  </div>
                  
                  {/* 在庫調整ボタン */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full rounded-xl h-11 border-2 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 dark:hover:from-slate-800 dark:hover:to-slate-900">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        在庫を調整
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>在庫調整</DialogTitle>
                        <DialogDescription>
                          {item.productName} - {item.variantName}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-4">
                          <span className="text-sm text-muted-foreground">
                            現在の在庫数
                          </span>
                          <span className="text-2xl font-bold">
                            {item.currentStock}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <Label>調整タイプ</Label>
                          <div className="flex gap-2">
                            <Button
                              variant={adjustmentType === 'in' ? 'default' : 'outline'}
                              className={cn("flex-1 rounded-xl", adjustmentType === 'in' && "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600")}
                              onClick={() => setAdjustmentType('in')}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              入庫
                            </Button>
                            <Button
                              variant={adjustmentType === 'out' ? 'default' : 'outline'}
                              className={cn("flex-1 rounded-xl", adjustmentType === 'out' && "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600")}
                              onClick={() => setAdjustmentType('out')}
                            >
                              <Minus className="mr-2 h-4 w-4" />
                              出庫
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>数量</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={adjustmentQuantity}
                            onChange={(e) =>
                              setAdjustmentQuantity(e.target.value)
                            }
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>理由</Label>
                          <Input placeholder="調整理由を入力" className="rounded-xl" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" className="rounded-xl">キャンセル</Button>
                        <Button className="btn-premium rounded-xl">
                          調整を実行
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

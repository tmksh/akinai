'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  AlertTriangle,
  Package,
  ArrowUpDown,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Boxes,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out'>('in');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');

  // フィルタリング
  const filteredInventory = mockInventorySummary.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && item.isLowStock) ||
      (stockFilter === 'out' && item.availableStock === 0) ||
      (stockFilter === 'ok' && !item.isLowStock && item.availableStock > 0);
    return matchesSearch && matchesStock;
  });

  // 統計
  const totalItems = mockInventorySummary.length;
  const lowStockItems = mockInventorySummary.filter((i) => i.isLowStock).length;
  const outOfStockItems = mockInventorySummary.filter(
    (i) => i.availableStock === 0
  ).length;
  const totalStock = mockInventorySummary.reduce(
    (sum, i) => sum + i.currentStock,
    0
  );
  const healthyItems = totalItems - lowStockItems - outOfStockItems;

  // 在庫の健全度を計算（在庫あり商品の割合）
  const healthPercentage = totalItems > 0 ? Math.round((healthyItems / totalItems) * 100) : 0;

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
        <Button variant="outline">
          <ArrowUpDown className="mr-2 h-4 w-4" />
          在庫調整履歴
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 在庫健全度 */}
        <Card className="widget-card-blue border-0 shadow-lg col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-white/80">
              <Boxes className="h-4 w-4" />
              在庫健全度
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-white">{healthPercentage}%</span>
              <span className="text-sm text-white/70 mb-1">正常</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-white/20 overflow-hidden">
              <div 
                className="h-full bg-white transition-all"
                style={{ width: `${healthPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 在庫あり */}
        <Card className="widget-card-green border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-white/80">
              <CheckCircle2 className="h-4 w-4" />
              在庫あり
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">{healthyItems}</span>
              <span className="text-sm text-white/70">/ {totalItems} SKU</span>
            </div>
          </CardContent>
        </Card>

        {/* 在庫少 */}
        <Card className="widget-card-amber border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-white/80">
              <TrendingDown className="h-4 w-4" />
              在庫少
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">
                {lowStockItems}
              </span>
              <span className="text-sm text-white/70">SKU</span>
            </div>
          </CardContent>
        </Card>

        {/* 在庫切れ */}
        <Card className="widget-card-red border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-white/80">
              <XCircle className="h-4 w-4" />
              在庫切れ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">
                {outOfStockItems}
              </span>
              <span className="text-sm text-white/70">SKU</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 検索・フィルター */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="商品名・SKUで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="在庫状況" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて表示</SelectItem>
            <SelectItem value="ok">✅ 在庫あり</SelectItem>
            <SelectItem value="low">⚠️ 在庫少</SelectItem>
            <SelectItem value="out">❌ 在庫切れ</SelectItem>
          </SelectContent>
        </Select>
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
                  {/* SKU */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">SKU</span>
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
                        <Button className="gradient-brand text-white rounded-xl">
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

      {/* 合計在庫数 */}
      <div className="rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border shadow-lg">
        <div className="p-4 border-b bg-gradient-to-r from-indigo-500/10 via-transparent to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/25">
              <Boxes className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold">在庫サマリー</h3>
          </div>
        </div>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">総在庫数</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{totalStock.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">点</p>
            </div>
            <div className="h-12 w-px bg-border"></div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">管理SKU数</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{totalItems}</p>
              <p className="text-xs text-muted-foreground">SKU</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-xl">
            <ArrowUpDown className="mr-2 h-4 w-4" />
            詳細レポート
          </Button>
        </div>
      </div>
    </div>
  );
}

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
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">該当する在庫がありません</p>
            </CardContent>
          </Card>
        ) : (
          filteredInventory.map((item) => {
            const stockLevel = getStockLevel(item);
            const stockPercentage = getStockPercentage(item.availableStock);
            
            return (
              <Card 
                key={`${item.productId}-${item.variantId}`}
                className={cn(
                  "card-hover overflow-hidden",
                  stockLevel === 'out' && "border-red-200 bg-red-50/30",
                  stockLevel === 'low' && "border-amber-200 bg-amber-50/30"
                )}
              >
                {/* ステータスバー */}
                <div className={cn(
                  "h-1",
                  stockLevel === 'ok' && "bg-emerald-500",
                  stockLevel === 'low' && "bg-amber-500",
                  stockLevel === 'out' && "bg-red-500"
                )} />
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{item.productName}</CardTitle>
                      <CardDescription className="truncate">{item.variantName}</CardDescription>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "shrink-0",
                        stockLevel === 'ok' && "border-emerald-500 text-emerald-600 bg-emerald-50",
                        stockLevel === 'low' && "border-amber-500 text-amber-600 bg-amber-50",
                        stockLevel === 'out' && "border-red-500 text-red-600 bg-red-50"
                      )}
                    >
                      {stockLevel === 'ok' && (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          在庫あり
                        </>
                      )}
                      {stockLevel === 'low' && (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          在庫少
                        </>
                      )}
                      {stockLevel === 'out' && (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          在庫切れ
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* SKU */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">SKU</span>
                    <span className="font-mono bg-muted px-2 py-0.5 rounded">{item.sku}</span>
                  </div>
                  
                  {/* 在庫数 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">利用可能在庫</span>
                      <span className={cn(
                        "text-2xl font-bold",
                        stockLevel === 'ok' && "text-emerald-600",
                        stockLevel === 'low' && "text-amber-600",
                        stockLevel === 'out' && "text-red-600"
                      )}>
                        {item.availableStock}
                      </span>
                    </div>
                    
                    {/* 在庫バー */}
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all rounded-full",
                          stockLevel === 'ok' && "bg-gradient-to-r from-emerald-400 to-emerald-500",
                          stockLevel === 'low' && "bg-gradient-to-r from-amber-400 to-amber-500",
                          stockLevel === 'out' && "bg-gradient-to-r from-red-400 to-red-500"
                        )}
                        style={{ width: `${stockPercentage}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* 詳細数値 */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="text-muted-foreground text-xs">現在庫</div>
                      <div className="font-semibold">{item.currentStock}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <div className="text-muted-foreground text-xs">予約済</div>
                      <div className="font-semibold">{item.reservedStock}</div>
                    </div>
                  </div>
                  
                  {/* 在庫調整ボタン */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full">
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
                        <div className="flex items-center justify-between rounded-lg bg-muted p-4">
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
                              className={cn("flex-1", adjustmentType === 'in' && "bg-emerald-500 hover:bg-emerald-600")}
                              onClick={() => setAdjustmentType('in')}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              入庫
                            </Button>
                            <Button
                              variant={adjustmentType === 'out' ? 'default' : 'outline'}
                              className={cn("flex-1", adjustmentType === 'out' && "bg-amber-500 hover:bg-amber-600")}
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
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>理由</Label>
                          <Input placeholder="調整理由を入力" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">キャンセル</Button>
                        <Button className="gradient-brand text-white">
                          調整を実行
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 合計在庫数 */}
      <Card className="card-hover">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">総在庫数</p>
              <p className="text-2xl font-bold">{totalStock.toLocaleString()} 点</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">管理SKU数</p>
            <p className="text-2xl font-bold">{totalItems} SKU</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

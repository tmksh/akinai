'use client';

import { useState, useEffect, useTransition } from 'react';
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
  Loader2,
  Save,
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
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageTabs } from '@/components/layout/page-tabs';
import { useOrganization } from '@/components/providers/organization-provider';
import { getInventorySummary, adjustStock, type InventorySummary } from '@/lib/actions/inventory';
import { cn } from '@/lib/utils';

const inventoryTabs = [
  { label: '在庫一覧', href: '/inventory', exact: true },
  { label: '入出庫履歴', href: '/inventory/movements' },
  { label: 'ロット管理', href: '/inventory/lots' },
];

// 在庫フィルタータブの定義
type StockFilterType = 'all' | 'out' | 'low' | 'ok';

export default function InventoryPage() {
  const { organization, isLoading: orgLoading } = useOrganization();
  const [inventory, setInventory] = useState<InventorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilterType>('all');

  // 在庫調整ダイアログ
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventorySummary | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out'>('in');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // データ取得
  useEffect(() => {
    const fetchInventory = async () => {
      if (!organization?.id) return;

      setIsLoading(true);
      const { data, error } = await getInventorySummary(organization.id);
      if (data) {
        setInventory(data);
      }
      setIsLoading(false);
    };

    fetchInventory();
  }, [organization?.id]);

  // 統計
  const totalItems = inventory.length;
  const lowStockItems = inventory.filter((i) => i.isLowStock && i.availableStock > 0).length;
  const outOfStockItems = inventory.filter((i) => i.availableStock === 0).length;
  const totalStock = inventory.reduce((sum, i) => sum + i.currentStock, 0);
  const healthyItems = totalItems - lowStockItems - outOfStockItems;

  // フィルタリング
  const filteredInventory = inventory.filter((item) => {
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
  const getStockLevel = (item: InventorySummary) => {
    if (item.availableStock === 0) return 'out';
    if (item.isLowStock) return 'low';
    return 'ok';
  };

  // 在庫バーの割合を計算（最大在庫を50と仮定）
  const getStockPercentage = (stock: number) => {
    const maxStock = 50;
    return Math.min((stock / maxStock) * 100, 100);
  };

  // 在庫調整ダイアログを開く
  const openAdjustDialog = (item: InventorySummary) => {
    setSelectedItem(item);
    setAdjustmentType('in');
    setAdjustmentQuantity('');
    setAdjustmentReason('');
    setAdjustError(null);
    setAdjustDialogOpen(true);
  };

  // 在庫調整を実行
  const handleAdjustStock = () => {
    if (!selectedItem || !organization?.id) return;
    
    const quantity = parseInt(adjustmentQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      setAdjustError('有効な数量を入力してください');
      return;
    }

    setAdjustError(null);

    startTransition(async () => {
      const result = await adjustStock({
        organizationId: organization.id,
        variantId: selectedItem.variantId,
        productId: selectedItem.productId,
        productName: selectedItem.productName,
        variantName: selectedItem.variantName,
        sku: selectedItem.sku,
        type: adjustmentType,
        quantity,
        reason: adjustmentReason || undefined,
      });

      if (result.error) {
        setAdjustError(result.error);
        return;
      }

      // 在庫を更新
      const quantityChange = adjustmentType === 'out' ? -quantity : quantity;
      setInventory(inventory.map(item => {
        if (item.variantId === selectedItem.variantId) {
          const newStock = item.currentStock + quantityChange;
          const newAvailable = Math.max(0, newStock - item.reservedStock);
          return {
            ...item,
            currentStock: newStock,
            availableStock: newAvailable,
            isLowStock: newAvailable <= item.lowStockThreshold,
          };
        }
        return item;
      }));

      setAdjustDialogOpen(false);
    });
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
                  ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/25"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20"
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
      {isLoading || orgLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredInventory.length === 0 ? (
            <div className="col-span-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border shadow-lg p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 mb-4">
                  <Package className="h-8 w-8 text-slate-500" />
                </div>
                <p className="text-muted-foreground">
                  {inventory.length === 0 
                    ? '商品バリアントがまだ登録されていません' 
                    : '該当する在庫がありません'}
                </p>
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
                  key={item.variantId}
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
                    <Button 
                      variant="outline" 
                      className="w-full rounded-xl h-11 border-2 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 dark:hover:from-slate-800 dark:hover:to-slate-900"
                      onClick={() => openAdjustDialog(item)}
                    >
                      <ArrowUpDown className="mr-2 h-4 w-4" />
                      在庫を調整
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 在庫調整ダイアログ */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>在庫調整</DialogTitle>
            <DialogDescription>
              {selectedItem?.productName} - {selectedItem?.variantName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {adjustError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {adjustError}
              </div>
            )}
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 p-4">
              <span className="text-sm text-muted-foreground">
                現在の在庫数
              </span>
              <span className="text-2xl font-bold">
                {selectedItem?.currentStock || 0}
              </span>
            </div>
            <div className="space-y-2">
              <Label>調整タイプ</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={adjustmentType === 'in' ? 'default' : 'outline'}
                  className={cn("flex-1 rounded-xl", adjustmentType === 'in' && "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600")}
                  onClick={() => setAdjustmentType('in')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  入庫
                </Button>
                <Button
                  type="button"
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
                onChange={(e) => setAdjustmentQuantity(e.target.value)}
                className="rounded-xl"
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>理由（任意）</Label>
              <Textarea
                placeholder="調整理由を入力"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="rounded-xl"
                rows={2}
              />
            </div>
            {adjustmentQuantity && selectedItem && (
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-4 border border-blue-100 dark:border-blue-900/30">
                <span className="text-sm text-muted-foreground">
                  調整後の在庫数
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  {selectedItem.currentStock + (adjustmentType === 'in' ? parseInt(adjustmentQuantity, 10) || 0 : -(parseInt(adjustmentQuantity, 10) || 0))}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setAdjustDialogOpen(false)}>
              キャンセル
            </Button>
            <Button 
              className="btn-premium rounded-xl" 
              onClick={handleAdjustStock}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  調整を実行
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

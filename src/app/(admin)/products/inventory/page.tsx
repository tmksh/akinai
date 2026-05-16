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
  Layers,
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
import { getInventorySummary, adjustStock, bulkAdjustStock, type InventorySummary } from '@/lib/actions/inventory';
import { cn } from '@/lib/utils';

const productTabs = [
  { label: '商品一覧', href: '/products', exact: true },
  { label: '在庫', href: '/products/inventory' },
  { label: '入出庫履歴', href: '/products/movements' },
  { label: 'カテゴリー', href: '/products/categories' },
];

type StockFilterType = 'all' | 'out' | 'low' | 'ok';

export default function InventoryPage() {
  const { organization, isLoading: orgLoading } = useOrganization();
  const [inventory, setInventory] = useState<InventorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilterType>('all');

  // 個別在庫調整ダイアログ
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventorySummary | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out'>('in');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // 一括調整ダイアログ
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkType, setBulkType] = useState<'in' | 'out'>('in');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkQuantities, setBulkQuantities] = useState<Record<string, string>>({});
  const [isBulkPending, startBulkTransition] = useTransition();

  const handleBulkAdjust = () => {
    if (!organization?.id) return;
    const items = Object.entries(bulkQuantities)
      .map(([variantId, qty]) => {
        const q = parseInt(qty, 10);
        if (!q || q <= 0) return null;
        const item = inventory.find((i) => i.variantId === variantId);
        if (!item) return null;
        return { variantId, productId: item.productId, productName: item.productName, variantName: item.variantName, sku: item.sku, quantity: q };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (items.length === 0) return;

    startBulkTransition(async () => {
      const { successCount, errors } = await bulkAdjustStock({
        organizationId: organization.id,
        type: bulkType,
        reason: bulkReason || undefined,
        items,
      });
      if (errors.length > 0) {
        alert(`${successCount}件成功、${errors.length}件失敗:\n${errors.slice(0, 5).join('\n')}`);
      }
      if (successCount > 0) {
        const { data } = await getInventorySummary(organization.id);
        if (data) setInventory(data);
        setBulkDialogOpen(false);
        setBulkQuantities({});
        setBulkReason('');
      }
    });
  };

  useEffect(() => {
    const fetchInventory = async () => {
      if (!organization?.id) return;

      setIsLoading(true);
      const { data } = await getInventorySummary(organization.id);
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

  const filterTabs = [
    { key: 'all' as StockFilterType, label: 'すべて', count: totalItems, icon: Boxes },
    { key: 'out' as StockFilterType, label: '在庫切れ', count: outOfStockItems, icon: XCircle, color: 'text-red-500' },
    { key: 'low' as StockFilterType, label: '在庫少', count: lowStockItems, icon: AlertTriangle, color: 'text-sky-500' },
    { key: 'ok' as StockFilterType, label: '在庫あり', count: healthyItems, icon: CheckCircle2, color: 'text-emerald-500' },
  ];

  const getStockLevel = (item: InventorySummary) => {
    if (item.availableStock === 0) return 'out';
    if (item.isLowStock) return 'low';
    return 'ok';
  };

  const getStockPercentage = (stock: number) => {
    const maxStock = 50;
    return Math.min((stock / maxStock) * 100, 100);
  };

  const openAdjustDialog = (item: InventorySummary) => {
    setSelectedItem(item);
    setAdjustmentType('in');
    setAdjustmentQuantity('');
    setAdjustmentReason('');
    setAdjustError(null);
    setAdjustDialogOpen(true);
  };

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
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">商品管理</h1>
          <p className="text-muted-foreground">
            商品の在庫状況を確認・調整します
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={() => { setBulkDialogOpen(true); setBulkQuantities({}); }}>
            <Layers className="mr-2 h-4 w-4" />
            一括調整
          </Button>
          <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-50 to-sky-50 dark:from-sky-950/30 dark:to-sky-950/30 border border-sky-100 dark:border-sky-900/30">
            <Boxes className="h-4 w-4 text-sky-500" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-sky-600">{totalStock.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">点</span>
            </div>
          </div>
        </div>
      </div>

      <PageTabs tabs={productTabs} />

      {/* フィルタータブ */}
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
                  ? "bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/25"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/20"
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
          placeholder="商品名・SKUで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 在庫カード */}
      {isLoading || orgLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredInventory.length === 0 ? (
            <div className="col-span-full rounded-xl bg-slate-50 dark:bg-slate-900 border p-12">
              <div className="flex flex-col items-center justify-center text-center">
                <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
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
              
              const levelConfig = {
                ok: { 
                  gradient: "from-emerald-500 to-teal-500",
                  bg: "bg-emerald-50 dark:bg-emerald-950/20",
                  text: "text-emerald-600",
                  label: "在庫あり"
                },
                low: { 
                  gradient: "from-sky-500 to-sky-500",
                  bg: "bg-sky-50 dark:bg-sky-950/20",
                  text: "text-sky-600",
                  label: "在庫少"
                },
                out: { 
                  gradient: "from-red-500 to-rose-500",
                  bg: "bg-red-50 dark:bg-red-950/20",
                  text: "text-red-600",
                  label: "在庫切れ"
                },
              };

              const config = levelConfig[stockLevel];
              
              return (
                <div 
                  key={item.variantId}
                  className="group rounded-xl bg-white dark:bg-slate-900 border shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {/* ヘッダー */}
                  <div className={cn("p-4 border-b", config.bg)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm truncate">{item.productName}</h3>
                        <p className="text-xs text-muted-foreground truncate">{item.variantName}</p>
                      </div>
                      <Badge className={cn("shrink-0 text-[10px] px-2 py-0.5 border-0 text-white bg-gradient-to-r", config.gradient)}>
                        {config.label}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-[10px] font-mono">{item.sku}</Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {/* 在庫数 */}
                    <div className="text-center">
                      <div className={cn("text-4xl font-bold", config.text)}>
                        {item.availableStock}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">利用可能</p>
                    </div>
                    
                    {/* 在庫バー */}
                    <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full bg-gradient-to-r transition-all", config.gradient)}
                        style={{ width: `${stockPercentage}%` }}
                      />
                    </div>
                    
                    {/* 詳細 */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="text-sm font-semibold">{item.currentStock}</div>
                        <div className="text-[10px] text-muted-foreground">現在庫</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="text-sm font-semibold">{item.reservedStock}</div>
                        <div className="text-[10px] text-muted-foreground">予約済</div>
                      </div>
                    </div>
                    
                    {/* 調整ボタン */}
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                      onClick={() => openAdjustDialog(item)}
                    >
                      <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                      在庫を調整
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 一括調整ダイアログ */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-sky-500" />
              在庫一括調整
            </DialogTitle>
            <DialogDescription>
              数量を入力した商品をまとめて調整します。空欄の商品はスキップされます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* 調整タイプ＋理由 */}
            <div className="flex gap-2">
              <div className="grid grid-cols-2 gap-2 flex-1">
                <Button
                  type="button"
                  variant={bulkType === 'in' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(bulkType === 'in' && "bg-emerald-500 hover:bg-emerald-600")}
                  onClick={() => setBulkType('in')}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />入庫
                </Button>
                <Button
                  type="button"
                  variant={bulkType === 'out' ? 'default' : 'outline'}
                  size="sm"
                  className={cn(bulkType === 'out' && "bg-sky-500 hover:bg-sky-600")}
                  onClick={() => setBulkType('out')}
                >
                  <Minus className="mr-1.5 h-3.5 w-3.5" />出庫
                </Button>
              </div>
              <Input
                placeholder="理由（任意）"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                className="flex-1 text-sm"
              />
            </div>

            {/* 全商品一括セット */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800">
              <span className="text-sm text-sky-700 dark:text-sky-300 font-medium whitespace-nowrap">全商品に適用</span>
              <Input
                type="number"
                min="1"
                placeholder="数量を入力..."
                className="text-sm text-right w-28"
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  setBulkQuantities(
                    Object.fromEntries(inventory.map((i) => [i.variantId, val]))
                  );
                }}
              />
              <span className="text-xs text-sky-600 dark:text-sky-400 whitespace-nowrap">
                → 全 {inventory.length} 件
              </span>
            </div>

          </div>

          <DialogFooter className="pt-2">
            <div className="flex items-center gap-2 mr-auto text-sm text-muted-foreground">
              {Object.values(bulkQuantities).filter((v) => parseInt(v) > 0).length} 件選択中
            </div>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>キャンセル</Button>
            <Button
              onClick={handleBulkAdjust}
              disabled={isBulkPending || Object.values(bulkQuantities).filter((v) => parseInt(v) > 0).length === 0}
              className="btn-premium"
            >
              {isBulkPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              一括調整を実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 個別在庫調整ダイアログ */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md">
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
            <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800 p-4">
              <span className="text-sm text-muted-foreground">現在の在庫数</span>
              <span className="text-2xl font-bold">{selectedItem?.currentStock || 0}</span>
            </div>
            <div className="space-y-2">
              <Label>調整タイプ</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={adjustmentType === 'in' ? 'default' : 'outline'}
                  className={cn(adjustmentType === 'in' && "bg-emerald-500 hover:bg-emerald-600")}
                  onClick={() => setAdjustmentType('in')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  入庫
                </Button>
                <Button
                  type="button"
                  variant={adjustmentType === 'out' ? 'default' : 'outline'}
                  className={cn(adjustmentType === 'out' && "bg-sky-500 hover:bg-sky-600")}
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
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>理由（任意）</Label>
              <Textarea
                placeholder="調整理由を入力"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                rows={2}
              />
            </div>
            {adjustmentQuantity && selectedItem && (
              <div className="flex items-center justify-between rounded-xl bg-sky-50 dark:bg-sky-950/30 p-4 border border-sky-100 dark:border-sky-900/30">
                <span className="text-sm text-muted-foreground">調整後</span>
                <span className="text-2xl font-bold text-sky-600">
                  {selectedItem.currentStock + (adjustmentType === 'in' ? parseInt(adjustmentQuantity, 10) || 0 : -(parseInt(adjustmentQuantity, 10) || 0))}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAdjustStock} disabled={isPending} className="btn-premium">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              調整を実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

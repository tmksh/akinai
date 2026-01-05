'use client';

import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Truck,
  Search,
  Filter,
  Calendar,
  Package,
  Plus,
  Download,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { mockStockMovements, mockInventorySummary } from '@/lib/mock-data';
import { PageTabs } from '@/components/layout/page-tabs';
import { cn } from '@/lib/utils';

const inventoryTabs = [
  { label: '在庫一覧', href: '/inventory', exact: true },
  { label: '入出庫履歴', href: '/inventory/movements' },
  { label: 'ロット管理', href: '/inventory/lots' },
];

const typeConfig = {
  in: { label: '入庫', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: ArrowDownLeft },
  out: { label: '出庫', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: ArrowUpRight },
  adjustment: { label: '調整', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: RefreshCw },
  transfer: { label: '移動', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: Truck },
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

type StockMovement = typeof mockStockMovements[number];

export default function StockMovementsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showNewMovementDialog, setShowNewMovementDialog] = useState(false);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);

  // フィルタリング
  const filteredMovements = mockStockMovements.filter((movement) => {
    const matchesSearch =
      movement.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movement.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (movement.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesType = typeFilter === 'all' || movement.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // 統計
  const stats = {
    totalIn: mockStockMovements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.quantity, 0),
    totalOut: Math.abs(mockStockMovements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.quantity, 0)),
    adjustments: mockStockMovements.filter(m => m.type === 'adjustment').length,
    today: mockStockMovements.filter(m => {
      const today = new Date().toDateString();
      return new Date(m.createdAt).toDateString() === today;
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">在庫管理</h1>
          <p className="text-muted-foreground">
            在庫の入出庫記録を管理します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </Button>
          <Dialog open={showNewMovementDialog} onOpenChange={setShowNewMovementDialog}>
            <DialogTrigger asChild>
              <Button className="btn-premium">
                <Plus className="mr-2 h-4 w-4" />
                入出庫登録
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>入出庫登録</DialogTitle>
                <DialogDescription>
                  在庫の入庫または出庫を登録します
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>種別</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={movementType === 'in' ? 'default' : 'outline'}
                      className={cn(movementType === 'in' && 'bg-emerald-600 hover:bg-emerald-700')}
                      onClick={() => setMovementType('in')}
                    >
                      <ArrowDownLeft className="mr-2 h-4 w-4" />
                      入庫
                    </Button>
                    <Button
                      variant={movementType === 'out' ? 'default' : 'outline'}
                      className={cn(movementType === 'out' && 'bg-blue-600 hover:bg-blue-700')}
                      onClick={() => setMovementType('out')}
                    >
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      出庫
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>商品</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="商品を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockInventorySummary.map((item) => (
                        <SelectItem key={`${item.productId}-${item.variantId}`} value={item.variantId}>
                          {item.productName} - {item.variantName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>数量</Label>
                    <Input type="number" min="1" placeholder="10" />
                  </div>
                  <div className="space-y-2">
                    <Label>ロット番号</Label>
                    <Input placeholder="LOT-20240115" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>参照番号（任意）</Label>
                  <Input placeholder="PO-2024-001 など" />
                </div>
                <div className="space-y-2">
                  <Label>理由・備考</Label>
                  <Textarea placeholder="入出庫の理由を入力..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewMovementDialog(false)}>
                  キャンセル
                </Button>
                <Button onClick={() => setShowNewMovementDialog(false)}>
                  登録
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={inventoryTabs} />

      {/* 統計カード - オレンジグラデーション */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {/* 総入庫数 - 薄いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100/50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/40 border border-orange-100 dark:border-orange-800/30 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <ArrowDownLeft className="h-4 w-4 text-orange-500" />
            </div>
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">総入庫数</span>
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.totalIn}</div>
          <p className="text-xs text-orange-600 dark:text-orange-400">個</p>
        </div>

        {/* 総出庫数 - やや濃いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-100 via-orange-200/60 to-amber-100 dark:from-orange-900/50 dark:via-orange-800/40 dark:to-amber-900/50 border border-orange-200 dark:border-orange-700/40 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <ArrowUpRight className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-800 dark:text-orange-200">総出庫数</span>
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.totalOut}</div>
          <p className="text-xs text-orange-600 dark:text-orange-400">個</p>
        </div>

        {/* 在庫調整 - 濃いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-200 via-orange-300/70 to-amber-200 dark:from-orange-800/60 dark:via-orange-700/50 dark:to-amber-800/60 border border-orange-300 dark:border-orange-600/50 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70">
              <RefreshCw className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-800 dark:text-orange-200">在庫調整</span>
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.adjustments}</div>
          <p className="text-xs text-orange-700 dark:text-orange-300">件</p>
        </div>

        {/* 本日の処理 - 最も濃いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 dark:from-orange-600 dark:via-orange-500 dark:to-amber-600 border border-orange-400 dark:border-orange-500 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/30">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-medium text-white/90">本日の処理</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.today}</div>
          <p className="text-xs text-white/80">件</p>
        </div>
      </div>

      {/* 履歴一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>入出庫履歴</CardTitle>
          <CardDescription>在庫の入出庫記録を確認できます</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 検索・フィルター */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="商品名・SKU・参照番号で検索..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="種別" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="in">入庫</SelectItem>
                <SelectItem value="out">出庫</SelectItem>
                <SelectItem value="adjustment">調整</SelectItem>
                <SelectItem value="transfer">移動</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* テーブル */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>商品</TableHead>
                  <TableHead className="text-right">数量</TableHead>
                  <TableHead className="text-right">在庫変動</TableHead>
                  <TableHead>理由</TableHead>
                  <TableHead>参照</TableHead>
                  <TableHead>担当者</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-muted-foreground">該当する履歴がありません</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((movement) => {
                    const config = typeConfig[movement.type];
                    const TypeIcon = config.icon;

                    return (
                      <TableRow 
                        key={movement.id} 
                        className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        onClick={() => setSelectedMovement(movement)}
                      >
                        <TableCell className="text-sm">
                          <div>
                            <p className="font-medium">{formatDate(movement.createdAt)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(movement.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", config.bgColor, config.color, "border-0")}>
                            <TypeIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{movement.productName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{movement.variantName}</span>
                              <Badge variant="outline" className="text-xs">{movement.sku}</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-semibold",
                            movement.quantity > 0 ? "text-emerald-600" : "text-blue-600"
                          )}>
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-muted-foreground">{movement.previousStock}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="font-medium">{movement.newStock}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {movement.reason}
                        </TableCell>
                        <TableCell>
                          {movement.reference ? (
                            <Badge variant="secondary" className="text-xs">
                              {movement.reference}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {movement.createdBy}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 詳細ダイアログ */}
      <Dialog open={!!selectedMovement} onOpenChange={() => setSelectedMovement(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedMovement && (
                <>
                  <div className={cn(
                    "p-2 rounded-lg",
                    typeConfig[selectedMovement.type].bgColor
                  )}>
                    {(() => {
                      const TypeIcon = typeConfig[selectedMovement.type].icon;
                      return <TypeIcon className={cn("h-5 w-5", typeConfig[selectedMovement.type].color)} />;
                    })()}
                  </div>
                  <div>
                    <div className="text-lg font-bold">入出庫詳細</div>
                    <Badge className={cn(
                      "gap-1 mt-1",
                      typeConfig[selectedMovement.type].bgColor,
                      typeConfig[selectedMovement.type].color,
                      "border-0"
                    )}>
                      {typeConfig[selectedMovement.type].label}
                    </Badge>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedMovement && (
            <div className="space-y-6">
              {/* 商品情報 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-500">商品情報</h4>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                      <Package className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedMovement.productName}</p>
                      <p className="text-sm text-slate-500">{selectedMovement.variantName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Badge variant="outline" className="text-xs">SKU: {selectedMovement.sku}</Badge>
                    {selectedMovement.lotNumber && (
                      <Badge variant="outline" className="text-xs">ロット: {selectedMovement.lotNumber}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* 数量変動 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
                  <p className="text-xs text-slate-500 mb-1">変動前</p>
                  <p className="text-xl font-bold">{selectedMovement.previousStock}</p>
                </div>
                <div className={cn(
                  "p-3 rounded-xl text-center",
                  selectedMovement.quantity > 0 
                    ? "bg-emerald-50 dark:bg-emerald-950/30" 
                    : "bg-blue-50 dark:bg-blue-950/30"
                )}>
                  <p className="text-xs text-slate-500 mb-1">数量</p>
                  <p className={cn(
                    "text-xl font-bold",
                    selectedMovement.quantity > 0 ? "text-emerald-600" : "text-blue-600"
                  )}>
                    {selectedMovement.quantity > 0 ? '+' : ''}{selectedMovement.quantity}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-center">
                  <p className="text-xs text-slate-500 mb-1">変動後</p>
                  <p className="text-xl font-bold text-orange-600">{selectedMovement.newStock}</p>
                </div>
              </div>

              {/* 詳細情報 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-500">詳細情報</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">日時</span>
                    <span className="font-medium">{formatDateTime(selectedMovement.createdAt)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">理由</span>
                    <span className="font-medium">{selectedMovement.reason}</span>
                  </div>
                  {selectedMovement.reference && (
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">参照番号</span>
                      <Badge variant="secondary">{selectedMovement.reference}</Badge>
                    </div>
                  )}
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">担当者</span>
                    <span className="font-medium">{selectedMovement.createdBy}</span>
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedMovement(null)}>
                  閉じる
                </Button>
                <Button className="flex-1 btn-premium">
                  <FileText className="mr-2 h-4 w-4" />
                  伝票を表示
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



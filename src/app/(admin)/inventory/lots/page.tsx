'use client';

import { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Package,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageTabs } from '@/components/layout/page-tabs';
import { cn } from '@/lib/utils';

const inventoryTabs = [
  { label: '在庫一覧', href: '/inventory', exact: true },
  { label: '入出庫履歴', href: '/inventory/movements' },
  { label: 'ロット管理', href: '/inventory/lots' },
];

// ロットモックデータ
const mockLots = [
  {
    id: 'lot-1',
    lotNumber: 'LOT-20240101',
    productId: 'prod-1',
    productName: 'オーガニックコットンTシャツ',
    variantName: 'ホワイト / S',
    sku: 'OCT-WH-S',
    initialQuantity: 50,
    currentQuantity: 25,
    manufacturedAt: '2024-01-01T00:00:00Z',
    expiryDate: null,
    supplier: 'テキスタイルサプライ株式会社',
    status: 'active',
    notes: '初回入荷ロット',
  },
  {
    id: 'lot-2',
    lotNumber: 'LOT-20240105',
    productId: 'prod-2',
    productName: '手作り革財布',
    variantName: 'ブラウン',
    sku: 'HLW-BR',
    initialQuantity: 20,
    currentQuantity: 8,
    manufacturedAt: '2024-01-05T00:00:00Z',
    expiryDate: null,
    supplier: '職人工房 山田',
    status: 'active',
    notes: '',
  },
  {
    id: 'lot-3',
    lotNumber: 'LOT-20240110',
    productId: 'prod-4',
    productName: '特選日本茶セット',
    variantName: '贈答用',
    sku: 'JTS-GIFT',
    initialQuantity: 100,
    currentQuantity: 100,
    manufacturedAt: '2024-01-10T00:00:00Z',
    expiryDate: '2025-01-10T00:00:00Z',
    supplier: '静岡茶農園',
    status: 'active',
    notes: '賞味期限あり商品',
  },
  {
    id: 'lot-4',
    lotNumber: 'LOT-20231201',
    productId: 'prod-4',
    productName: '特選日本茶セット',
    variantName: '贈答用',
    sku: 'JTS-GIFT',
    initialQuantity: 50,
    currentQuantity: 5,
    manufacturedAt: '2023-12-01T00:00:00Z',
    expiryDate: '2024-06-01T00:00:00Z',
    supplier: '静岡茶農園',
    status: 'expiring',
    notes: '賞味期限間近',
  },
  {
    id: 'lot-5',
    lotNumber: 'LOT-20230601',
    productId: 'prod-3',
    productName: '陶器マグカップ',
    variantName: 'ホワイト',
    sku: 'CMC-WH',
    initialQuantity: 30,
    currentQuantity: 0,
    manufacturedAt: '2023-06-01T00:00:00Z',
    expiryDate: null,
    supplier: '備前焼工房',
    status: 'depleted',
    notes: '完売',
  },
];

const statusConfig = {
  active: { label: 'アクティブ', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: CheckCircle },
  expiring: { label: '期限間近', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: AlertTriangle },
  depleted: { label: '在庫なし', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: XCircle },
};

const formatDate = (dateString: string | null) =>
  dateString ? new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

// 期限までの日数を計算
const getDaysUntilExpiry = (expiryDate: string | null) => {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default function LotsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewLotDialog, setShowNewLotDialog] = useState(false);

  // フィルタリング
  const filteredLots = mockLots.filter((lot) => {
    const matchesSearch =
      lot.lotNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lot.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 統計
  const stats = {
    total: mockLots.length,
    active: mockLots.filter((l) => l.status === 'active').length,
    expiring: mockLots.filter((l) => l.status === 'expiring').length,
    depleted: mockLots.filter((l) => l.status === 'depleted').length,
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">在庫管理</h1>
          <p className="text-muted-foreground">
            商品のロット・製造番号を管理します
          </p>
        </div>
        <Dialog open={showNewLotDialog} onOpenChange={setShowNewLotDialog}>
          <DialogTrigger asChild>
            <Button className="btn-premium">
              <Plus className="mr-2 h-4 w-4" />
              ロット登録
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新規ロット登録</DialogTitle>
              <DialogDescription>
                新しいロット（製造番号）を登録します
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ロット番号 *</Label>
                  <Input placeholder="LOT-20240115" />
                </div>
                <div className="space-y-2">
                  <Label>製造日</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>商品 *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="商品を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prod-1">オーガニックコットンTシャツ - ホワイト / S</SelectItem>
                    <SelectItem value="prod-2">手作り革財布 - ブラウン</SelectItem>
                    <SelectItem value="prod-3">陶器マグカップ - ホワイト</SelectItem>
                    <SelectItem value="prod-4">特選日本茶セット - 贈答用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>数量 *</Label>
                  <Input type="number" min="1" placeholder="100" />
                </div>
                <div className="space-y-2">
                  <Label>賞味/消費期限</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>仕入先/製造元</Label>
                <Input placeholder="株式会社サプライヤー" />
              </div>
              <div className="space-y-2">
                <Label>備考</Label>
                <Input placeholder="備考を入力..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewLotDialog(false)}>
                キャンセル
              </Button>
              <Button onClick={() => setShowNewLotDialog(false)}>
                登録
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={inventoryTabs} />

      {/* 統計カード - オレンジグラデーション */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {/* 総ロット数 - 薄いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100/50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/40 border border-orange-100 dark:border-orange-800/30 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <Layers className="h-4 w-4 text-orange-500" />
            </div>
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">総ロット数</span>
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.total}</div>
          <p className="text-xs text-orange-600 dark:text-orange-400">件</p>
        </div>

        {/* アクティブ - やや濃いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-100 via-orange-200/60 to-amber-100 dark:from-orange-900/50 dark:via-orange-800/40 dark:to-amber-900/50 border border-orange-200 dark:border-orange-700/40 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <CheckCircle className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-800 dark:text-orange-200">アクティブ</span>
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.active}</div>
          <p className="text-xs text-orange-600 dark:text-orange-400">件</p>
        </div>

        {/* 期限間近 - 濃いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-200 via-orange-300/70 to-amber-200 dark:from-orange-800/60 dark:via-orange-700/50 dark:to-amber-800/60 border border-orange-300 dark:border-orange-600/50 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-800 dark:text-orange-200">期限間近</span>
          </div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.expiring}</div>
          <p className="text-xs text-orange-700 dark:text-orange-300">件</p>
        </div>

        {/* 在庫なし - 最も濃いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 dark:from-orange-600 dark:via-orange-500 dark:to-amber-600 border border-orange-400 dark:border-orange-500 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/30">
              <XCircle className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-medium text-white/90">在庫なし</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.depleted}</div>
          <p className="text-xs text-white/80">件</p>
        </div>
      </div>

      {/* 期限間近アラート */}
      {stats.expiring > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              期限間近のロット
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockLots
                .filter((l) => l.status === 'expiring')
                .map((lot) => {
                  const daysUntil = getDaysUntilExpiry(lot.expiryDate);
                  return (
                    <div key={lot.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-900 border">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                          <Package className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{lot.productName}</p>
                          <p className="text-xs text-muted-foreground">{lot.lotNumber} | 残り {lot.currentQuantity} 個</p>
                        </div>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 border-0">
                        <Clock className="h-3 w-3 mr-1" />
                        あと {daysUntil} 日
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ロット一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>ロット一覧</CardTitle>
          <CardDescription>登録されているロットを管理します</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 検索・フィルター */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ロット番号・商品名・SKUで検索..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="active">アクティブ</SelectItem>
                <SelectItem value="expiring">期限間近</SelectItem>
                <SelectItem value="depleted">在庫なし</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* テーブル */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ロット番号</TableHead>
                  <TableHead>商品</TableHead>
                  <TableHead>在庫状況</TableHead>
                  <TableHead>製造日</TableHead>
                  <TableHead>賞味/消費期限</TableHead>
                  <TableHead>仕入先</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Layers className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-muted-foreground">該当するロットがありません</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLots.map((lot) => {
                    const config = statusConfig[lot.status as keyof typeof statusConfig];
                    const StatusIcon = config.icon;
                    const usagePercent = (lot.currentQuantity / lot.initialQuantity) * 100;
                    const daysUntil = getDaysUntilExpiry(lot.expiryDate);

                    return (
                      <TableRow key={lot.id} className="group">
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {lot.lotNumber}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{lot.productName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{lot.variantName}</span>
                              <Badge variant="secondary" className="text-xs">{lot.sku}</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 w-32">
                            <div className="flex justify-between text-xs">
                              <span>{lot.currentQuantity}</span>
                              <span className="text-muted-foreground">/ {lot.initialQuantity}</span>
                            </div>
                            <Progress value={usagePercent} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(lot.manufacturedAt)}
                        </TableCell>
                        <TableCell>
                          {lot.expiryDate ? (
                            <div className={cn(
                              "text-sm",
                              daysUntil !== null && daysUntil < 30 && "text-amber-600 font-medium"
                            )}>
                              {formatDate(lot.expiryDate)}
                              {daysUntil !== null && daysUntil < 90 && (
                                <p className="text-xs text-muted-foreground">
                                  あと {daysUntil} 日
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {lot.supplier}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", config.bgColor, config.color, "border-0")}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                詳細を見る
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Pencil className="mr-2 h-4 w-4" />
                                編集
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                削除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
    </div>
  );
}



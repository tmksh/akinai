'use client';

import { useState, useEffect } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Truck,
  Search,
  Filter,
  Package,
  FileText,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageTabs } from '@/components/layout/page-tabs';
import { useOrganization } from '@/components/providers/organization-provider';
import { getStockMovements, type StockMovementWithRelations } from '@/lib/actions/inventory';
import { cn } from '@/lib/utils';

const productTabs = [
  { label: '商品一覧', href: '/products', exact: true },
  { label: '在庫', href: '/products/inventory' },
  { label: '入出庫履歴', href: '/products/movements' },
  { label: 'カテゴリー', href: '/products/categories' },
];

const typeConfig = {
  in: { label: '入庫', color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', icon: ArrowDownLeft },
  out: { label: '出庫', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30', icon: ArrowUpRight },
  adjustment: { label: '調整', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: RefreshCw },
  transfer: { label: '移動', color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: Truck },
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

export default function StockMovementsPage() {
  const { organization, isLoading: orgLoading } = useOrganization();
  const [movements, setMovements] = useState<StockMovementWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    const fetchMovements = async () => {
      if (!organization?.id) return;

      setIsLoading(true);
      const { data, total } = await getStockMovements(organization.id, {
        type: typeFilter !== 'all' ? typeFilter as 'in' | 'out' | 'adjustment' | 'transfer' : undefined,
        limit: 100,
      });
      
      if (data) {
        setMovements(data);
        setTotalCount(total);
      }
      setIsLoading(false);
    };

    fetchMovements();
  }, [organization?.id, typeFilter]);

  const filteredMovements = movements.filter((movement) => {
    const productName = movement.product?.name || '';
    const variantName = movement.variant?.name || '';
    const sku = movement.variant?.sku || '';
    const reference = movement.reference || '';
    
    return (
      productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reference.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // 統計
  const stats = {
    totalIn: movements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.quantity, 0),
    totalOut: movements.filter(m => m.type === 'out').reduce((sum, m) => sum + Math.abs(m.quantity), 0),
    adjustments: movements.filter(m => m.type === 'adjustment').length,
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">商品管理</h1>
          <p className="text-muted-foreground">
            在庫の入出庫記録を確認します
          </p>
        </div>
      </div>

      <PageTabs tabs={productTabs} />

      {/* 統計カード */}
      <div className="grid gap-4 grid-cols-3">
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">総入庫</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">+{stats.totalIn}</div>
        </div>
        <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">総出庫</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">-{stats.totalOut}</div>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">調整</span>
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.adjustments}</div>
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="商品名・SKU・参照番号で検索..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
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
        <div className="text-sm text-muted-foreground">
          {totalCount}件
        </div>
      </div>

      {/* テーブル */}
      {isLoading || orgLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border bg-white dark:bg-slate-900 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="w-[100px]">日時</TableHead>
                <TableHead className="w-[80px]">種別</TableHead>
                <TableHead>商品</TableHead>
                <TableHead className="text-right w-[80px]">数量</TableHead>
                <TableHead className="text-right w-[120px]">在庫変動</TableHead>
                <TableHead className="hidden md:table-cell">理由</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-muted-foreground">
                        {movements.length === 0 
                          ? '入出庫履歴がまだありません' 
                          : '該当する履歴がありません'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement) => {
                  const config = typeConfig[movement.type as keyof typeof typeConfig] || typeConfig.adjustment;
                  const TypeIcon = config.icon;
                  const quantity = movement.type === 'out' ? -Math.abs(movement.quantity) : Math.abs(movement.quantity);

                  return (
                    <TableRow key={movement.id} className="group">
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{formatDate(movement.created_at)}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(movement.created_at)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1 border-0", config.bgColor, config.color)}>
                          <TypeIcon className="h-3 w-3" />
                          <span className="hidden sm:inline">{config.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{movement.product?.name || '-'}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {movement.variant?.name || '-'}
                              {movement.variant?.sku && (
                                <span className="ml-1 opacity-60">({movement.variant.sku})</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-semibold tabular-nums",
                          quantity > 0 ? "text-emerald-600" : "text-orange-600"
                        )}>
                          {quantity > 0 ? '+' : ''}{quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 text-sm tabular-nums">
                          <span className="text-muted-foreground">{movement.previous_stock}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{movement.new_stock}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {movement.reason || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useTransition, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Copy,
  Archive,
  Package,
  CheckCircle,
  FileEdit,
  AlertTriangle,
  Loader2,
  Upload,
  SlidersHorizontal,
  X,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PageTabs } from '@/components/layout/page-tabs';
import { useOrganization } from '@/components/providers/organization-provider';
import { getProducts, getCategories, deleteProduct, updateProductStatus, duplicateProduct, type ProductWithRelations } from '@/lib/actions/products';
import { toast } from 'sonner';
import { ProductImportDialog } from '@/components/products/import-dialog';
import type { ProductStatus } from '@/types';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];

const productTabs = [
  { label: '商品一覧', href: '/products', exact: true },
  { label: '在庫', href: '/products/inventory' },
  { label: '入出庫履歴', href: '/products/movements' },
  { label: 'カテゴリー', href: '/products/categories' },
];

const statusConfig: Record<ProductStatus, { label: string; dot: string }> = {
  published: { label: '公開中', dot: 'bg-emerald-500' },
  draft:     { label: '下書き', dot: 'bg-slate-400' },
  archived:  { label: 'アーカイブ', dot: 'bg-slate-300' },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

interface ProductsClientProps {
  initialProducts: ProductWithRelations[];
  initialCategories: Category[];
  organizationId: string;
  totalProducts: number;
}

export default function ProductsClient({
  initialProducts,
  initialCategories,
  organizationId,
  totalProducts,
}: ProductsClientProps) {
  const { organization } = useOrganization();
  const [products, setProducts] = useState<ProductWithRelations[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithRelations | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const filteredProducts = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return products.filter((p) => {
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.variants.some(v => v.sku.toLowerCase().includes(q));
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchCat = categoryFilter === 'all' || p.categories.some(c => c.id === categoryFilter);
      return matchSearch && matchStatus && matchCat;
    });
  }, [products, debouncedSearch, statusFilter, categoryFilter]);

  const stats = useMemo(() => ({
    total: products.length,
    published: products.filter(p => p.status === 'published').length,
    draft: products.filter(p => p.status === 'draft').length,
    outOfStock: products.filter(p => p.variants.reduce((s, v) => s + v.stock, 0) === 0).length,
  }), [products]);

  const handleDelete = async () => {
    if (!productToDelete) return;
    startTransition(async () => {
      const result = await deleteProduct(productToDelete.id);
      if (result.success) {
        setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
        toast.success('商品を削除しました');
      } else {
        toast.error('削除に失敗しました');
      }
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    });
  };

  const handleStatusUpdate = (productId: string, newStatus: 'draft' | 'published' | 'archived') => {
    startTransition(async () => {
      const result = await updateProductStatus(productId, newStatus);
      if (result.success) {
        setProducts(prev => prev.map(p =>
          p.id === productId
            ? { ...p, status: newStatus, published_at: newStatus === 'published' ? new Date().toISOString() : p.published_at }
            : p
        ));
      }
    });
  };

  const hasActiveFilter = statusFilter !== 'all' || categoryFilter !== 'all';

  return (
    <div className="space-y-5 min-w-0">

      {/* ── ヘッダー ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight">商品管理</h1>
          <p className="text-sm text-muted-foreground mt-0.5">商品の登録・編集・在庫管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/products">
              <Sparkles className="h-4 w-4 mr-1.5 text-orange-500" />
              カスタムフィールド
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            CSVインポート
          </Button>
          <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm">
            <Link href="/products/new">
              <Plus className="h-4 w-4 mr-1.5" />
              商品を追加
            </Link>
          </Button>
        </div>
      </div>

      {/* ── タブ ── */}
      <PageTabs tabs={productTabs} />

      {/* ── サマリーバー ── */}
      <div className="flex items-center rounded-2xl border border-white/40 overflow-hidden divide-x divide-white/30 dark:divide-slate-800" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(16px)' }}>
        {[
          { label: '全商品',   value: stats.total,      filter: 'all',       alert: false },
          { label: '公開中',   value: stats.published,  filter: 'published', alert: false },
          { label: '下書き',   value: stats.draft,      filter: 'draft',     alert: false },
          { label: '在庫切れ', value: stats.outOfStock, filter: 'all',       alert: stats.outOfStock > 0 },
        ].map(({ label, value, filter, alert }) => (
          <button
            key={label}
            onClick={() => setStatusFilter(filter)}
            className={`flex-1 flex flex-col items-center py-3 px-2 transition-colors hover:bg-orange-50 ${statusFilter === filter && label !== '在庫切れ' ? 'bg-orange-50' : ''}`}
          >
            <span className={`text-lg font-bold ${alert ? 'text-red-500' : 'text-foreground'}`}>{value}</span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>

      {/* ── 検索・フィルター ── */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="商品名・SKUで検索..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-900"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters || hasActiveFilter ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(v => !v)}
            className={hasActiveFilter ? 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' : ''}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* フィルターパネル（展開式） */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-3 rounded-2xl border border-white/40" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(16px)' }}>
            {/* ステータス */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">ステータス</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'all', label: 'すべて' },
                  { value: 'published', label: '公開中' },
                  { value: 'draft', label: '下書き' },
                  { value: 'archived', label: 'アーカイブ' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${
                      statusFilter === opt.value
                        ? 'bg-orange-500 text-white border-orange-500 font-medium'
                        : 'border-orange-200 text-orange-800 hover:border-orange-400 hover:bg-orange-50'
                    }`}
                    style={statusFilter !== opt.value ? { background: 'rgba(255,255,255,0.35)' } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* カテゴリー */}
            {categories.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">カテゴリー</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${
                      categoryFilter === 'all'
                        ? 'bg-orange-500 text-white border-orange-500 font-medium'
                        : 'border-orange-200 text-orange-800 hover:border-orange-400 hover:bg-orange-50'
                    }`}
                    style={categoryFilter !== 'all' ? { background: 'rgba(255,255,255,0.35)' } : {}}
                  >
                    すべて
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${
                        categoryFilter === cat.id
                          ? 'bg-orange-500 text-white border-orange-500 font-medium'
                          : 'border-orange-200 text-orange-800 hover:border-orange-400 hover:bg-orange-50'
                      }`}
                      style={categoryFilter !== cat.id ? { background: 'rgba(255,255,255,0.35)' } : {}}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {hasActiveFilter && (
              <div className="w-full flex justify-end">
                <button
                  onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  フィルターをリセット
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 件数表示 ── */}
      {(debouncedSearch || hasActiveFilter) && (
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{filteredProducts.length}</span> 件の商品
        </p>
      )}

      {/* ── 商品グリッド ── */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-orange-200/40" style={{ background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)' }}>
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-orange-400" />
          </div>
          {products.length === 0 ? (
            <>
              <p className="font-medium mb-1">まだ商品がありません</p>
              <p className="text-sm text-muted-foreground mb-4">最初の商品を追加してみましょう</p>
              <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                <Link href="/products/new">
                  <Plus className="h-4 w-4 mr-1.5" />
                  商品を追加
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="font-medium mb-1">該当する商品が見つかりません</p>
              <p className="text-sm text-muted-foreground">検索条件を変えてみてください</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredProducts.map((product) => {
            const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
            const prices = product.variants.map(v => v.price);
            const minPrice = prices.length ? Math.min(...prices) : 0;
            const maxPrice = prices.length ? Math.max(...prices) : 0;
            const priceText = prices.length === 0 ? '-' : minPrice === maxPrice ? formatCurrency(minPrice) : `${formatCurrency(minPrice)}〜`;
            const status = statusConfig[product.status];
            const isOutOfStock = totalStock === 0;

            return (
              <div
                key={product.id}
                className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(100,120,160,0.15)]"
                style={{
                  background: 'rgba(255,255,255,0.62)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 2px 20px rgba(100,120,160,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
                }}
              >
                {/* 画像エリア */}
                <Link href={`/products/${product.id}`} className="block">
                  <div className="relative aspect-square overflow-hidden rounded-t-2xl"
                    style={{ background: 'linear-gradient(135deg, rgba(250,250,252,0.9) 0%, rgba(245,246,250,0.9) 100%)' }}>
                    {product.images[0] ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.name}
                        fill
                        sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
                        loading="lazy"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-10 w-10 opacity-15" />
                      </div>
                    )}
                    {/* ホバー時グラデーション */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* 在庫切れオーバーレイ */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-red-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm tracking-wide">
                          在庫切れ
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* 情報エリア */}
                <div className="p-3">
                  {/* ステータスドット */}
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                    <span className="text-[10px] text-muted-foreground">{status.label}</span>
                  </div>

                  {/* 商品名 */}
                  <Link href={`/products/${product.id}`} className="block">
                    <p className="text-xs font-semibold leading-tight line-clamp-2 text-foreground hover:text-orange-600 transition-colors mb-2">
                      {product.name}
                    </p>
                  </Link>

                  {/* 価格・在庫 */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{priceText}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      isOutOfStock
                        ? 'text-red-600 bg-red-50'
                        : totalStock <= 5
                          ? 'text-amber-600 bg-amber-50'
                          : 'text-slate-500 bg-slate-50'
                    }`}>
                      在庫 {totalStock}
                    </span>
                  </div>
                </div>

                {/* アクションメニュー（ホバーで表示） */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-white/90 backdrop-blur-sm shadow-sm border border-white/80"
                        disabled={isPending}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link href={`/products/${product.id}`}>
                          <Eye className="mr-2 h-4 w-4" /> 詳細を見る
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/products/${product.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" /> 編集
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => startTransition(async () => {
                          const result = await duplicateProduct(product.id);
                          if (result.data) {
                            toast.success('複製しました');
                            const { data } = await getProducts(organizationId);
                            if (data) setProducts(data);
                          } else {
                            toast.error(result.error || '複製に失敗しました');
                          }
                        })}
                      >
                        <Copy className="mr-2 h-4 w-4" /> 複製
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {product.status !== 'published' && (
                        <DropdownMenuItem onClick={() => handleStatusUpdate(product.id, 'published')}>
                          <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" /> 公開する
                        </DropdownMenuItem>
                      )}
                      {product.status === 'published' && (
                        <DropdownMenuItem onClick={() => handleStatusUpdate(product.id, 'draft')}>
                          <FileEdit className="mr-2 h-4 w-4" /> 下書きに戻す
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleStatusUpdate(product.id, 'archived')}>
                        <Archive className="mr-2 h-4 w-4" /> アーカイブ
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => { setProductToDelete(product); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> 削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ダイアログ類 ── */}
      <ProductImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        organizationId={organizationId}
        onImportComplete={async () => {
          const [p, c] = await Promise.all([getProducts(organizationId), getCategories(organizationId)]);
          if (p.data) setProducts(p.data);
          if (c.data) setCategories(c.data);
          toast.success('インポートが完了しました');
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>商品を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{productToDelete?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />削除中...</> : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

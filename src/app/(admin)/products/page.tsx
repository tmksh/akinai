'use client';

import { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  Filter,
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { ProductStatus } from '@/types';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];

const productTabs = [
  { label: '商品一覧', href: '/products', exact: true },
  { label: '在庫', href: '/products/inventory' },
  { label: '入出庫履歴', href: '/products/movements' },
  { label: 'カテゴリー', href: '/products/categories' },
];

// ステータス設定
const statusConfig: Record<ProductStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: '下書き', variant: 'outline' },
  published: { label: '公開中', variant: 'default' },
  archived: { label: 'アーカイブ', variant: 'secondary' },
};

// 数値フォーマット
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(value);
};

export default function ProductsPage() {
  const { organization, isLoading: orgLoading } = useOrganization();
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 検索入力のデバウンス（300ms）
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  };
  
  // 削除ダイアログ
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductWithRelations | null>(null);

  // データを取得
  useEffect(() => {
    const fetchData = async () => {
      if (!organization?.id) return;
      
      setIsLoading(true);
      try {
        const [productsResult, categoriesResult] = await Promise.all([
          getProducts(organization.id),
          getCategories(organization.id),
        ]);

        if (productsResult.data) {
          setProducts(productsResult.data);
        }
        if (categoriesResult.data) {
          setCategories(categoriesResult.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [organization?.id]);

  // 商品の合計在庫を計算（純粋関数）
  const getTotalStock = (variants: ProductWithRelations['variants']) => {
    return variants.reduce((sum, v) => sum + v.stock, 0);
  };

  // 価格範囲を取得（純粋関数）
  const getPriceRange = (variants: ProductWithRelations['variants']) => {
    if (variants.length === 0) return '-';
    const prices = variants.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) {
      return formatCurrency(min);
    }
    return `${formatCurrency(min)} ~ ${formatCurrency(max)}`;
  };

  // フィルタリング（デバウンスされた検索値で再計算）
  const filteredProducts = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !searchLower ||
        product.name.toLowerCase().includes(searchLower) ||
        product.variants.some((v) =>
          v.sku.toLowerCase().includes(searchLower)
        );
      const matchesStatus =
        statusFilter === 'all' || product.status === statusFilter;
      const matchesCategory =
        categoryFilter === 'all' ||
        product.categories.some(c => c.id === categoryFilter);
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [products, debouncedSearch, statusFilter, categoryFilter]);

  // 削除処理
  const handleDelete = async () => {
    if (!productToDelete) return;

    startTransition(async () => {
      const result = await deleteProduct(productToDelete.id);
      if (result.success) {
        setProducts(products.filter(p => p.id !== productToDelete.id));
      } else {
        console.error('Failed to delete product:', result.error);
      }
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    });
  };

  // ステータス更新処理
  const handleStatusUpdate = async (productId: string, newStatus: 'draft' | 'published' | 'archived') => {
    startTransition(async () => {
      const result = await updateProductStatus(productId, newStatus);
      if (result.success) {
        setProducts(products.map(p => 
          p.id === productId 
            ? { ...p, status: newStatus, published_at: newStatus === 'published' ? new Date().toISOString() : p.published_at }
            : p
        ));
      } else {
        console.error('Failed to update product status:', result.error);
      }
    });
  };

  // 統計計算（メモ化で再計算を防ぐ）
  const stats = useMemo(() => ({
    total: products.length,
    published: products.filter(p => p.status === 'published').length,
    draft: products.filter(p => p.status === 'draft').length,
    outOfStock: products.filter(p => p.variants.reduce((sum, v) => sum + v.stock, 0) === 0).length,
  }), [products]);

  // ローディング表示
  if (orgLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">商品管理</h1>
          <p className="text-muted-foreground">
            商品の登録・編集・在庫管理を行います
          </p>
        </div>
        <Button asChild className="btn-premium">
          <Link href="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            商品を追加
          </Link>
        </Button>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={productTabs} />

      {/* 統計バー */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
          <Package className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs text-muted-foreground">全商品</span>
          <span className="text-sm font-semibold">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs text-emerald-700 dark:text-emerald-300">公開中</span>
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{stats.published}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
          <FileEdit className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs text-amber-700 dark:text-amber-300">下書き</span>
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">{stats.draft}</span>
        </div>
        {stats.outOfStock > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs text-red-700 dark:text-red-300">在庫切れ</span>
            <span className="text-sm font-semibold text-red-700 dark:text-red-300">{stats.outOfStock}</span>
          </div>
        )}
      </div>

      {/* フィルター・検索 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="商品名・SKUで検索..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="published">公開中</SelectItem>
              <SelectItem value="draft">下書き</SelectItem>
              <SelectItem value="archived">アーカイブ</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="カテゴリー" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべてのカテゴリー</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 商品カード一覧 */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {products.length === 0 ? (
            <>
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-3">商品がまだ登録されていません</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/products/new">
                  <Plus className="mr-2 h-4 w-4" />
                  最初の商品を登録
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Search className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">該当する商品がありません</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredProducts.map((product) => {
            const totalStock = getTotalStock(product.variants);
            const statusInfo = statusConfig[product.status];

            return (
              <Card key={product.id} className="group relative overflow-hidden transition-shadow hover:shadow-md">
                {/* 画像 */}
                <Link href={`/products/${product.id}`} className="block">
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {product.images[0] ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.name}
                        fill
                        sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
                        loading="lazy"
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Package className="h-8 w-8 opacity-40" />
                      </div>
                    )}
                    {/* ステータスバッジ */}
                    <div className="absolute top-1.5 left-1.5">
                      <Badge variant={statusInfo.variant} className="shadow-sm text-[10px] px-1.5 py-0">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    {/* 在庫切れ警告 */}
                    {totalStock === 0 && (
                      <div className="absolute top-1.5 right-1.5">
                        <Badge variant="destructive" className="shadow-sm text-[10px] px-1.5 py-0">在庫切れ</Badge>
                      </div>
                    )}
                  </div>
                </Link>

                {/* 情報 */}
                <CardContent className="p-2">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${product.id}`}
                        className="font-medium text-xs leading-tight line-clamp-2 hover:underline"
                      >
                        {product.name}
                      </Link>
                    </div>
                    {/* メニュー */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" disabled={isPending}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/products/${product.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            詳細を見る
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/products/${product.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            編集
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            startTransition(async () => {
                              const result = await duplicateProduct(product.id);
                              if (result.data) {
                                toast.success('商品を複製しました', { description: `${result.data.name} を作成しました` });
                                if (organization?.id) {
                                  const { data } = await getProducts(organization.id);
                                  if (data) setProducts(data);
                                }
                              } else {
                                toast.error(result.error || '複製に失敗しました');
                              }
                            });
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          複製
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {product.status !== 'published' && (
                          <DropdownMenuItem onClick={() => handleStatusUpdate(product.id, 'published')}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            公開する
                          </DropdownMenuItem>
                        )}
                        {product.status === 'published' && (
                          <DropdownMenuItem onClick={() => handleStatusUpdate(product.id, 'draft')}>
                            <FileEdit className="mr-2 h-4 w-4" />
                            下書きに戻す
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleStatusUpdate(product.id, 'archived')}>
                          <Archive className="mr-2 h-4 w-4" />
                          アーカイブ
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setProductToDelete(product);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* 価格・在庫 */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                      {getPriceRange(product.variants)}
                    </span>
                    <span className={`text-[10px] ${totalStock <= 10 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                      在庫 {totalStock}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>商品を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{productToDelete?.name}」を削除します。この操作は取り消せません。
              関連するバリエーション、画像も同時に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  削除中...
                </>
              ) : (
                '削除する'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

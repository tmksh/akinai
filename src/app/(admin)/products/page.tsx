'use client';

import { useState, useEffect, useTransition } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { getProducts, getCategories, deleteProduct, updateProductStatus, type ProductWithRelations } from '@/lib/actions/products';
import type { ProductStatus } from '@/types';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];

const productTabs = [
  { label: '商品一覧', href: '/products', exact: true },
  { label: '商品登録', href: '/products/new' },
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
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

  // フィルタリング
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.variants.some((v) =>
        v.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesStatus =
      statusFilter === 'all' || product.status === statusFilter;
    const matchesCategory =
      categoryFilter === 'all' ||
      product.categories.some(c => c.id === categoryFilter);
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // 商品の合計在庫を計算
  const getTotalStock = (variants: ProductWithRelations['variants']) => {
    return variants.reduce((sum, v) => sum + v.stock, 0);
  };

  // 価格範囲を取得
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

  // 統計計算
  const stats = {
    total: products.length,
    published: products.filter(p => p.status === 'published').length,
    draft: products.filter(p => p.status === 'draft').length,
    outOfStock: products.filter(p => getTotalStock(p.variants) === 0).length,
  };

  // ローディング表示
  if (orgLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
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

      {/* 統計カード - オレンジグラデーション */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 全商品 - 薄いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100/50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/40 border border-orange-100 dark:border-orange-800/30 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <Package className="h-4 w-4 text-orange-500" />
            </div>
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">全商品</span>
          </div>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{stats.total}</p>
        </div>
        
        {/* 公開中 - やや濃いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-100 via-orange-200/60 to-amber-100 dark:from-orange-900/50 dark:via-orange-800/40 dark:to-amber-900/50 border border-orange-200 dark:border-orange-700/40 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <CheckCircle className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-800 dark:text-orange-200">公開中</span>
          </div>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {stats.published}
          </p>
        </div>
        
        {/* 下書き - 濃いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-200 via-orange-300/70 to-amber-200 dark:from-orange-800/60 dark:via-orange-700/50 dark:to-amber-800/60 border border-orange-300 dark:border-orange-600/50 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70">
              <FileEdit className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-800 dark:text-orange-200">下書き</span>
          </div>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {stats.draft}
          </p>
        </div>
        
        {/* 在庫切れ - 最も濃いオレンジ */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 dark:from-orange-600 dark:via-orange-500 dark:to-amber-600 border border-orange-400 dark:border-orange-500 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/30">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-medium text-white/90">在庫切れ</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {stats.outOfStock}
          </p>
        </div>
      </div>

      {/* フィルター・検索 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="商品名・SKUで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">画像</TableHead>
                  <TableHead>商品名</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>価格</TableHead>
                  <TableHead className="text-right">在庫</TableHead>
                  <TableHead>カテゴリー</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {products.length === 0 ? (
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-8 w-8 text-muted-foreground" />
                          <p>商品がまだ登録されていません</p>
                          <Button asChild variant="outline" size="sm">
                            <Link href="/products/new">
                              <Plus className="mr-2 h-4 w-4" />
                              最初の商品を登録
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        '該当する商品がありません'
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="relative h-12 w-12 overflow-hidden rounded-md bg-muted">
                          {product.images[0] ? (
                            <Image
                              src={product.images[0].url}
                              alt={product.images[0].alt || product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Package className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Link
                            href={`/products/${product.id}`}
                            className="font-medium hover:underline"
                          >
                            {product.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {product.variants.length}バリエーション
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[product.status].variant}>
                          {statusConfig[product.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>{getPriceRange(product.variants)}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            getTotalStock(product.variants) <= 10
                              ? 'text-destructive font-medium'
                              : ''
                          }
                        >
                          {getTotalStock(product.variants)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {product.categories.map(c => c.name).join(', ') || '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isPending}>
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">メニュー</span>
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
                            <DropdownMenuItem>
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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

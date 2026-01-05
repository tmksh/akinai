'use client';

import { useState } from 'react';
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
import { mockProducts, mockCategories } from '@/lib/mock-data';
import { PageTabs } from '@/components/layout/page-tabs';
import type { ProductStatus } from '@/types';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // フィルタリング
  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.variants.some((v) =>
        v.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesStatus =
      statusFilter === 'all' || product.status === statusFilter;
    const matchesCategory =
      categoryFilter === 'all' ||
      product.categoryIds.includes(categoryFilter);
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // 商品の合計在庫を計算
  const getTotalStock = (variants: typeof mockProducts[0]['variants']) => {
    return variants.reduce((sum, v) => sum + v.stock, 0);
  };

  // 価格範囲を取得
  const getPriceRange = (variants: typeof mockProducts[0]['variants']) => {
    const prices = variants.map((v) => v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) {
      return formatCurrency(min);
    }
    return `${formatCurrency(min)} ~ ${formatCurrency(max)}`;
  };

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
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{mockProducts.length}</p>
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
            {mockProducts.filter((p) => p.status === 'published').length}
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
            {mockProducts.filter((p) => p.status === 'draft').length}
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
            {mockProducts.filter((p) => getTotalStock(p.variants) === 0).length}
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
                  {mockCategories.map((cat) => (
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
                      該当する商品がありません
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
                              alt={product.images[0].alt}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              No img
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
                        {product.categoryIds
                          .map(
                            (catId) =>
                              mockCategories.find((c) => c.id === catId)?.name
                          )
                          .filter(Boolean)
                          .join(', ') || '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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
                            <DropdownMenuItem>
                              <Archive className="mr-2 h-4 w-4" />
                              アーカイブ
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
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
    </div>
  );
}


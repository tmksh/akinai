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
import type { ProductStatus } from '@/types';

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
        <Button asChild className="gradient-brand text-white hover:opacity-90">
          <Link href="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            商品を追加
          </Link>
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="widget-card-purple border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/80">全商品</CardDescription>
            <CardTitle className="text-3xl font-bold text-white">{mockProducts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="widget-card-green border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/80">公開中</CardDescription>
            <CardTitle className="text-3xl font-bold text-white">
              {mockProducts.filter((p) => p.status === 'published').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="widget-card-blue border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/80">下書き</CardDescription>
            <CardTitle className="text-3xl font-bold text-white">
              {mockProducts.filter((p) => p.status === 'draft').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="widget-card-red border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/80">在庫切れ</CardDescription>
            <CardTitle className="text-3xl font-bold text-white">
              {mockProducts.filter((p) => getTotalStock(p.variants) === 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
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


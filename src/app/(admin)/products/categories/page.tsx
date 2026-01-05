'use client';

import { FolderTree, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { mockCategories, mockProducts } from '@/lib/mock-data';
import { PageTabs } from '@/components/layout/page-tabs';

const productTabs = [
  { label: '商品一覧', href: '/products', exact: true },
  { label: '商品登録', href: '/products/new' },
  { label: 'カテゴリー', href: '/products/categories' },
];

// カテゴリごとの商品数を計算
const getCategoryProductCount = (categoryId: string) => {
  return mockProducts.filter(p => p.categoryIds?.includes(categoryId)).length;
};

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">商品管理</h1>
          <p className="text-muted-foreground">
            商品カテゴリーの管理を行います
          </p>
        </div>
        <Button className="btn-premium">
          <Plus className="mr-2 h-4 w-4" />
          カテゴリーを追加
        </Button>
      </div>

      {/* タブナビゲーション */}
      <PageTabs tabs={productTabs} />

      {/* カテゴリー一覧 */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>カテゴリー一覧</CardTitle>
          <CardDescription>登録されているカテゴリーを管理します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {mockCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <FolderTree className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{category.name}</div>
                    <div className="text-sm text-muted-foreground">
                      スラッグ: {category.slug}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">{getCategoryProductCount(category.id)}</div>
                    <div className="text-sm text-muted-foreground">商品数</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




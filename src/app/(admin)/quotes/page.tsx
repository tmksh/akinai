'use client';

import { FileQuestion, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function QuotesPage() {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">見積管理</h1>
          <p className="text-muted-foreground">
            見積書の作成・管理を行います
          </p>
        </div>
        <Button className="gradient-brand text-white">
          <Plus className="mr-2 h-4 w-4" />
          見積を作成
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総見積数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">承認待ち</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">8</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">承認済み</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">12</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今月の総額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥1,850,000</div>
          </CardContent>
        </Card>
      </div>

      {/* 検索・フィルター */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>見積一覧</CardTitle>
          <CardDescription>作成した見積書を管理します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="見積番号・顧客名で検索..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              フィルター
            </Button>
          </div>

          {/* 空の状態 */}
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <FileQuestion className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">見積データがありません</h3>
            <p className="text-muted-foreground mb-4">
              最初の見積書を作成して、顧客への提案を始めましょう
            </p>
            <Button className="gradient-brand text-white">
              <Plus className="mr-2 h-4 w-4" />
              見積を作成
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


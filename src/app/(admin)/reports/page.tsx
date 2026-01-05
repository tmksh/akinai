'use client';

import { BarChart3, TrendingUp, TrendingDown, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">レポート</h1>
          <p className="text-muted-foreground">
            売上・在庫・顧客データの分析レポート
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="30days">
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="期間を選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">過去7日間</SelectItem>
              <SelectItem value="30days">過去30日間</SelectItem>
              <SelectItem value="90days">過去90日間</SelectItem>
              <SelectItem value="365days">過去1年間</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総売上</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥8,450,000</div>
            <div className="flex items-center gap-1 text-xs text-green-500">
              <TrendingUp className="h-3 w-3" />
              +15.2% 前月比
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">注文数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <div className="flex items-center gap-1 text-xs text-green-500">
              <TrendingUp className="h-3 w-3" />
              +8.5% 前月比
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均注文額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥24,700</div>
            <div className="flex items-center gap-1 text-xs text-green-500">
              <TrendingUp className="h-3 w-3" />
              +6.1% 前月比
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">コンバージョン率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2%</div>
            <div className="flex items-center gap-1 text-xs text-red-500">
              <TrendingDown className="h-3 w-3" />
              -0.3% 前月比
            </div>
          </CardContent>
        </Card>
      </div>

      {/* レポートセクション */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>売上推移</CardTitle>
            <CardDescription>月別の売上推移</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>グラフデータを読み込み中...</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>カテゴリ別売上</CardTitle>
            <CardDescription>商品カテゴリ別の売上内訳</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'アパレル', amount: 3200000, percentage: 38 },
                { name: 'アクセサリー', amount: 2100000, percentage: 25 },
                { name: 'ホームグッズ', amount: 1800000, percentage: 21 },
                { name: 'フード', amount: 1350000, percentage: 16 },
              ].map((category) => (
                <div key={category.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{category.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ¥{(category.amount / 10000).toFixed(0)}万 ({category.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>トップ商品</CardTitle>
            <CardDescription>売上上位の商品</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { rank: 1, name: 'オーガニックコットンTシャツ', sales: 156, amount: 777280 },
                { rank: 2, name: '手作り革財布', sales: 42, amount: 756000 },
                { rank: 3, name: '特選日本茶セット', sales: 89, amount: 533400 },
                { rank: 4, name: '陶器マグカップ', sales: 134, amount: 428800 },
                { rank: 5, name: 'リネンブラウス', sales: 28, amount: 358400 },
              ].map((product) => (
                <div key={product.rank} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-semibold text-sm">
                    {product.rank}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">{product.sales}件販売</div>
                  </div>
                  <div className="font-medium">¥{product.amount.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>顧客分析</CardTitle>
            <CardDescription>顧客の行動分析</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">新規顧客</span>
                  <span className="text-2xl font-bold">124</span>
                </div>
                <div className="text-xs text-muted-foreground">前月比 +18%</div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">リピーター</span>
                  <span className="text-2xl font-bold">218</span>
                </div>
                <div className="text-xs text-muted-foreground">前月比 +12%</div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">平均購入頻度</span>
                  <span className="text-2xl font-bold">2.3回</span>
                </div>
                <div className="text-xs text-muted-foreground">前月比 +0.2回</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}







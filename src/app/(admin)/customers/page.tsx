'use client';

import { Users, Plus, Search, Filter, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { mockCustomers } from '@/lib/mock-data';

export default function CustomersPage() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">顧客管理</h1>
          <p className="text-muted-foreground">
            顧客情報の管理・分析を行います
          </p>
        </div>
        <Button className="gradient-brand text-white">
          <Plus className="mr-2 h-4 w-4" />
          顧客を追加
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総顧客数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockCustomers.length}</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">新規顧客（今月）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">12</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">リピート率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均購入額</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥24,500</div>
          </CardContent>
        </Card>
      </div>

      {/* 顧客一覧 */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>顧客一覧</CardTitle>
          <CardDescription>登録されている顧客情報を管理します</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="顧客名・メールアドレスで検索..." className="pl-10" />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              フィルター
            </Button>
          </div>

          <div className="space-y-4">
            {mockCustomers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {customer.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{customer.name}</div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">注文数</div>
                    <div className="font-medium">{customer.totalOrders}件</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">総購入額</div>
                    <div className="font-medium">{formatCurrency(customer.totalSpent)}</div>
                  </div>
                  <Badge variant={customer.totalOrders >= 5 ? 'default' : 'secondary'}>
                    {customer.totalOrders >= 5 ? 'VIP' : '一般'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


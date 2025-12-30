'use client';

import { Users, Plus, Search, Filter, Mail, UserPlus, Repeat, DollarSign } from 'lucide-react';
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
    <div className="space-y-4 sm:space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">顧客管理</h1>
          <p className="text-sm text-slate-500 hidden sm:block">
            顧客情報の管理・分析を行います
          </p>
        </div>
        <Button className="btn-premium" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          顧客を追加
        </Button>
      </div>

      {/* 統計カード - オレンジグラデーション */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* 総顧客数 - 薄いオレンジ */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100/50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/40 border border-orange-100 dark:border-orange-800/30 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <Users className="h-4 w-4 text-orange-500" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-orange-700 dark:text-orange-300">総顧客数</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{mockCustomers.length}<span className="text-sm font-normal ml-1">人</span></p>
        </div>
        
        {/* 新規顧客 - やや濃いオレンジ */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-100 via-orange-200/60 to-amber-100 dark:from-orange-900/50 dark:via-orange-800/40 dark:to-amber-900/50 border border-orange-200 dark:border-orange-700/40 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <UserPlus className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-orange-800 dark:text-orange-200">新規顧客</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">12<span className="text-sm font-normal ml-1">今月</span></p>
        </div>
        
        {/* リピート率 - 濃いオレンジ */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-200 via-orange-300/70 to-amber-200 dark:from-orange-800/60 dark:via-orange-700/50 dark:to-amber-800/60 border border-orange-300 dark:border-orange-600/50 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70">
              <Repeat className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-orange-800 dark:text-orange-200">リピート率</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">68%</p>
        </div>
        
        {/* 平均購入額 - 最も濃いオレンジ */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 dark:from-orange-600 dark:via-orange-500 dark:to-amber-600 border border-orange-400 dark:border-orange-500 shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/30">
              <DollarSign className="h-4 w-4 text-white" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-white/90">平均購入額</span>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-white">¥24,500</p>
        </div>
      </div>

      {/* 顧客一覧 */}
      <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm font-medium text-slate-900 dark:text-slate-100">顧客一覧</CardTitle>
          <CardDescription className="text-xs hidden sm:block">登録されている顧客情報を管理します</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="顧客名・メールアドレスで検索..." className="pl-10 border-slate-200 dark:border-slate-700 text-sm" />
            </div>
            <Button variant="outline" className="border-slate-200 text-slate-600">
              <Filter className="mr-2 h-4 w-4" />
              フィルター
            </Button>
          </div>

          <div className="space-y-2">
            {mockCustomers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between p-3 sm:p-4 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-orange-100 text-orange-600 text-sm">
                      {customer.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{customer.name}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Mail className="h-3 w-3" />
                      {customer.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-slate-500">注文数</div>
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{customer.totalOrders}件</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">総購入額</div>
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{formatCurrency(customer.totalSpent)}</div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={customer.totalOrders >= 5 
                      ? 'bg-orange-50 text-orange-600 border-orange-200' 
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                    }
                  >
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

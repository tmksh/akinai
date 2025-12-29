'use client';

import { Users, Plus, Search, Filter, Mail, Phone, UserPlus, Repeat, DollarSign } from 'lucide-react';
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
          <h1 className="text-xl sm:text-2xl font-bold">顧客管理</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">
            顧客情報の管理・分析を行います
          </p>
        </div>
        <Button className="gradient-brand text-white" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          顧客を追加
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {/* 総顧客数 */}
        <div className="h-[100px] sm:h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 p-3 sm:p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
            <path d="M100,20 C70,35 85,60 70,100 L100,100 Z" fill="white" opacity="0.5"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-[10px] sm:text-xs font-medium">総顧客数</p>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-white">{mockCustomers.length}</div>
              <p className="text-white/70 text-[10px] sm:text-xs">人</p>
            </div>
          </div>
        </div>

        {/* 新規顧客 */}
        <div className="h-[100px] sm:h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-500 p-3 sm:p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
            <path d="M100,20 C70,35 85,60 70,100 L100,100 Z" fill="white" opacity="0.5"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-[10px] sm:text-xs font-medium">新規顧客</p>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-white">12</div>
              <p className="text-white/70 text-[10px] sm:text-xs">今月</p>
            </div>
          </div>
        </div>

        {/* リピート率 */}
        <div className="h-[100px] sm:h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-500 p-3 sm:p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
            <path d="M100,20 C70,35 85,60 70,100 L100,100 Z" fill="white" opacity="0.5"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Repeat className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-[10px] sm:text-xs font-medium">リピート率</p>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-white">68%</div>
              <p className="text-white/70 text-[10px] sm:text-xs">継続率</p>
            </div>
          </div>
        </div>

        {/* 平均購入額 */}
        <div className="h-[100px] sm:h-[120px] rounded-xl relative overflow-hidden bg-gradient-to-br from-violet-500 via-purple-500 to-purple-600 p-3 sm:p-4 shadow-lg">
          <svg className="absolute right-0 bottom-0 h-full w-1/2 opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M100,0 C60,20 80,50 60,100 L100,100 Z" fill="white"/>
            <path d="M100,20 C70,35 85,60 70,100 L100,100 Z" fill="white" opacity="0.5"/>
          </svg>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center justify-between">
              <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
              </div>
              <p className="text-white/80 text-[10px] sm:text-xs font-medium">平均購入額</p>
            </div>
            <div>
              <div className="text-lg sm:text-2xl font-bold text-white">¥24,500</div>
              <p className="text-white/70 text-[10px] sm:text-xs hidden sm:block">1顧客あたり</p>
            </div>
          </div>
        </div>
      </div>

      {/* 顧客一覧 */}
      <Card className="card-hover">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">顧客一覧</CardTitle>
          <CardDescription className="text-xs sm:text-sm hidden sm:block">登録されている顧客情報を管理します</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
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




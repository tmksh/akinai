'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Users, Plus, Search, Filter, Mail, UserPlus, Repeat, DollarSign, Phone, MapPin, Calendar, ShoppingBag, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOrganization } from '@/components/providers/organization-provider';
import { getCustomers, getCustomerStats, type CustomerWithAddresses, type CustomerStats } from '@/lib/actions/customers';

export default function CustomersPage() {
  const { organization } = useOrganization();
  const [customers, setCustomers] = useState<CustomerWithAddresses[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithAddresses | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // データ取得
  const fetchData = useCallback(async () => {
    if (!organization) return;
    
    setIsLoading(true);
    try {
      const [customersResult, statsResult] = await Promise.all([
        getCustomers(organization.id),
        getCustomerStats(organization.id),
      ]);
      
      if (customersResult.data) {
        setCustomers(customersResult.data);
      }
      if (statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 検索フィルター
  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      (customer.company?.toLowerCase() || '').includes(query)
    );
  });

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
        <Button className="btn-premium" size="sm" asChild>
          <Link href="/customers/new">
            <Plus className="mr-2 h-4 w-4" />
            顧客を追加
          </Link>
        </Button>
      </div>

            {/* 統計カード - オレンジグラデーション */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* 総顧客数 - 薄いオレンジ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100/50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/40 border border-orange-100 dark:border-orange-800/30 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
                    <Users className="h-4 w-4 text-orange-500" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-orange-700 dark:text-orange-300">総顧客数</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{stats?.totalCustomers || customers.length}<span className="text-sm font-normal ml-1">人</span></p>
              </div>
              
              {/* 新規顧客 - やや濃いオレンジ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-100 via-orange-200/60 to-amber-100 dark:from-orange-900/50 dark:via-orange-800/40 dark:to-amber-900/50 border border-orange-200 dark:border-orange-700/40 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
                    <UserPlus className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-orange-800 dark:text-orange-200">新規顧客</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{stats?.newCustomersThisMonth || 0}<span className="text-sm font-normal ml-1">今月</span></p>
              </div>
              
              {/* リピート率 - 濃いオレンジ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-200 via-orange-300/70 to-amber-200 dark:from-orange-800/60 dark:via-orange-700/50 dark:to-amber-800/60 border border-orange-300 dark:border-orange-600/50 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70">
                    <Repeat className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-orange-800 dark:text-orange-200">リピート率</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">{stats?.repeatRate || 0}%</p>
              </div>
              
              {/* 平均購入額 - 最も濃いオレンジ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 dark:from-orange-600 dark:via-orange-500 dark:to-amber-600 border border-orange-400 dark:border-orange-500 shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/30">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-white/90">平均購入額</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-white">{formatCurrency(stats?.averageOrderValue || 0)}</p>
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
              <Input
                placeholder="顧客名・メールアドレスで検索..."
                className="pl-10 border-slate-200 dark:border-slate-700 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="border-slate-200 text-slate-600">
              <Filter className="mr-2 h-4 w-4" />
              フィルター
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? '該当する顧客がありません' : '顧客がまだ登録されていません'}
              </p>
              {!searchQuery && (
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/customers/new">
                    <Plus className="mr-2 h-4 w-4" />
                    顧客を追加
                  </Link>
                </Button>
              )}
            </div>
          ) : (
          <div className="space-y-2">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className="flex items-center justify-between p-3 sm:p-4 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
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
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{customer.total_orders}件</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">総購入額</div>
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{formatCurrency(customer.total_spent)}</div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={customer.total_orders >= 5 
                      ? 'bg-orange-50 text-orange-600 border-orange-200' 
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                    }
                  >
                    {customer.total_orders >= 5 ? 'VIP' : '一般'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      {/* 顧客詳細ダイアログ */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-orange-100 text-orange-600 text-lg">
                  {selectedCustomer?.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg font-bold">{selectedCustomer?.name}</div>
                <Badge 
                  variant="outline" 
                  className={(selectedCustomer?.total_orders ?? 0) >= 5 
                    ? 'bg-orange-50 text-orange-600 border-orange-200' 
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                  }
                >
                  {(selectedCustomer?.total_orders ?? 0) >= 5 ? 'VIP会員' : '一般会員'}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-6">
              {/* 連絡先情報 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-500">連絡先情報</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{selectedCustomer.email}</span>
                  </div>
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                  )}
                  {selectedCustomer.addresses && selectedCustomer.addresses[0] && (
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                      <span>
                        〒{selectedCustomer.addresses[0].postal_code}<br />
                        {selectedCustomer.addresses[0].prefecture}{selectedCustomer.addresses[0].city}{selectedCustomer.addresses[0].line1}
                        {selectedCustomer.addresses[0].line2 && ` ${selectedCustomer.addresses[0].line2}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 購入統計 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-center">
                  <ShoppingBag className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-orange-900 dark:text-orange-100">{selectedCustomer.total_orders}</div>
                  <div className="text-xs text-orange-600">注文数</div>
                </div>
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-center">
                  <DollarSign className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-orange-900 dark:text-orange-100">{formatCurrency(selectedCustomer.total_spent)}</div>
                  <div className="text-xs text-orange-600">総購入額</div>
                </div>
                <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-center">
                  <Calendar className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-orange-900 dark:text-orange-100">
                    {new Date(selectedCustomer.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs text-orange-600">登録日</div>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="flex gap-2">
                <Button asChild className="flex-1 btn-premium">
                  <Link href={`/customers/${selectedCustomer.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    詳細を見る
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a href={`mailto:${selectedCustomer.email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    メールを送る
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

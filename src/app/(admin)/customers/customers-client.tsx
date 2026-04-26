'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Search, Mail, UserPlus, Repeat, DollarSign, Phone, MapPin, Calendar, ShoppingBag, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CustomerWithAddresses, CustomerStats } from '@/lib/actions/customers';
import { DEFAULT_CUSTOMER_ROLE_LABELS, type CustomerRoleLabels } from '@/lib/customer-roles';

interface CustomersClientProps {
  initialCustomers: CustomerWithAddresses[];
  initialStats: CustomerStats | null;
  initialRoleLabels?: CustomerRoleLabels;
}

export default function CustomersClient({
  initialCustomers,
  initialStats,
  initialRoleLabels,
}: CustomersClientProps) {
  const [customers] = useState<CustomerWithAddresses[]>(initialCustomers);
  const [stats] = useState<CustomerStats | null>(initialStats);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithAddresses | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState<'all' | 'personal' | 'buyer' | 'supplier'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const roleLabels: CustomerRoleLabels = initialRoleLabels ?? { ...DEFAULT_CUSTOMER_ROLE_LABELS };

  const getCustomerRole = (customer: CustomerWithAddresses) =>
    (customer as unknown as { role?: string }).role;

  const searchFilteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      (customer.company?.toLowerCase() || '').includes(query)
    );
  });

  const filteredCustomers = searchFilteredCustomers.filter(customer => {
    if (activeRole !== 'all') {
      const role = getCustomerRole(customer);
      if (activeRole === 'personal' && role && role !== 'personal') return false;
      if (activeRole !== 'personal' && role !== activeRole) return false;
    }
    if (dateFrom) {
      const createdAt = new Date(customer.created_at);
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (createdAt < from) return false;
    }
    if (dateTo) {
      const createdAt = new Date(customer.created_at);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (createdAt > to) return false;
    }
    return true;
  });

  const hasDateFilter = dateFrom !== '' || dateTo !== '';
  const clearDateFilter = () => { setDateFrom(''); setDateTo(''); };

  const roleCounts = {
    all: searchFilteredCustomers.length,
    personal: searchFilteredCustomers.filter(c => { const r = getCustomerRole(c); return !r || r === 'personal'; }).length,
    buyer: searchFilteredCustomers.filter(c => getCustomerRole(c) === 'buyer').length,
    supplier: searchFilteredCustomers.filter(c => getCustomerRole(c) === 'supplier').length,
  };
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
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50 via-sky-100/50 to-sky-50 dark:from-sky-950/40 dark:via-sky-900/30 dark:to-sky-950/40 border border-sky-100 dark:border-sky-800/30 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
                    <Users className="h-4 w-4 text-sky-500" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-sky-700 dark:text-sky-300">総顧客数</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-sky-900 dark:text-sky-100">{stats?.totalCustomers || customers.length}<span className="text-sm font-normal ml-1">人</span></p>
              </div>

              {/* 新規顧客 - やや濃いオレンジ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-100 via-sky-200/60 to-sky-100 dark:from-sky-900/50 dark:via-sky-800/40 dark:to-sky-900/50 border border-sky-200 dark:border-sky-700/40 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
                    <UserPlus className="h-4 w-4 text-sky-600" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-sky-800 dark:text-sky-200">新規顧客</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-sky-900 dark:text-sky-100">{stats?.newCustomersThisMonth || 0}<span className="text-sm font-normal ml-1">今月</span></p>
              </div>

              {/* リピート率 - 濃いオレンジ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-200 via-sky-300/70 to-sky-200 dark:from-sky-800/60 dark:via-sky-700/50 dark:to-sky-800/60 border border-sky-300 dark:border-sky-600/50 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70">
                    <Repeat className="h-4 w-4 text-sky-600" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-sky-800 dark:text-sky-200">リピート率</span>
                </div>
                <p className="text-lg sm:text-2xl font-bold text-sky-900 dark:text-sky-100">{stats?.repeatRate || 0}%</p>
              </div>

              {/* 平均購入額 - 最も濃いオレンジ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-400 via-sky-500 to-sky-500 dark:from-sky-600 dark:via-sky-500 dark:to-sky-600 border border-sky-400 dark:border-sky-500 shadow-md hover:shadow-lg transition-all duration-300">
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-medium text-slate-900 dark:text-slate-100">顧客一覧</CardTitle>
              <CardDescription className="text-xs hidden sm:block">登録されている顧客情報を管理します</CardDescription>
            </div>
            <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as typeof activeRole)}>
              <TabsList className="h-8 bg-slate-100 dark:bg-slate-800 p-0.5">
                <TabsTrigger value="all" className="h-7 px-2.5 text-xs gap-1">
                  全て
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-medium">
                    {roleCounts.all}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="personal" className="h-7 px-2.5 text-xs gap-1">
                  {roleLabels.personal}
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-medium">
                    {roleCounts.personal}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="buyer" className="h-7 px-2.5 text-xs gap-1">
                  {roleLabels.buyer}
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-medium">
                    {roleCounts.buyer}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="supplier" className="h-7 px-2.5 text-xs gap-1">
                  {roleLabels.supplier}
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-medium">
                    {roleCounts.supplier}
                  </span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="space-y-3 mb-4 sm:mb-6">
            {/* 検索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="顧客名・メールアドレスで検索..."
                className="pl-10 border-slate-200 dark:border-slate-700 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* 登録日フィルター */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                登録日
              </div>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 w-auto text-xs border-slate-200 dark:border-slate-700 px-2"
              />
              <span className="text-xs text-slate-400">〜</span>
              <Input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 w-auto text-xs border-slate-200 dark:border-slate-700 px-2"
              />
              {hasDateFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearDateFilter}
                  className="h-8 px-2 text-xs text-slate-500 hover:text-slate-900"
                >
                  <X className="h-3 w-3 mr-1" />
                  クリア
                </Button>
              )}
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || activeRole !== 'all' || hasDateFilter ? '該当する顧客がありません' : '顧客がまだ登録されていません'}
              </p>
              {!searchQuery && activeRole === 'all' && !hasDateFilter && (
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
                    <AvatarFallback className="bg-sky-100 text-sky-600 text-sm">
                      {customer.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{customer.name}</div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Mail className="h-3 w-3" />
                        {customer.email}
                      </span>
                      {(customer as unknown as { role?: string }).role && (customer as unknown as { role?: string }).role !== 'personal' && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${
                          (customer as unknown as { role?: string }).role === 'buyer'
                            ? 'bg-orange-50 text-orange-600 border-orange-200'
                            : 'bg-green-50 text-green-600 border-green-200'
                        }`}>
                          {(customer as unknown as { role?: string }).role === 'buyer'
                            ? roleLabels.buyer
                            : roleLabels.supplier}
                        </Badge>
                      )}
                      {(customer as unknown as { status?: string }).status === 'pending' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-yellow-50 text-yellow-700 border-yellow-300">
                          審査中
                        </Badge>
                      )}
                      {(customer as unknown as { status?: string }).status === 'suspended' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-red-50 text-red-700 border-red-300">
                          停止中
                        </Badge>
                      )}
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
                      ? 'bg-sky-50 text-sky-600 border-sky-200'
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
                <AvatarFallback className="bg-sky-100 text-sky-600 text-lg">
                  {selectedCustomer?.name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg font-bold">{selectedCustomer?.name}</div>
                <Badge
                  variant="outline"
                  className={(selectedCustomer?.total_orders ?? 0) >= 5
                    ? 'bg-sky-50 text-sky-600 border-sky-200'
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

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-center">
                  <ShoppingBag className="h-5 w-5 text-sky-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-sky-900 dark:text-sky-100">{selectedCustomer.total_orders}</div>
                  <div className="text-xs text-sky-600">注文数</div>
                </div>
                <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-center">
                  <DollarSign className="h-5 w-5 text-sky-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-sky-900 dark:text-sky-100">{formatCurrency(selectedCustomer.total_spent)}</div>
                  <div className="text-xs text-sky-600">総購入額</div>
                </div>
                <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-center">
                  <Calendar className="h-5 w-5 text-sky-500 mx-auto mb-1" />
                  <div className="text-lg font-bold text-sky-900 dark:text-sky-100">
                    {new Date(selectedCustomer.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-xs text-sky-600">登録日</div>
                </div>
              </div>

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

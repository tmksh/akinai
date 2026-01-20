'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  DollarSign,
  Edit,
  Trash2,
  Package,
  TrendingUp,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { mockCustomers, mockOrders } from '@/lib/mock-data';

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const customer = mockCustomers.find((c) => c.id === id);
  const customerOrders = mockOrders.filter((o) => o.customerId === id).slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-lg text-slate-500 mb-4">顧客が見つかりませんでした</p>
        <Button asChild variant="outline">
          <Link href="/customers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            顧客一覧に戻る
          </Link>
        </Button>
      </div>
    );
  }

  const isVip = customer.totalOrders >= 5;
  const averageOrderValue = customer.totalOrders > 0 
    ? Math.round(customer.totalSpent / customer.totalOrders) 
    : 0;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-orange-100 text-orange-600 text-xl">
                {customer.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{customer.name}</h1>
                <Badge 
                  variant="outline" 
                  className={isVip 
                    ? 'bg-orange-50 text-orange-600 border-orange-200' 
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                  }
                >
                  {isVip ? 'VIP会員' : '一般会員'}
                </Badge>
              </div>
              <p className="text-sm text-slate-500">{formatDate(customer.createdAt)} から登録</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            編集
          </Button>
          <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="mr-2 h-4 w-4" />
            削除
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100/50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/40 border border-orange-100 dark:border-orange-800/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <ShoppingBag className="h-4 w-4 text-orange-500" />
            </div>
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">総注文数</span>
          </div>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{customer.totalOrders}<span className="text-sm font-normal ml-1">件</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-100 via-orange-200/60 to-amber-100 dark:from-orange-900/50 dark:via-orange-800/40 dark:to-amber-900/50 border border-orange-200 dark:border-orange-700/40">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60">
              <DollarSign className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-800 dark:text-orange-200">総購入額</span>
          </div>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{formatCurrency(customer.totalSpent)}</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-200 via-orange-300/70 to-amber-200 dark:from-orange-800/60 dark:via-orange-700/50 dark:to-amber-800/60 border border-orange-300 dark:border-orange-600/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70">
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-orange-800 dark:text-orange-200">平均注文額</span>
          </div>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{formatCurrency(averageOrderValue)}</p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 dark:from-orange-600 dark:via-orange-500 dark:to-amber-600 border border-orange-400 dark:border-orange-500">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/30">
              <Star className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-medium text-white/90">会員ランク</span>
          </div>
          <p className="text-2xl font-bold text-white">{isVip ? 'VIP' : '一般'}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 連絡先情報 */}
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="text-base">連絡先情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <Mail className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">メールアドレス</p>
                <p className="text-sm font-medium">{customer.email}</p>
              </div>
            </div>

            {customer.phone && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                  <Phone className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">電話番号</p>
                  <p className="text-sm font-medium">{customer.phone}</p>
                </div>
              </div>
            )}

            {customer.addresses && customer.addresses[0] && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                  <MapPin className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">住所</p>
                  <p className="text-sm font-medium">
                    〒{customer.addresses[0].postalCode}<br />
                    {customer.addresses[0].prefecture}{customer.addresses[0].city}{customer.addresses[0].line1}
                    {customer.addresses[0].line2 && ` ${customer.addresses[0].line2}`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <Calendar className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500">登録日</p>
                <p className="text-sm font-medium">{formatDate(customer.createdAt)}</p>
              </div>
            </div>

            <div className="pt-4">
              <Button className="w-full" variant="outline" asChild>
                <a href={`mailto:${customer.email}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  メールを送る
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 注文履歴 */}
        <Card className="border-0 shadow-sm bg-white dark:bg-slate-900 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">注文履歴</CardTitle>
              <CardDescription>最近の注文</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orders?customer=${customer.id}`}>
                すべて見る
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {customerOrders.length > 0 ? (
              <div className="space-y-3">
                {customerOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                        <Package className="h-4 w-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(order.total)}</p>
                      <Badge 
                        variant="outline" 
                        className={
                          order.status === 'delivered' 
                            ? 'bg-green-50 text-green-600 border-green-200' 
                            : order.status === 'shipped'
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-orange-50 text-orange-600 border-orange-200'
                        }
                      >
                        {order.status === 'delivered' ? '完了' : order.status === 'shipped' ? '発送済' : '処理中'}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>注文履歴がありません</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


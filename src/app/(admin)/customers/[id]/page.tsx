'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  CheckCircle,
  Info,
  Loader2,
  Sparkles,
  Code,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getCustomer, getCustomerOrders, approveCustomer, deleteCustomer } from '@/lib/actions/customers';
import {
  getCustomerRoleLabels,
} from '@/lib/actions/settings';
import { DEFAULT_CUSTOMER_ROLE_LABELS, type CustomerRoleLabels } from '@/lib/customer-roles';
import { useOrganization } from '@/components/providers/organization-provider';

type CustomerData = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  prefecture?: string | null;
  business_type?: string | null;
  custom_fields?: Array<{key: string; label: string; value: string; type: string}> | Record<string, unknown> | null;
  notes?: string | null;
  tags?: string[] | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
  addresses: { postal_code: string; prefecture: string; city: string; line1: string; line2?: string | null }[];
};

type OrderData = { id: string; orderNumber: string; total: number; status: string; createdAt: string };

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: '審査中',  color: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  active:    { label: '有効',    color: 'bg-green-50 text-green-700 border-green-300' },
  suspended: { label: '停止中', color: 'bg-red-50 text-red-700 border-red-300' },
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { organization } = useOrganization();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [customerOrders, setCustomerOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [roleLabels, setRoleLabels] = useState<CustomerRoleLabels>({ ...DEFAULT_CUSTOMER_ROLE_LABELS });
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all([getCustomer(id), getCustomerOrders(id)]).then(([custRes, ordersRes]) => {
      if (cancelled) return;
      setLoading(false);
      if (custRes.data) setCustomer(custRes.data as unknown as CustomerData);
      else setCustomer(null);
      if (ordersRes.data) setCustomerOrders(ordersRes.data.slice(0, 5));
      else setCustomerOrders([]);
    });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!organization?.id) return;
    getCustomerRoleLabels(organization.id).then(({ data }) => setRoleLabels(data));
  }, [organization?.id]);

  const handleApprove = () => {
    startTransition(async () => {
      const { error } = await approveCustomer(id);
      if (error) { toast.error(error); return; }
      toast.success('顧客を承認しました');
      setCustomer((prev) => prev ? { ...prev, status: 'active' } : prev);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const { error } = await deleteCustomer(id);
      if (error) { toast.error('削除に失敗しました: ' + error); return; }
      toast.success('顧客を削除しました');
      router.push('/customers');
    });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-lg text-slate-500 mb-4">顧客が見つかりませんでした</p>
        <Button asChild variant="outline">
          <Link href="/customers"><ArrowLeft className="mr-2 h-4 w-4" />顧客一覧に戻る</Link>
        </Button>
      </div>
    );
  }

  const isVip = customer.total_orders >= 5;
  const averageOrderValue = customer.total_orders > 0 ? Math.round(customer.total_spent / customer.total_orders) : 0;
  const role = customer.role || 'personal';
  const status = customer.status || 'active';
  const roleLabel = roleLabels[role as keyof CustomerRoleLabels] ?? role;
  const roleColor = role === 'buyer' ? 'bg-orange-50 text-orange-600 border-orange-200'
    : role === 'supplier' ? 'bg-green-50 text-green-600 border-green-200'
    : 'bg-slate-50 text-slate-600 border-slate-200';
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  const metadata = customer.metadata ?? {};

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/customers"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-sky-100 text-sky-600 text-xl">
                {customer.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <Badge variant="outline" className={roleColor}>{roleLabel}</Badge>
                <Badge variant="outline" className={statusConfig.color}>{statusConfig.label}</Badge>
                {isVip && <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-200">VIP会員</Badge>}
              </div>
              {customer.company && <p className="text-sm text-muted-foreground">{customer.company}</p>}
              <p className="text-sm text-slate-500">{formatDate(customer.created_at)} から登録</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* 審査中 → 承認ボタン */}
          {status === 'pending' && (
            <Button onClick={handleApprove} disabled={isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              承認する
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/customers/${id}/edit`}><Edit className="mr-2 h-4 w-4" />編集</Link>
          </Button>
          <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteConfirm(true)} disabled={isPending}>
            <Trash2 className="mr-2 h-4 w-4" />削除
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-50 via-sky-100/50 to-sky-50 dark:from-sky-950/40 dark:to-sky-950/40 border border-sky-100 dark:border-sky-800/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60"><ShoppingBag className="h-4 w-4 text-sky-500" /></div>
            <span className="text-xs font-medium text-sky-700 dark:text-sky-300">総注文数</span>
          </div>
          <p className="text-2xl font-bold text-sky-900 dark:text-sky-100">{customer.total_orders}<span className="text-sm font-normal ml-1">件</span></p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-100 via-sky-200/60 to-sky-100 dark:from-sky-900/50 dark:to-sky-900/50 border border-sky-200 dark:border-sky-700/40">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-800/60"><DollarSign className="h-4 w-4 text-sky-600" /></div>
            <span className="text-xs font-medium text-sky-800 dark:text-sky-200">総購入額</span>
          </div>
          <p className="text-2xl font-bold text-sky-900 dark:text-sky-100">{formatCurrency(customer.total_spent)}</p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-200 via-sky-300/70 to-sky-200 dark:from-sky-800/60 dark:to-sky-800/60 border border-sky-300 dark:border-sky-600/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/70 dark:bg-slate-800/70"><TrendingUp className="h-4 w-4 text-sky-600" /></div>
            <span className="text-xs font-medium text-sky-800 dark:text-sky-200">平均注文額</span>
          </div>
          <p className="text-2xl font-bold text-sky-900 dark:text-sky-100">{formatCurrency(averageOrderValue)}</p>
        </div>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-400 via-sky-500 to-sky-500 border border-sky-400">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/30"><Star className="h-4 w-4 text-white" /></div>
            <span className="text-xs font-medium text-white/90">会員ランク</span>
          </div>
          <p className="text-2xl font-bold text-white">{isVip ? 'VIP' : '一般'}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 連絡先 + 種別情報 */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">連絡先情報</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/30"><Mail className="h-4 w-4 text-sky-500" /></div>
                <div><p className="text-xs text-slate-500">メールアドレス</p><p className="text-sm font-medium">{customer.email}</p></div>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/30"><Phone className="h-4 w-4 text-sky-500" /></div>
                  <div><p className="text-xs text-slate-500">電話番号</p><p className="text-sm font-medium">{customer.phone}</p></div>
                </div>
              )}
              {customer.addresses?.[0] && (
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/30"><MapPin className="h-4 w-4 text-sky-500" /></div>
                  <div>
                    <p className="text-xs text-slate-500">住所</p>
                    <p className="text-sm font-medium">
                      〒{customer.addresses[0].postal_code}<br />
                      {customer.addresses[0].prefecture}{customer.addresses[0].city}{customer.addresses[0].line1}
                      {customer.addresses[0].line2 && ` ${customer.addresses[0].line2}`}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/30"><Calendar className="h-4 w-4 text-sky-500" /></div>
                <div><p className="text-xs text-slate-500">登録日</p><p className="text-sm font-medium">{formatDate(customer.created_at)}</p></div>
              </div>
              <div className="pt-2">
                <Button className="w-full" variant="outline" asChild>
                  <a href={`mailto:${customer.email}`}><Mail className="mr-2 h-4 w-4" />メールを送る</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 種別ごとの追加情報 */}
          {role !== 'personal' && Object.keys(metadata).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  {role === 'buyer' ? `${roleLabels.buyer}情報` : `${roleLabels.supplier}情報`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {role === 'buyer' && (
                  <>
                    {metadata.contactPerson && (
                      <div><p className="text-xs text-muted-foreground">担当者名</p><p className="font-medium">{String(metadata.contactPerson)}</p></div>
                    )}
                    {metadata.industry && (
                      <div><p className="text-xs text-muted-foreground">業種</p><p className="font-medium">{String(metadata.industry)}</p></div>
                    )}
                  </>
                )}
                {role === 'supplier' && (
                  <>
                    {metadata.representativeName && (
                      <div><p className="text-xs text-muted-foreground">代表者名</p><p className="font-medium">{String(metadata.representativeName)}</p></div>
                    )}
                    {metadata.prefecture && (
                      <div><p className="text-xs text-muted-foreground">産地（都道府県）</p><p className="font-medium">{String(metadata.prefecture)}</p></div>
                    )}
                    {Array.isArray(metadata.productCategories) && metadata.productCategories.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">主な商品カテゴリ</p>
                        <div className="flex flex-wrap gap-1">
                          {(metadata.productCategories as string[]).map((c) => (
                            <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* カスタムフィールド + 注文履歴 */}
        <div className="lg:col-span-2 space-y-6">
          {/* カスタムフィールド */}
          {Array.isArray(customer.custom_fields) && customer.custom_fields.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-sky-500" />
                    カスタムフィールド
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/customers/${id}/edit`}><Edit className="mr-1.5 h-3.5 w-3.5" />編集</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(customer.custom_fields as Array<{key: string; label: string; value: string; type: string}>).map((field) => (
                    <div key={field.key} className="flex items-start gap-2 rounded-lg border bg-muted/30 px-4 py-3">
                      <Code className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{field.label || field.key}</p>
                        <p className="text-sm font-medium break-all">{field.value || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 注文履歴 */}
          <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">注文履歴</CardTitle>
              <CardDescription>最近の注文</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/orders?customer=${customer.id}`}>すべて見る</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {customerOrders.length > 0 ? (
              <div className="space-y-3">
                {customerOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/30"><Package className="h-4 w-4 text-sky-500" /></div>
                      <div>
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-slate-500">{formatDate(order.createdAt ?? '')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(order.total)}</p>
                      <Badge variant="outline" className={
                        order.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-200'
                        : 'bg-sky-50 text-sky-600 border-sky-200'
                      }>
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

      {/* 削除確認ダイアログ */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>顧客を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{customer?.name}」を削除します。この操作は取り消せません。注文履歴などの関連データも削除される場合があります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

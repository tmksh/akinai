'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Mail,
  Phone,
  User,
  CreditCard,
  Calendar,
  FileText,
  MoreHorizontal,
  Loader2,
  Copy,
  ExternalLink,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { OrderStatus, PaymentStatus } from '@/types';
import {
  getOrder,
  updateOrderStatus,
  updatePaymentStatus,
  updateTrackingNumber,
  updateOrderNotes,
  shipOrder,
  confirmOrder,
  cancelOrder,
  refundOrder,
  type OrderWithItems,
} from '@/lib/actions/orders';

// ステータス設定
const orderStatusConfig: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  pending: { label: '未処理', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Clock },
  confirmed: { label: '確認済', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: CheckCircle },
  processing: { label: '処理中', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: Package },
  shipped: { label: '発送済', color: 'text-cyan-600', bgColor: 'bg-cyan-100', icon: Truck },
  delivered: { label: '配達完了', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle },
  cancelled: { label: 'キャンセル', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
  refunded: { label: '返金済', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: XCircle },
};

const paymentStatusConfig: Record<
  PaymentStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: { label: '未払い', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  paid: { label: '支払済', color: 'text-green-600', bgColor: 'bg-green-100' },
  failed: { label: '失敗', color: 'text-red-600', bgColor: 'bg-red-100' },
  refunded: { label: '返金済', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

const formatDate = (dateString: string) =>
  format(new Date(dateString), 'yyyy年M月d日 HH:mm', { locale: ja });

// 配送先住所の型
interface ShippingAddress {
  postalCode?: string;
  prefecture?: string;
  city?: string;
  line1?: string;
  line2?: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // 編集状態
  const [editingTracking, setEditingTracking] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  
  // ダイアログ
  const [showShipDialog, setShowShipDialog] = useState(false);
  const [shipTrackingNumber, setShipTrackingNumber] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);

  // データ取得
  useEffect(() => {
    async function fetchOrder() {
      setIsLoading(true);
      const { data, error } = await getOrder(orderId);
      if (error) {
        console.error('Failed to fetch order:', error);
      } else {
        setOrder(data);
        setTrackingNumber(data?.tracking_number || '');
        setNotes(data?.notes || '');
      }
      setIsLoading(false);
    }

    fetchOrder();
  }, [orderId]);

  // アクション: 確認
  const handleConfirm = async () => {
    setIsUpdating(true);
    const { data, error } = await confirmOrder(orderId);
    if (error) {
      alert('確認処理に失敗しました: ' + error);
    } else if (data) {
      setOrder({ ...order!, ...data });
    }
    setIsUpdating(false);
  };

  // アクション: 発送
  const handleShip = async () => {
    setIsUpdating(true);
    const { data, error } = await shipOrder(orderId, shipTrackingNumber);
    if (error) {
      alert('発送処理に失敗しました: ' + error);
    } else if (data) {
      setOrder({ ...order!, ...data });
      setTrackingNumber(data.tracking_number || '');
    }
    setShowShipDialog(false);
    setShipTrackingNumber('');
    setIsUpdating(false);
  };

  // アクション: キャンセル
  const handleCancel = async () => {
    setIsUpdating(true);
    const { error } = await cancelOrder(orderId);
    if (error) {
      alert('キャンセルに失敗しました: ' + error);
    } else {
      setOrder({ ...order!, status: 'cancelled' });
    }
    setShowCancelDialog(false);
    setIsUpdating(false);
  };

  // アクション: 返金
  const handleRefund = async () => {
    setIsUpdating(true);
    const { data, error } = await refundOrder(orderId);
    if (error) {
      alert('返金処理に失敗しました: ' + error);
    } else if (data) {
      setOrder({ ...order!, ...data });
    }
    setShowRefundDialog(false);
    setIsUpdating(false);
  };

  // 追跡番号を保存
  const handleSaveTracking = async () => {
    setIsUpdating(true);
    const { data, error } = await updateTrackingNumber(orderId, trackingNumber);
    if (error) {
      alert('追跡番号の保存に失敗しました: ' + error);
    } else if (data) {
      setOrder({ ...order!, ...data });
    }
    setEditingTracking(false);
    setIsUpdating(false);
  };

  // メモを保存
  const handleSaveNotes = async () => {
    setIsUpdating(true);
    const { data, error } = await updateOrderNotes(orderId, notes);
    if (error) {
      alert('メモの保存に失敗しました: ' + error);
    } else if (data) {
      setOrder({ ...order!, ...data });
    }
    setEditingNotes(false);
    setIsUpdating(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">注文が見つかりませんでした</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            注文一覧に戻る
          </Link>
        </Button>
      </div>
    );
  }

  const statusConfig = orderStatusConfig[order.status];
  const StatusIcon = statusConfig.icon;
  const paymentConfig = paymentStatusConfig[order.payment_status];
  const shippingAddress = order.shipping_address as ShippingAddress;

  // 次のアクションボタンを決定
  const getNextActions = () => {
    switch (order.status) {
      case 'pending':
        return (
          <>
            <Button onClick={handleConfirm} disabled={isUpdating}>
              <CheckCircle className="mr-2 h-4 w-4" />
              注文を確認
            </Button>
            <Button variant="outline" onClick={() => setShowCancelDialog(true)} disabled={isUpdating}>
              <XCircle className="mr-2 h-4 w-4" />
              キャンセル
            </Button>
          </>
        );
      case 'confirmed':
        return (
          <>
            <Button onClick={() => setShowShipDialog(true)} disabled={isUpdating}>
              <Truck className="mr-2 h-4 w-4" />
              発送する
            </Button>
            <Button variant="outline" onClick={() => setShowCancelDialog(true)} disabled={isUpdating}>
              <XCircle className="mr-2 h-4 w-4" />
              キャンセル
            </Button>
          </>
        );
      case 'processing':
        return (
          <Button onClick={() => setShowShipDialog(true)} disabled={isUpdating}>
            <Truck className="mr-2 h-4 w-4" />
            発送する
          </Button>
        );
      case 'shipped':
        return (
          <Button onClick={async () => {
            setIsUpdating(true);
            const { data, error } = await updateOrderStatus(orderId, 'delivered');
            if (!error && data) setOrder({ ...order!, ...data });
            setIsUpdating(false);
          }} disabled={isUpdating}>
            <CheckCircle className="mr-2 h-4 w-4" />
            配達完了にする
          </Button>
        );
      case 'delivered':
        if (order.payment_status === 'paid') {
          return (
            <Button variant="outline" onClick={() => setShowRefundDialog(true)} disabled={isUpdating}>
              返金処理
            </Button>
          );
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold">{order.order_number}</h1>
              <Badge className={cn("gap-1", statusConfig.bgColor, statusConfig.color, "border-0")}>
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
              <Badge className={cn(paymentConfig.bgColor, paymentConfig.color, "border-0")}>
                {paymentConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(order.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getNextActions()}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                納品書を印刷
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" />
                請求書を印刷
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowCancelDialog(true)}
                disabled={['cancelled', 'refunded', 'delivered'].includes(order.status)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                注文をキャンセル
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* メイン情報 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 注文明細 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                注文内容
              </CardTitle>
              <CardDescription>{order.items.length}点の商品</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead className="text-right">単価</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">小計</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">{item.variant_name}</p>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right">小計</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.subtotal)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right">送料</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.shipping_cost)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right">消費税</TableCell>
                    <TableCell className="text-right">{formatCurrency(order.tax)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="text-right font-bold">合計</TableCell>
                    <TableCell className="text-right font-bold text-lg">{formatCurrency(order.total)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* 配送情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-500" />
                配送情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">配送先</Label>
                  <div className="mt-1 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="text-sm">
                        {shippingAddress?.postalCode && <p>〒{shippingAddress.postalCode}</p>}
                        <p>{shippingAddress?.prefecture}{shippingAddress?.city}</p>
                        <p>{shippingAddress?.line1}</p>
                        {shippingAddress?.line2 && <p>{shippingAddress.line2}</p>}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">追跡番号</Label>
                    {!editingTracking && (
                      <Button variant="ghost" size="sm" onClick={() => setEditingTracking(true)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-1">
                    {editingTracking ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="追跡番号を入力"
                        />
                        <Button size="sm" onClick={handleSaveTracking} disabled={isUpdating}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingTracking(false);
                            setTrackingNumber(order.tracking_number || '');
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-muted/50">
                        {order.tracking_number ? (
                          <div className="flex items-center justify-between">
                            <span className="font-mono">{order.tracking_number}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(order.tracking_number || '')}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">未設定</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* タイムライン */}
              <div className="pt-4 border-t">
                <Label className="text-muted-foreground">配送状況</Label>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      order.created_at ? "bg-green-100" : "bg-muted"
                    )}>
                      <Calendar className={cn("h-4 w-4", order.created_at ? "text-green-600" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">注文受付</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  {order.shipped_at && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                        <Truck className="h-4 w-4 text-cyan-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">発送完了</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.shipped_at)}</p>
                      </div>
                    </div>
                  )}
                  {order.delivered_at && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">配達完了</p>
                        <p className="text-xs text-muted-foreground">{formatDate(order.delivered_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 顧客情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-500" />
                顧客情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">{order.customer_name}</p>
                {order.customer_id && (
                  <Link
                    href={`/customers/${order.customer_id}`}
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    顧客詳細を見る
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{order.customer_email}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 支払い情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-orange-500" />
                支払い情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ステータス</span>
                <Badge className={cn(paymentConfig.bgColor, paymentConfig.color, "border-0")}>
                  {paymentConfig.label}
                </Badge>
              </div>
              {order.payment_method && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">支払い方法</span>
                  <span className="font-medium">{order.payment_method}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">合計金額</span>
                <span className="font-bold text-lg">{formatCurrency(order.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* メモ */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-500" />
                  メモ
                </CardTitle>
                {!editingNotes && (
                  <Button variant="ghost" size="sm" onClick={() => setEditingNotes(true)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="メモを入力..."
                    rows={4}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingNotes(false);
                        setNotes(order.notes || '');
                      }}
                    >
                      キャンセル
                    </Button>
                    <Button size="sm" onClick={handleSaveNotes} disabled={isUpdating}>
                      保存
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {order.notes || 'メモはありません'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 発送ダイアログ */}
      <Dialog open={showShipDialog} onOpenChange={setShowShipDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>発送処理</DialogTitle>
            <DialogDescription>追跡番号を入力して発送を完了してください。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>追跡番号（任意）</Label>
              <Input
                value={shipTrackingNumber}
                onChange={(e) => setShipTrackingNumber(e.target.value)}
                placeholder="追跡番号を入力"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShipDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleShip} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
              発送完了にする
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* キャンセルダイアログ */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>注文のキャンセル</DialogTitle>
            <DialogDescription>この注文をキャンセルしますか？この操作は取り消せません。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              戻る
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              キャンセルする
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 返金ダイアログ */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>返金処理</DialogTitle>
            <DialogDescription>この注文を返金処理しますか？</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              返金額: <span className="font-bold text-foreground">{formatCurrency(order.total)}</span>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleRefund} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              返金を実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




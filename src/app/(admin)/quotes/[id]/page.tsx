'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  Download,
  Edit,
  FileText,
  Mail,
  MoreHorizontal,
  Phone,
  Printer,
  Send,
  ShoppingCart,
  Trash2,
  User,
  XCircle,
  MessageSquare,
  AlertCircle,
  History,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockQuotes, mockCustomers } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import type { QuoteStatus } from '@/types';

// ステータス設定
const statusConfig: Record<QuoteStatus, { label: string; color: string; icon: React.ElementType; bgColor: string }> = {
  draft: { label: '下書き', color: 'text-slate-600', icon: FileText, bgColor: 'bg-slate-100' },
  sent: { label: '送付済', color: 'text-blue-600', icon: Send, bgColor: 'bg-blue-100' },
  negotiating: { label: '交渉中', color: 'text-amber-600', icon: MessageSquare, bgColor: 'bg-amber-100' },
  accepted: { label: '承認済', color: 'text-emerald-600', icon: CheckCircle, bgColor: 'bg-emerald-100' },
  rejected: { label: '却下', color: 'text-red-600', icon: XCircle, bgColor: 'bg-red-100' },
  expired: { label: '期限切れ', color: 'text-gray-600', icon: AlertCircle, bgColor: 'bg-gray-100' },
  ordered: { label: '発注済', color: 'text-purple-600', icon: ShoppingCart, bgColor: 'bg-purple-100' },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

// タイムライン（モック）
const mockTimeline = [
  { id: 1, action: '見積作成', user: '管理者', date: '2024-01-10T10:00:00Z', note: '' },
  { id: 2, action: '顧客へ送付', user: '管理者', date: '2024-01-10T14:00:00Z', note: 'メールで送付' },
  { id: 3, action: '顧客からの返答', user: '山田 太郎', date: '2024-01-11T09:30:00Z', note: '数量について相談したい' },
];

export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const quote = mockQuotes.find((q) => q.id === id);
  const customer = mockCustomers.find((c) => c.id === quote?.customerId);

  if (!quote) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">見積が見つかりません</h2>
        <p className="text-muted-foreground mb-4">指定された見積は存在しないか、削除された可能性があります。</p>
        <Button asChild>
          <Link href="/quotes">見積一覧に戻る</Link>
        </Button>
      </div>
    );
  }

  const config = statusConfig[quote.status];
  const StatusIcon = config.icon;
  const isExpired = new Date(quote.validUntil) < new Date() && quote.status !== 'ordered';

  const handleStatusChange = (newStatus: QuoteStatus) => {
    console.log(`Status changed to: ${newStatus}`);
    // API呼び出し
  };

  const handleConvertToOrder = () => {
    console.log('Converting to order...');
    router.push(`/orders/new?quoteId=${quote.id}`);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/quotes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
              <Badge className={cn("gap-1", config.bgColor, config.color, "border-0")}>
                <StatusIcon className="h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              作成日: {formatDateTime(quote.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ステータスに応じたアクションボタン */}
          {quote.status === 'draft' && (
            <Button onClick={() => handleStatusChange('sent')}>
              <Send className="mr-2 h-4 w-4" />
              顧客へ送付
            </Button>
          )}
          {quote.status === 'sent' && (
            <Button onClick={() => handleStatusChange('negotiating')} variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              交渉開始
            </Button>
          )}
          {(quote.status === 'sent' || quote.status === 'negotiating') && (
            <>
              <Button onClick={() => handleStatusChange('accepted')} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="mr-2 h-4 w-4" />
                承認
              </Button>
              <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                    <XCircle className="mr-2 h-4 w-4" />
                    却下
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>見積を却下</DialogTitle>
                    <DialogDescription>
                      この見積を却下する理由を入力してください。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>却下理由</Label>
                      <Textarea
                        placeholder="例: 予算オーバー、仕様変更が必要..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                      キャンセル
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        handleStatusChange('rejected');
                        setShowRejectDialog(false);
                      }}
                    >
                      却下する
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
          {quote.status === 'accepted' && (
            <Button onClick={handleConvertToOrder} className="gradient-brand text-white">
              <ShoppingCart className="mr-2 h-4 w-4" />
              注文に変換
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                編集
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                複製
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Printer className="mr-2 h-4 w-4" />
                印刷
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                PDF出力
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {/* 見積明細 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                見積明細
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead className="text-right">単価</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">割引</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quote.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">{item.variantName}</p>
                          {item.notes && (
                            <p className="text-xs text-amber-600 mt-1">※ {item.notes}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {item.discount > 0 ? (
                          <Badge variant="secondary">{item.discount}%</Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4}>小計</TableCell>
                    <TableCell className="text-right">{formatCurrency(quote.subtotal)}</TableCell>
                  </TableRow>
                  {quote.discount > 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>割引</TableCell>
                      <TableCell className="text-right text-red-600">
                        -{formatCurrency(quote.discount)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={4}>消費税 (10%)</TableCell>
                    <TableCell className="text-right">{formatCurrency(quote.tax)}</TableCell>
                  </TableRow>
                  <TableRow className="text-lg font-bold">
                    <TableCell colSpan={4}>合計</TableCell>
                    <TableCell className="text-right text-primary">{formatCurrency(quote.total)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* 備考・条件 */}
          {(quote.notes || quote.terms) && (
            <Card>
              <CardHeader>
                <CardTitle>備考・条件</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quote.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">備考</h4>
                    <p className="text-sm">{quote.notes}</p>
                  </div>
                )}
                {quote.terms && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">取引条件</h4>
                    <p className="text-sm whitespace-pre-line">{quote.terms}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* タイムライン */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                履歴
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTimeline.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Clock className="h-4 w-4" />
                      </div>
                      {index < mockTimeline.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{event.action}</p>
                        <Badge variant="outline" className="text-xs">{event.user}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{formatDateTime(event.date)}</p>
                      {event.note && (
                        <p className="text-sm mt-1 text-amber-600">{event.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 有効期限 */}
          <Card className={cn(isExpired && "border-red-200 bg-red-50/50")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                有効期限
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-bold", isExpired && "text-red-600")}>
                {formatDate(quote.validUntil)}
              </p>
              {isExpired && (
                <p className="text-sm text-red-600 mt-1">有効期限が切れています</p>
              )}
            </CardContent>
          </Card>

          {/* 顧客情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                顧客情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-lg">{quote.customerCompany}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <User className="h-4 w-4" />
                  {quote.customerName}
                </div>
              </div>
              {customer && (
                <>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                        {customer.email}
                      </a>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${customer.phone}`} className="hover:underline">
                          {customer.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/customers/${quote.customerId}`}>
                  顧客詳細を見る
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* 発注済みの場合：注文リンク */}
          {quote.status === 'ordered' && quote.orderId && (
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-purple-600" />
                  関連注文
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/orders/${quote.orderId}`}>
                    注文詳細を見る
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


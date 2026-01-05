'use client';

import { Star, Download, Send, X, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface QuoteItem {
  id: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  notes: string;
}

interface Customer {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
}

interface QuotePreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteNumber: string;
  customer: Customer | null;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  validUntil: string;
  notes: string;
  terms: string;
  onSend: () => void;
  isSending: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

const formatDate = (date: Date) =>
  date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

export function QuotePreview({
  open,
  onOpenChange,
  quoteNumber,
  customer,
  items,
  subtotal,
  tax,
  total,
  validUntil,
  notes,
  terms,
  onSend,
  isSending,
}: QuotePreviewProps) {
  const today = new Date();
  
  const calculateItemTotal = (item: QuoteItem) => {
    const itemSubtotal = item.unitPrice * item.quantity;
    const discountAmount = itemSubtotal * (item.discount / 100);
    return itemSubtotal - discountAmount;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">見積書プレビュー</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Download className="mr-2 h-4 w-4" />
                印刷 / PDF保存
              </Button>
              <Button
                size="sm"
                className="btn-premium"
                onClick={onSend}
                disabled={isSending}
              >
                <Send className="mr-2 h-4 w-4" />
                {isSending ? '送付中...' : 'この内容で送付'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* プレビューエリア */}
        <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-slate-900">
          <div 
            className="quote-preview bg-white dark:bg-slate-950 shadow-xl mx-auto"
            style={{ 
              width: '210mm', 
              minHeight: '297mm', 
              padding: '20mm',
              fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif',
            }}
          >
            {/* ヘッダー */}
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2 tracking-tight">
                  見 積 書
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">QUOTATION</p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600">
                    <Star className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-lg text-orange-600">商い</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Akinai CMS</p>
              </div>
            </div>

            {/* 見積情報 */}
            <div className="flex justify-between mb-8">
              <div className="flex-1">
                <div className="border-b-2 border-slate-800 dark:border-slate-200 pb-2 mb-4">
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {customer?.company || customer?.name || '顧客未選択'}
                    <span className="text-base font-normal ml-2">御中</span>
                  </p>
                </div>
                {customer && (
                  <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                    {customer.company && <p>担当者: {customer.name} 様</p>}
                    {customer.email && <p>Email: {customer.email}</p>}
                    {customer.phone && <p>TEL: {customer.phone}</p>}
                  </div>
                )}
              </div>
              <div className="w-64 text-sm">
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-1 text-slate-500 dark:text-slate-400">見積番号</td>
                      <td className="py-1 text-right font-medium">{quoteNumber}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500 dark:text-slate-400">発行日</td>
                      <td className="py-1 text-right">{formatDate(today)}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500 dark:text-slate-400">有効期限</td>
                      <td className="py-1 text-right">{validUntil}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 合計金額（強調表示） */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-lg text-slate-700 dark:text-slate-300">ご請求金額（税込）</span>
                <span className="text-3xl font-bold text-orange-600">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* 明細テーブル */}
            <div className="mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-300 dark:border-slate-600">
                    <th className="py-2 text-left font-semibold text-slate-700 dark:text-slate-300">品名・仕様</th>
                    <th className="py-2 text-right font-semibold text-slate-700 dark:text-slate-300 w-24">単価</th>
                    <th className="py-2 text-right font-semibold text-slate-700 dark:text-slate-300 w-16">数量</th>
                    <th className="py-2 text-right font-semibold text-slate-700 dark:text-slate-300 w-16">割引</th>
                    <th className="py-2 text-right font-semibold text-slate-700 dark:text-slate-300 w-28">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.id} className={cn(
                      "border-b border-slate-200 dark:border-slate-700",
                      index % 2 === 0 ? "bg-slate-50/50 dark:bg-slate-800/30" : ""
                    )}>
                      <td className="py-3">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{item.productName}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-xs">{item.variantName}</p>
                          {item.notes && (
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">※ {item.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right text-slate-700 dark:text-slate-300">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 text-right text-slate-700 dark:text-slate-300">{item.quantity}</td>
                      <td className="py-3 text-right text-slate-500 dark:text-slate-400">
                        {item.discount > 0 ? `${item.discount}%` : '-'}
                      </td>
                      <td className="py-3 text-right font-medium text-slate-800 dark:text-slate-200">
                        {formatCurrency(calculateItemTotal(item))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="py-2 text-right text-slate-600 dark:text-slate-400">小計</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(subtotal)}</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="py-2 text-right text-slate-600 dark:text-slate-400">消費税（10%）</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(tax)}</td>
                  </tr>
                  <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                    <td colSpan={4} className="py-3 text-right text-lg font-semibold">合計（税込）</td>
                    <td className="py-3 text-right text-lg font-bold text-orange-600">{formatCurrency(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 備考・取引条件 */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {notes && (
                <div>
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-sm">備考</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 p-3 rounded">
                    {notes}
                  </p>
                </div>
              )}
              {terms && (
                <div>
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2 text-sm">取引条件</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap bg-slate-50 dark:bg-slate-800/50 p-3 rounded">
                    {terms}
                  </p>
                </div>
              )}
            </div>

            {/* 発行元情報 */}
            <Separator className="my-6" />
            <div className="flex justify-end">
              <div className="text-right text-sm">
                <div className="flex items-center justify-end gap-2 mb-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-orange-400 to-orange-600">
                    <Star className="h-3 w-3 text-white" />
                  </div>
                  <span className="font-bold text-orange-600">商い株式会社</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400">〒100-0001 東京都千代田区千代田1-1-1</p>
                <p className="text-slate-500 dark:text-slate-400">TEL: 03-1234-5678 / FAX: 03-1234-5679</p>
                <p className="text-slate-500 dark:text-slate-400">Email: info@akinai.example.com</p>
              </div>
            </div>
          </div>
        </div>

        {/* フッターアクション（モバイル用） */}
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-2 sm:hidden">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button
            size="sm"
            className="btn-premium"
            onClick={onSend}
            disabled={isSending}
          >
            <Send className="mr-2 h-4 w-4" />
            送付
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


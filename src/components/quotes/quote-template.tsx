'use client';

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

interface OrganizationInfo {
  name: string;
  address: string;
  phone: string;
  fax?: string;
  email: string;
}

interface QuoteTemplateProps {
  quoteNumber: string;
  customer: Customer | null;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  validUntil: string;
  notes: string;
  terms: string;
  organization?: OrganizationInfo;
  scale?: 'full' | 'preview';
  className?: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

const formatDate = (date: Date) =>
  date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

export function QuoteTemplate({
  quoteNumber,
  customer,
  items,
  subtotal,
  tax,
  total,
  validUntil,
  notes,
  terms,
  organization,
  scale = 'full',
  className,
}: QuoteTemplateProps) {
  const today = new Date();

  const calculateItemTotal = (item: QuoteItem) => {
    const itemSubtotal = item.unitPrice * item.quantity;
    const discountAmount = itemSubtotal * (item.discount / 100);
    return itemSubtotal - discountAmount;
  };

  // デフォルトの組織情報
  const org = organization || {
    name: '株式会社サンプル商事',
    address: '〒100-0001 東京都千代田区千代田1-1-1',
    phone: '03-1234-5678',
    fax: '03-1234-5679',
    email: 'info@sample.example.com',
  };

  const isPreview = scale === 'preview';

  return (
    <div
      className={cn(
        'quote-template bg-white',
        isPreview ? 'p-4 text-[10px]' : 'p-10',
        className
      )}
      style={{
        fontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
      }}
    >
      {/* タイトル */}
      <div className={cn('text-center', isPreview ? 'mb-4' : 'mb-8')}>
        <h1
          className={cn(
            'font-bold text-slate-900 tracking-[0.5em]',
            isPreview ? 'text-xl' : 'text-3xl'
          )}
        >
          見 積 書
        </h1>
      </div>

      {/* 宛先と発行情報 */}
      <div className={cn('flex justify-between', isPreview ? 'mb-4' : 'mb-8')}>
        {/* 宛先 */}
        <div className="flex-1">
          <div
            className={cn(
              'border-b-2 border-slate-900 inline-block',
              isPreview ? 'pb-1 pr-8 mb-2' : 'pb-2 pr-16 mb-3'
            )}
          >
            <p
              className={cn(
                'font-bold text-slate-900',
                isPreview ? 'text-sm' : 'text-xl'
              )}
            >
              {customer?.company || customer?.name || (
                <span className="text-slate-400">（宛先未選択）</span>
              )}
              {(customer?.company || customer?.name) && (
                <span className={cn('font-normal ml-2', isPreview ? 'text-xs' : 'text-base')}>様</span>
              )}
            </p>
          </div>
          {customer && (
            <div
              className={cn(
                'text-slate-600 space-y-0.5',
                isPreview ? 'text-[9px]' : 'text-sm'
              )}
            >
              {customer.company && customer.name && <p>{customer.name} 様</p>}
              {customer.address && <p>{customer.address}</p>}
            </div>
          )}
        </div>

        {/* 発行情報 */}
        <div className={cn(isPreview ? 'w-36' : 'w-56')}>
          <table className="w-full">
            <tbody className={isPreview ? 'text-[9px]' : 'text-sm'}>
              <tr>
                <td className="py-0.5 text-slate-600 pr-3">見積番号</td>
                <td className="py-0.5 text-right font-medium text-slate-900">{quoteNumber}</td>
              </tr>
              <tr>
                <td className="py-0.5 text-slate-600 pr-3">発行日</td>
                <td className="py-0.5 text-right text-slate-900">{formatDate(today)}</td>
              </tr>
              <tr>
                <td className="py-0.5 text-slate-600 pr-3">有効期限</td>
                <td className="py-0.5 text-right text-slate-900">{validUntil}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 合計金額 */}
      <div
        className={cn(
          'border-2 border-slate-900',
          isPreview ? 'p-3 mb-4' : 'p-4 mb-8'
        )}
      >
        <div className="flex justify-between items-center">
          <span
            className={cn('font-medium text-slate-700', isPreview ? 'text-xs' : 'text-base')}
          >
            合計金額（税込）
          </span>
          <span
            className={cn('font-bold text-slate-900', isPreview ? 'text-xl' : 'text-3xl')}
          >
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* 明細テーブル */}
      <div className={isPreview ? 'mb-4' : 'mb-8'}>
        {items.length === 0 ? (
          <div
            className={cn(
              'flex items-center justify-center border border-slate-300 text-slate-400',
              isPreview ? 'py-8 text-xs' : 'py-16 text-sm'
            )}
          >
            明細が追加されていません
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr
                className={cn(
                  'bg-slate-100 border-t-2 border-b border-slate-900',
                  isPreview ? 'text-[8px]' : 'text-sm'
                )}
              >
                <th className="py-2 px-2 text-left font-semibold text-slate-700">
                  品名
                </th>
                <th
                  className={cn(
                    'py-2 px-2 text-right font-semibold text-slate-700',
                    isPreview ? 'w-16' : 'w-24'
                  )}
                >
                  単価
                </th>
                <th
                  className={cn(
                    'py-2 px-2 text-center font-semibold text-slate-700',
                    isPreview ? 'w-10' : 'w-16'
                  )}
                >
                  数量
                </th>
                <th
                  className={cn(
                    'py-2 px-2 text-right font-semibold text-slate-700',
                    isPreview ? 'w-16' : 'w-28'
                  )}
                >
                  金額
                </th>
              </tr>
            </thead>
            <tbody className={isPreview ? 'text-[9px]' : 'text-sm'}>
              {items.map((item, index) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-200"
                >
                  <td className={cn('px-2', isPreview ? 'py-1.5' : 'py-2')}>
                    <div>
                      <p className="text-slate-900">{item.productName}</p>
                      <p
                        className={cn(
                          'text-slate-500',
                          isPreview ? 'text-[7px]' : 'text-xs'
                        )}
                      >
                        {item.variantName}
                      </p>
                      {item.discount > 0 && (
                        <p
                          className={cn(
                            'text-slate-500',
                            isPreview ? 'text-[7px]' : 'text-xs'
                          )}
                        >
                          （{item.discount}%割引適用）
                        </p>
                      )}
                      {item.notes && (
                        <p
                          className={cn(
                            'text-slate-400 mt-0.5',
                            isPreview ? 'text-[7px]' : 'text-xs'
                          )}
                        >
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-2 text-right text-slate-700">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-2 text-center text-slate-700">
                    {item.quantity}
                  </td>
                  <td className="px-2 text-right font-medium text-slate-900">
                    {formatCurrency(calculateItemTotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className={isPreview ? 'text-[9px]' : 'text-sm'}>
              <tr className="border-t border-slate-300">
                <td colSpan={3} className="py-1.5 px-2 text-right text-slate-600">
                  小計
                </td>
                <td className="py-1.5 px-2 text-right font-medium text-slate-900">
                  {formatCurrency(subtotal)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} className="py-1.5 px-2 text-right text-slate-600">
                  消費税（10%）
                </td>
                <td className="py-1.5 px-2 text-right font-medium text-slate-900">
                  {formatCurrency(tax)}
                </td>
              </tr>
              <tr className="border-t-2 border-slate-900 bg-slate-50">
                <td
                  colSpan={3}
                  className={cn(
                    'px-2 text-right font-semibold text-slate-900',
                    isPreview ? 'py-2 text-xs' : 'py-3 text-base'
                  )}
                >
                  合計（税込）
                </td>
                <td
                  className={cn(
                    'px-2 text-right font-bold text-slate-900',
                    isPreview ? 'py-2 text-sm' : 'py-3 text-lg'
                  )}
                >
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* 備考・取引条件 */}
      {(notes || terms) && (
        <div className={isPreview ? 'mb-4' : 'mb-8'}>
          {notes && (
            <div className={isPreview ? 'mb-3' : 'mb-4'}>
              <h3
                className={cn(
                  'font-semibold text-slate-700 border-b border-slate-300',
                  isPreview ? 'mb-1 pb-0.5 text-[9px]' : 'mb-2 pb-1 text-sm'
                )}
              >
                備考
              </h3>
              <p
                className={cn(
                  'text-slate-600 whitespace-pre-wrap',
                  isPreview ? 'text-[8px] leading-relaxed' : 'text-sm leading-relaxed'
                )}
              >
                {notes}
              </p>
            </div>
          )}
          {terms && (
            <div>
              <h3
                className={cn(
                  'font-semibold text-slate-700 border-b border-slate-300',
                  isPreview ? 'mb-1 pb-0.5 text-[9px]' : 'mb-2 pb-1 text-sm'
                )}
              >
                取引条件
              </h3>
              <p
                className={cn(
                  'text-slate-600 whitespace-pre-wrap',
                  isPreview ? 'text-[8px] leading-relaxed' : 'text-sm leading-relaxed'
                )}
              >
                {terms}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 発行元情報 */}
      <div
        className={cn(
          'border-t border-slate-300 pt-4',
          isPreview ? 'mt-4' : 'mt-8'
        )}
      >
        <div className={cn('text-right', isPreview ? 'text-[8px]' : 'text-sm')}>
          <p className={cn('font-bold text-slate-900', isPreview ? 'text-[10px] mb-1' : 'text-base mb-2')}>
            {org.name}
          </p>
          <p className="text-slate-600">{org.address}</p>
          <p className="text-slate-600">
            TEL: {org.phone}
            {org.fax && ` / FAX: ${org.fax}`}
          </p>
          <p className="text-slate-600">{org.email}</p>
        </div>
      </div>
    </div>
  );
}

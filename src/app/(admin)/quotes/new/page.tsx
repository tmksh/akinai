'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  Building2,
  Calendar,
  Save,
  Send,
  Package,
  Eye,
  EyeOff,
  Columns,
  Download,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { QuoteTemplate } from '@/components/quotes/quote-template';
import { useOrganization } from '@/components/providers/organization-provider';
import { createQuote, sendQuote } from '@/lib/actions/quotes';
import { getCustomers, type CustomerWithAddresses } from '@/lib/actions/customers';
import { getProducts, type ProductWithRelations } from '@/lib/actions/products';
import { getCategoriesWithProductCount } from '@/lib/actions/products';
import type { Database } from '@/types/database';

type Category = Database['public']['Tables']['categories']['Row'];
type CategoryWithCount = Category & { productCount: number };

interface QuoteItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  notes: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

export default function NewQuotePage() {
  const router = useRouter();
  const { organization } = useOrganization();
  const [customerMode, setCustomerMode] = useState<'select' | 'manual'>('select');
  const [customerId, setCustomerId] = useState('');
  const [manualCustomer, setManualCustomer] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [validDays, setValidDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('納期：発注後2週間以内\n支払条件：月末締め翌月末払い');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  // 実データ用のstate
  const [customers, setCustomers] = useState<CustomerWithAddresses[]>([]);
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // 顧客・商品・カテゴリを取得
  useEffect(() => {
    if (!organization?.id) return;

    const fetchData = async () => {
      setDataLoading(true);
      const [customersResult, productsResult, categoriesResult] = await Promise.all([
        getCustomers(organization.id),
        getProducts(organization.id),
        getCategoriesWithProductCount(organization.id),
      ]);

      setCustomers(customersResult.data || []);
      setProducts(productsResult.data || []);
      setCategories(categoriesResult.data || []);
      setDataLoading(false);
    };

    fetchData();
  }, [organization?.id]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // 見積番号（プレビュー用：実際の番号はDB保存時に生成）
  const quoteNumber = `QT-${new Date().getFullYear()}-****`;

  // 有効期限を計算
  const validUntilDate = new Date(Date.now() + parseInt(validDays) * 24 * 60 * 60 * 1000);
  const validUntil = validUntilDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // 商品フィルタリング
  const filteredProducts = products.filter((p) => {
    // カテゴリフィルター
    if (categoryFilter !== 'all' && !p.categories.some(c => c.id === categoryFilter)) {
      return false;
    }
    // 検索フィルター（商品名とバリエーション名）
    if (productSearch) {
      const searchLower = productSearch.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(searchLower);
      const variantMatch = p.variants.some(v => v.name.toLowerCase().includes(searchLower));
      return nameMatch || variantMatch;
    }
    return true;
  });

  // カテゴリごとの商品数
  const productCountByCategory = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    categories.forEach(cat => {
      counts[cat.id] = cat.productCount;
    });
    return counts;
  }, [products, categories]);

  // 商品を追加
  const addProduct = (
    product: ProductWithRelations,
    variant: ProductWithRelations['variants'][0]
  ) => {
    const newItem: QuoteItem = {
      id: `item-${Date.now()}`,
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantName: variant.name,
      quantity: 1,
      unitPrice: variant.price,
      discount: 0,
      notes: '',
    };
    setItems([...items, newItem]);
    setShowProductDialog(false);
    setProductSearch('');
    setCategoryFilter('all');
  };

  // 項目を更新
  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  // 項目を削除
  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // 計算
  const calculateItemTotal = (item: QuoteItem) => {
    const subtotal = item.unitPrice * item.quantity;
    const discountAmount = subtotal * (item.discount / 100);
    return subtotal - discountAmount;
  };

  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  // 保存
  const handleSave = async (send: boolean = false) => {
    if (!hasCustomer || items.length === 0 || !organization) return;

    setIsSaving(true);

    try {
      // 顧客情報を取得
      const customerName = customerMode === 'select' && selectedCustomer
        ? selectedCustomer.name
        : manualCustomer.name || manualCustomer.company;
      const customerCompany = customerMode === 'select' && selectedCustomer
        ? selectedCustomer.company
        : manualCustomer.company;

      // 見積を作成
      const { data: quote, error } = await createQuote({
        organizationId: organization.id,
        customerId: customerMode === 'select' ? customerId : null,
        customerName,
        customerCompany,
        subtotal,
        tax,
        total,
        validUntil: validUntilDate.toISOString(),
        notes: notes || undefined,
        terms: terms || undefined,
        status: send ? 'sent' : 'draft',
        items: items.map(item => ({
          productId: item.productId || null,
          variantId: item.variantId || null,
          productName: item.productName,
          variantName: item.variantName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          notes: item.notes || undefined,
        })),
      });

      if (error) {
        console.error('Failed to create quote:', error);
        alert('見積の保存に失敗しました: ' + error);
        return;
      }

      // 送付する場合は送信処理
      if (send && quote) {
        await sendQuote(quote.id);
      }

      setShowSendDialog(false);
      router.push('/quotes');
    } catch (err) {
      console.error('Failed to save quote:', err);
      alert('見積の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 印刷
  const handlePrint = () => {
    window.print();
  };

  // プレビュー用の顧客データ
  const getDefaultAddress = (cust: CustomerWithAddresses) => {
    const defaultAddr = cust.addresses.find(a => a.is_default) || cust.addresses[0];
    if (!defaultAddr) return undefined;
    return `${defaultAddr.prefecture}${defaultAddr.city}${defaultAddr.line1}`;
  };

  const customerData = customerMode === 'select' && selectedCustomer
    ? {
        name: selectedCustomer.name,
        company: selectedCustomer.company || '',
        email: selectedCustomer.email,
        phone: selectedCustomer.phone || '',
        address: getDefaultAddress(selectedCustomer),
      }
    : customerMode === 'manual' && (manualCustomer.company || manualCustomer.name)
    ? {
        name: manualCustomer.name,
        company: manualCustomer.company,
        email: manualCustomer.email,
        phone: manualCustomer.phone,
        address: manualCustomer.address,
      }
    : null;

  // 顧客が入力されているか
  const hasCustomer = customerMode === 'select' ? !!customerId : !!(manualCustomer.company || manualCustomer.name);

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/quotes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">見積作成</h1>
            <p className="text-sm text-muted-foreground">新しい見積書を作成します</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* プレビュートグル */}
          <div className="hidden sm:flex items-center border rounded-lg p-1 bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className={cn('h-8 px-2', !showPreview && 'bg-background shadow-sm')}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(true)}
              className={cn('h-8 px-2', showPreview && 'bg-background shadow-sm')}
            >
              <Columns className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={!hasCustomer || items.length === 0 || isSaving}
          >
            <Save className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">下書き保存</span>
          </Button>
          <Button
            className="btn-premium"
            size="sm"
            onClick={() => setShowSendDialog(true)}
            disabled={!hasCustomer || items.length === 0}
          >
            <Send className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">送付する</span>
          </Button>
        </div>
      </div>

      {/* 送付確認ダイアログ */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
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
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {isSaving ? '送付中...' : 'この内容で送付'}
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-slate-900">
            <div className="mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
              <QuoteTemplate
                quoteNumber={quoteNumber}
                customer={customerData}
                items={items}
                subtotal={subtotal}
                tax={tax}
                total={total}
                validUntil={validUntil}
                notes={notes}
                terms={terms}
                scale="full"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className={cn('grid gap-6', showPreview ? 'lg:grid-cols-2' : '')}>
        {/* メインフォーム */}
        <div className="space-y-6">
          {/* 顧客情報 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  顧客情報
                </CardTitle>
                <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCustomerMode('select')}
                    className={cn('h-7 px-3 text-xs', customerMode === 'select' && 'bg-background shadow-sm')}
                  >
                    既存顧客
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCustomerMode('manual')}
                    className={cn('h-7 px-3 text-xs', customerMode === 'manual' && 'bg-background shadow-sm')}
                  >
                    直接入力
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {customerMode === 'select' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>顧客を選択 *</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="顧客を選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{customer.company || customer.name}</span>
                              {customer.company && (
                                <span className="text-muted-foreground">({customer.name})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedCustomer && (
                    <div className="p-3 rounded-lg bg-muted/50 text-sm">
                      <p className="font-medium">{selectedCustomer.company || selectedCustomer.name}</p>
                      <p className="text-muted-foreground">{selectedCustomer.email}</p>
                      {selectedCustomer.phone && (
                        <p className="text-muted-foreground">{selectedCustomer.phone}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>会社名</Label>
                      <Input
                        placeholder="株式会社サンプル"
                        value={manualCustomer.company}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, company: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>担当者名 *</Label>
                      <Input
                        placeholder="山田 太郎"
                        value={manualCustomer.name}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>メールアドレス</Label>
                      <Input
                        type="email"
                        placeholder="sample@example.com"
                        value={manualCustomer.email}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>電話番号</Label>
                      <Input
                        placeholder="03-1234-5678"
                        value={manualCustomer.phone}
                        onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>住所</Label>
                    <Input
                      placeholder="東京都千代田区..."
                      value={manualCustomer.address}
                      onChange={(e) => setManualCustomer({ ...manualCustomer, address: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 見積明細 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  見積明細
                </CardTitle>
                <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      商品を追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>商品を追加</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 flex-1 min-h-0">
                      {/* 検索とフィルター */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="商品名・バリエーション名で検索..."
                            className="pl-10"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* カテゴリタブ */}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={categoryFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCategoryFilter('all')}
                          className="h-8"
                        >
                          すべて
                          <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                            {productCountByCategory.all}
                          </Badge>
                        </Button>
                        {categories.map((category) => (
                          <Button
                            key={category.id}
                            variant={categoryFilter === category.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCategoryFilter(category.id)}
                            className="h-8"
                          >
                            {category.name}
                            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-xs">
                              {productCountByCategory[category.id] || 0}
                            </Badge>
                          </Button>
                        ))}
                      </div>

                      {/* 検索結果 */}
                      <div className="text-sm text-muted-foreground">
                        {filteredProducts.length}件の商品
                        {productSearch && <span>（「{productSearch}」で検索）</span>}
                      </div>

                      {/* 商品リスト */}
                      <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                        {filteredProducts.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground">該当する商品がありません</p>
                            <p className="text-sm text-muted-foreground">検索条件を変更してください</p>
                          </div>
                        ) : (
                          filteredProducts.map((product) => {
                            const category = product.categories[0];
                            return (
                              <div key={product.id} className="border rounded-lg overflow-hidden">
                                <div className="flex items-center justify-between p-3 bg-muted/30">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{product.name}</p>
                                    {category && (
                                      <Badge variant="outline" className="text-xs">
                                        {category.name}
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {product.variants.length}種類
                                  </span>
                                </div>
                                <div className="divide-y">
                                  {product.variants.map((variant) => (
                                    <button
                                      key={variant.id}
                                      className="flex items-center justify-between w-full p-3 hover:bg-muted/50 text-left transition-colors"
                                      onClick={() => addProduct(product, variant)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                          <Package className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium">{variant.name}</span>
                                          <p className="text-xs text-muted-foreground">在庫: {variant.stock}点</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-medium">{formatCurrency(variant.price)}</span>
                                        <p className="text-xs text-muted-foreground">+ 追加</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                  <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground mb-4">商品が追加されていません</p>
                  <Button variant="outline" onClick={() => setShowProductDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    商品を追加
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.productName}</p>
                          <p className="text-sm text-muted-foreground">{item.variantName}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">単価</Label>
                          <Input
                            type="number"
                            className="h-8 text-sm"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(item.id, 'unitPrice', parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">数量</Label>
                          <Input
                            type="number"
                            min="1"
                            className="h-8 text-sm"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">割引(%)</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            className="h-8 text-sm"
                            value={item.discount}
                            onChange={(e) =>
                              updateItem(item.id, 'discount', parseInt(e.target.value) || 0)
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">金額</Label>
                          <p className="h-8 flex items-center font-medium text-sm">
                            {formatCurrency(calculateItemTotal(item))}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Input
                          placeholder="備考を入力..."
                          className="h-7 text-xs"
                          value={item.notes}
                          onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  {/* サマリー */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">小計</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">消費税（10%）</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-base">
                      <span>合計</span>
                      <span className="text-primary">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 備考・条件 */}
          <Card>
            <CardHeader>
              <CardTitle>備考・条件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>備考</Label>
                <Textarea
                  placeholder="見積に関する備考を入力..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>取引条件</Label>
                <Textarea
                  placeholder="納期、支払条件などを入力..."
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 有効期限 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                有効期限
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">有効日数</Label>
                  <Select value={validDays} onValueChange={setValidDays}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7日間</SelectItem>
                      <SelectItem value="14">14日間</SelectItem>
                      <SelectItem value="30">30日間</SelectItem>
                      <SelectItem value="60">60日間</SelectItem>
                      <SelectItem value="90">90日間</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  有効期限:{' '}
                  <span className="font-medium text-foreground">
                    {new Date(
                      Date.now() + parseInt(validDays) * 24 * 60 * 60 * 1000
                    ).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* リアルタイムプレビュー */}
        {showPreview && (
          <div className="space-y-4">
            {/* プレビューヘッダー */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">見積書プレビュー</h3>
              <Badge
                variant="secondary"
                className="text-xs"
              >
                リアルタイム更新
              </Badge>
            </div>

            {/* プレビューフレーム */}
            <div className="border rounded-lg bg-slate-100 dark:bg-slate-800 p-4 overflow-auto max-h-[750px]">
              <QuoteTemplate
                quoteNumber={quoteNumber}
                customer={customerData}
                items={items}
                subtotal={subtotal}
                tax={tax}
                total={total}
                validUntil={validUntil}
                notes={notes}
                terms={terms}
                scale="preview"
                className="shadow-lg rounded"
              />
            </div>

            {/* ヒント */}
            <p className="text-xs text-muted-foreground text-center">
              左側のフォームを編集すると、リアルタイムで見積書に反映されます
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
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
  Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockCustomers, mockProducts } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

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
  const [customerId, setCustomerId] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('納期：発注後2週間以内\n支払条件：月末締め翌月末払い');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedCustomer = mockCustomers.find((c) => c.id === customerId);

  // 商品フィルタリング
  const filteredProducts = mockProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // 商品を追加
  const addProduct = (product: typeof mockProducts[0], variant: typeof mockProducts[0]['variants'][0]) => {
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
  };

  // 項目を更新
  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItems(items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
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
    if (!customerId || items.length === 0) return;
    
    setIsSaving(true);
    // API呼び出し（モック）
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    console.log('Saving quote:', {
      customerId,
      validDays,
      notes,
      terms,
      items,
      status: send ? 'sent' : 'draft',
    });
    
    setIsSaving(false);
    router.push('/quotes');
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
            <h1 className="text-2xl font-bold">見積作成</h1>
            <p className="text-muted-foreground">新しい見積書を作成します</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={!customerId || items.length === 0 || isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            下書き保存
          </Button>
          <Button
            className="gradient-brand text-white"
            onClick={() => handleSave(true)}
            disabled={!customerId || items.length === 0 || isSaving}
          >
            <Send className="mr-2 h-4 w-4" />
            作成して送付
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* メインフォーム */}
        <div className="lg:col-span-2 space-y-6">
          {/* 顧客選択 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                顧客情報
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>顧客を選択 *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="顧客を選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCustomers.map((customer) => (
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
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>商品を追加</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="商品名で検索..."
                          className="pl-10"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-[400px] overflow-y-auto space-y-2">
                        {filteredProducts.map((product) => (
                          <div key={product.id} className="border rounded-lg p-3">
                            <p className="font-medium mb-2">{product.name}</p>
                            <div className="grid gap-2">
                              {product.variants.map((variant) => (
                                <button
                                  key={variant.id}
                                  className="flex items-center justify-between p-2 rounded hover:bg-muted text-left transition-colors"
                                  onClick={() => addProduct(product, variant)}
                                >
                                  <span className="text-sm">{variant.name}</span>
                                  <span className="font-medium">{formatCurrency(variant.price)}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">商品名</TableHead>
                      <TableHead className="text-right">単価</TableHead>
                      <TableHead className="text-right w-[100px]">数量</TableHead>
                      <TableHead className="text-right w-[100px]">割引(%)</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">{item.variantName}</p>
                            <Input
                              placeholder="備考を入力..."
                              className="mt-2 text-xs h-7"
                              value={item.notes}
                              onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            className="w-24 text-right ml-auto"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            className="w-20 text-right"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              className="w-16 text-right"
                              value={item.discount}
                              onChange={(e) => updateItem(item.id, 'discount', parseInt(e.target.value) || 0)}
                            />
                            <Percent className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(calculateItemTotal(item))}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4}>小計</TableCell>
                      <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={4}>消費税 (10%)</TableCell>
                      <TableCell className="text-right">{formatCurrency(tax)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                    <TableRow className="text-lg font-bold">
                      <TableCell colSpan={4}>合計</TableCell>
                      <TableCell className="text-right text-primary">{formatCurrency(total)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
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
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 有効期限 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                有効期限
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>有効日数</Label>
                <Select value={validDays} onValueChange={setValidDays}>
                  <SelectTrigger>
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
              <Separator className="my-4" />
              <div className="text-sm text-muted-foreground">
                有効期限:{' '}
                <span className="font-medium text-foreground">
                  {new Date(Date.now() + parseInt(validDays) * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* サマリー */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle>見積サマリー</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">品目数</span>
                <span className="font-medium">{items.length} 品目</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">合計数量</span>
                <span className="font-medium">
                  {items.reduce((sum, item) => sum + item.quantity, 0)} 個
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">小計</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">消費税</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>合計</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


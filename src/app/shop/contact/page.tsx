'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, MessageCircle, HelpCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const contactInfo = [
  {
    icon: Mail,
    title: 'メール',
    value: 'info@akinai-store.jp',
    description: '24時間受付',
  },
  {
    icon: Phone,
    title: '電話',
    value: '03-1234-5678',
    description: '平日 10:00-18:00',
  },
  {
    icon: MapPin,
    title: '所在地',
    value: '東京都渋谷区神宮前1-2-3',
    description: 'ショールームは予約制',
  },
  {
    icon: Clock,
    title: '営業時間',
    value: '10:00 - 18:00',
    description: '土日祝休み',
  },
];

const faqs = [
  {
    question: '注文後、どのくらいで届きますか？',
    answer: '通常、ご注文から2-3営業日以内に発送いたします。お届けは発送から1-2日程度です。在庫状況や配送地域によって前後する場合がございます。',
  },
  {
    question: '返品・交換はできますか？',
    answer: '商品到着後7日以内であれば、未使用・未開封の商品に限り返品・交換を承ります。サイズ交換は無料で対応いたします。詳しくは返品ポリシーをご確認ください。',
  },
  {
    question: '支払い方法は何がありますか？',
    answer: 'クレジットカード（VISA, Master, JCB, AMEX）、銀行振込、代金引換、コンビニ払いをご利用いただけます。',
  },
  {
    question: 'ギフトラッピングはできますか？',
    answer: 'はい、承っております。ご注文時にギフトラッピングオプションをお選びください。無料でリボンラッピング、有料でボックスラッピングをご用意しています。',
  },
  {
    question: '海外発送は可能ですか？',
    answer: '申し訳ございませんが、現在は日本国内のみの発送となっております。海外発送については準備中です。',
  },
];

const inquiryTypes = [
  { value: 'product', label: '商品について' },
  { value: 'order', label: 'ご注文について' },
  { value: 'shipping', label: '配送について' },
  { value: 'return', label: '返品・交換' },
  { value: 'other', label: 'その他' },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: '',
    orderNumber: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // 模擬的な送信処理
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <Send className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              送信完了
            </h2>
            <p className="text-slate-600 mb-6">
              お問い合わせありがとうございます。<br />
              2営業日以内にご返信いたします。
            </p>
            <Button
              onClick={() => {
                setIsSubmitted(false);
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  type: '',
                  orderNumber: '',
                  message: '',
                });
              }}
              variant="outline"
            >
              新しいお問い合わせ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            お問い合わせ
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            ご質問やご相談がございましたら、お気軽にお問い合わせください。
            通常2営業日以内にご返信いたします。
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* 連絡先情報 */}
          <div className="lg:col-span-1 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              {contactInfo.map((info, index) => (
                <Card key={index}>
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="p-3 bg-orange-50 rounded-xl shrink-0">
                      <info.icon className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{info.title}</h3>
                      <p className="text-slate-900 font-medium">{info.value}</p>
                      <p className="text-sm text-slate-500">{info.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* クイックリンク */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-bold text-slate-900">お役立ちリンク</h3>
                <div className="space-y-2">
                  <a href="/shop/guide" className="flex items-center gap-2 text-slate-600 hover:text-orange-500 transition-colors">
                    <HelpCircle className="h-4 w-4" />
                    ご利用ガイド
                  </a>
                  <a href="/shop/shipping" className="flex items-center gap-2 text-slate-600 hover:text-orange-500 transition-colors">
                    <Package className="h-4 w-4" />
                    配送について
                  </a>
                  <a href="/shop/returns" className="flex items-center gap-2 text-slate-600 hover:text-orange-500 transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    返品・交換
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* お問い合わせフォーム */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">お名前 <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="山田 太郎"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">メールアドレス <span className="text-red-500">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="example@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone">電話番号</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="090-1234-5678"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">お問い合わせ種類 <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {inquiryTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(formData.type === 'order' || formData.type === 'shipping' || formData.type === 'return') && (
                    <div className="space-y-2">
                      <Label htmlFor="orderNumber">注文番号</Label>
                      <Input
                        id="orderNumber"
                        value={formData.orderNumber}
                        onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                        placeholder="ORD-2024-XXXXX"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="message">お問い合わせ内容 <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="お問い合わせ内容をご記入ください"
                      rows={6}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-orange-500 hover:bg-orange-600"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        送信中...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        送信する
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              よくあるご質問
            </h2>
            <p className="text-slate-600">
              お問い合わせの前に、こちらもご確認ください
            </p>
          </div>

          <Card className="max-w-3xl mx-auto">
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


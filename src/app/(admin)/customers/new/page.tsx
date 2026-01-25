'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  Tag,
  FileText,
  Save,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useOrganization } from '@/components/providers/organization-provider';
import { createCustomer } from '@/lib/actions/customers';

// 都道府県リスト
const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

export default function NewCustomerPage() {
  const router = useRouter();
  const { organization } = useOrganization();
  
  const [isSaving, setIsSaving] = useState(false);
  const [customerType, setCustomerType] = useState<'individual' | 'business'>('individual');
  
  // 基本情報
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  
  // タグ
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  // 住所
  const [addAddress, setAddAddress] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [city, setCity] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [addressPhone, setAddressPhone] = useState('');

  // タグを追加
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  // タグを削除
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 保存
  const handleSave = async () => {
    if (!organization) return;
    if (!name || !email) {
      alert('名前とメールアドレスは必須です');
      return;
    }

    setIsSaving(true);

    try {
      const { data, error } = await createCustomer({
        organizationId: organization.id,
        type: customerType,
        name,
        email,
        phone: phone || undefined,
        company: customerType === 'business' ? company : undefined,
        notes: notes || undefined,
        tags: tags.length > 0 ? tags : undefined,
        address: addAddress && postalCode && prefecture && city && line1
          ? {
              postalCode,
              prefecture,
              city,
              line1,
              line2: line2 || undefined,
              phone: addressPhone || undefined,
              isDefault: true,
            }
          : undefined,
      });

      if (error) {
        alert('顧客の登録に失敗しました: ' + error);
        return;
      }

      router.push('/customers');
    } catch (err) {
      console.error('Failed to create customer:', err);
      alert('顧客の登録に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/customers">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">顧客を登録</h1>
            <p className="text-sm text-muted-foreground">新しい顧客情報を登録します</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !name || !email}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* メインフォーム */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 顧客タイプ */}
              <div className="space-y-2">
                <Label>顧客タイプ</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={customerType === 'individual' ? 'default' : 'outline'}
                    onClick={() => setCustomerType('individual')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    個人
                  </Button>
                  <Button
                    type="button"
                    variant={customerType === 'business' ? 'default' : 'outline'}
                    onClick={() => setCustomerType('business')}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    法人
                  </Button>
                </div>
              </div>

              {/* 会社名（法人の場合） */}
              {customerType === 'business' && (
                <div className="space-y-2">
                  <Label htmlFor="company">会社名 *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="company"
                      placeholder="株式会社サンプル"
                      className="pl-10"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* 名前 */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  {customerType === 'business' ? '担当者名' : '氏名'} *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder={customerType === 'business' ? '山田 太郎' : '山田 太郎'}
                    className="pl-10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              {/* メールアドレス */}
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="sample@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* 電話番号 */}
              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="03-1234-5678"
                    className="pl-10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 住所 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-500" />
                  住所
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="addAddress" className="text-sm">住所を登録</Label>
                  <Switch
                    id="addAddress"
                    checked={addAddress}
                    onCheckedChange={setAddAddress}
                  />
                </div>
              </div>
              {!addAddress && (
                <CardDescription>住所は後から追加することもできます</CardDescription>
              )}
            </CardHeader>
            {addAddress && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">郵便番号 *</Label>
                    <Input
                      id="postalCode"
                      placeholder="100-0001"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prefecture">都道府県 *</Label>
                    <Select value={prefecture} onValueChange={setPrefecture}>
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFECTURES.map((pref) => (
                          <SelectItem key={pref} value={pref}>
                            {pref}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">市区町村 *</Label>
                  <Input
                    id="city"
                    placeholder="千代田区"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line1">番地・建物名 *</Label>
                  <Input
                    id="line1"
                    placeholder="千代田1-1-1"
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="line2">建物名・部屋番号</Label>
                  <Input
                    id="line2"
                    placeholder="サンプルビル 101号室"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressPhone">配送先電話番号</Label>
                  <Input
                    id="addressPhone"
                    placeholder="03-1234-5678"
                    value={addressPhone}
                    onChange={(e) => setAddressPhone(e.target.value)}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* タグ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-purple-500" />
                タグ
              </CardTitle>
              <CardDescription>顧客を分類するためのタグを追加できます</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="タグを入力"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button variant="outline" size="icon" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* メモ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" />
                メモ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="顧客に関するメモを入力..."
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




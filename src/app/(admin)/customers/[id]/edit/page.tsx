'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, User, Building2, Mail, Phone, MapPin, Tag,
  FileText, Save, Loader2, Plus, X, Lock, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useOrganization } from '@/components/providers/organization-provider';
import { CustomerSchemaFields } from '@/components/customers/customer-schema-fields';
import { getCustomer, updateCustomer } from '@/lib/actions/customers';
import { getCustomerRoleLabels } from '@/lib/actions/settings';
import { DEFAULT_CUSTOMER_ROLE_LABELS, DEFAULT_CUSTOMER_ROLE_ENABLED, type CustomerRoleLabels, type CustomerRoleEnabled } from '@/lib/customer-roles';
import { toast } from 'sonner';

type CustomerRole = 'personal' | 'buyer' | 'supplier';
type CustomerStatus = 'pending' | 'active' | 'suspended';

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];

const STATUS_LABELS: Record<CustomerStatus, string> = {
  pending: '審査中',
  active: '有効',
  suspended: '停止中',
};

export default function CustomerEditPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  const { organization } = useOrganization();
  const [, startTransition] = useTransition();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [roleLabels, setRoleLabels] = useState<CustomerRoleLabels>({ ...DEFAULT_CUSTOMER_ROLE_LABELS });
  const [roleEnabled, setRoleEnabled] = useState<CustomerRoleEnabled>({ ...DEFAULT_CUSTOMER_ROLE_ENABLED });
  const [role, setRole] = useState<CustomerRole>('personal');
  const [status, setStatus] = useState<CustomerStatus>('active');

  const [schemaFieldValues, setSchemaFieldValues] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');

  const [buyerContactPerson, setBuyerContactPerson] = useState('');
  const [buyerIndustry, setBuyerIndustry] = useState('');

  const [supplierRepresentative, setSupplierRepresentative] = useState('');
  const [supplierPrefecture, setSupplierPrefecture] = useState('');
  const [supplierCategories, setSupplierCategories] = useState<string[]>([]);
  const [newSupplierCategory, setNewSupplierCategory] = useState('');

  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (!customerId) { setIsLoading(false); return; }
    getCustomer(customerId).then(({ data }) => {
      setIsLoading(false);
      if (!data) return;

      setRole((data.role as CustomerRole) || 'personal');
      setStatus((data.status as CustomerStatus) || 'active');
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setCompany(data.company || '');
      setNotes(data.notes || '');
      setTags(Array.isArray(data.tags) ? (data.tags as string[]) : []);

      const metadata = (data.metadata as Record<string, unknown>) ?? {};
      if (data.role === 'buyer') {
        setBuyerContactPerson(String(metadata.contactPerson || ''));
        setBuyerIndustry(data.business_type || String(metadata.industry || ''));
      }
      if (data.role === 'supplier') {
        setSupplierRepresentative(String(metadata.representativeName || ''));
        setSupplierPrefecture(data.prefecture || '');
        if (Array.isArray(metadata.productCategories)) {
          setSupplierCategories(metadata.productCategories as string[]);
        }
      }

      // カスタムフィールドの復元（配列・オブジェクト両形式に対応）
      const rawCF = data.custom_fields;
      if (Array.isArray(rawCF)) {
        const vals: Record<string, string> = {};
        (rawCF as { key: string; value?: unknown }[]).forEach((f) => {
          vals[f.key] = String(f.value ?? '');
        });
        setSchemaFieldValues(vals);
      } else if (rawCF && typeof rawCF === 'object') {
        const vals: Record<string, string> = {};
        Object.entries(rawCF as Record<string, unknown>).forEach(([k, v]) => {
          vals[k] = String(v ?? '');
        });
        setSchemaFieldValues(vals);
      }
    });
  }, [customerId]);

  useEffect(() => {
    if (!organization?.id) return;
    startTransition(async () => {
      const { data, enabled } = await getCustomerRoleLabels(organization.id);
      setRoleLabels(data);
      setRoleEnabled(enabled);
    });
  }, [organization?.id]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => setTags(tags.filter((t) => t !== tagToRemove));

  const handleAddSupplierCategory = () => {
    if (newSupplierCategory.trim() && !supplierCategories.includes(newSupplierCategory.trim())) {
      setSupplierCategories([...supplierCategories, newSupplierCategory.trim()]);
      setNewSupplierCategory('');
    }
  };

  const handleRemoveSupplierCategory = (cat: string) =>
    setSupplierCategories(supplierCategories.filter((c) => c !== cat));

  const toggleSupplierCategory = (cat: string) => {
    setSupplierCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const buildMetadata = (): Record<string, unknown> | undefined => {
    if (role === 'buyer') return { contactPerson: buyerContactPerson || undefined };
    if (role === 'supplier') return {
      representativeName: supplierRepresentative || undefined,
      productCategories: supplierCategories.length > 0 ? supplierCategories : undefined,
    };
    return undefined;
  };

  const handleSave = async () => {
    if (!name || !email) { toast.error('名前とメールアドレスは必須です'); return; }
    setIsSaving(true);
    try {
      const { error } = await updateCustomer({
        id: customerId,
        type: role === 'personal' ? 'individual' : 'business',
        role, status, name, email,
        phone: phone || null,
        company: company || null,
        notes: notes || null,
        tags: tags.length > 0 ? tags : [],
        metadata: buildMetadata(),
        prefecture: (role === 'supplier' ? supplierPrefecture : null) ?? null,
        businessType: (role === 'buyer' ? buyerIndustry : null) ?? null,
        customFields: Object.keys(schemaFieldValues).length > 0 ? schemaFieldValues : {},
        ...(newPassword ? { password: newPassword } : {}),
      });
      if (error) { toast.error('保存に失敗しました: ' + error); return; }
      toast.success('顧客情報を更新しました');
      router.push(`/customers/${customerId}`);
    } catch (err) {
      console.error(err);
      toast.error('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/customers/${customerId}`}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">顧客を編集</h1>
            <p className="text-sm text-muted-foreground">顧客情報を更新します</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !name || !email}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* 会員種別・ステータス */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-sky-500" />
                  会員種別・ステータス
                </CardTitle>
                <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
                  <Link href="/settings/customer-roles">種別を設定 →</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>会員種別</Label>
                  <div className="flex flex-wrap gap-2">
                    {(['personal', 'buyer', 'supplier'] as CustomerRole[]).filter(r => roleEnabled[r]).map((r) => (
                      <Button key={r} type="button" size="sm" variant={role === r ? 'default' : 'outline'} onClick={() => setRole(r)}>
                        {roleLabels[r]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>ステータス</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as CustomerStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-sky-500" />
                基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {role !== 'personal' && (
                <div className="space-y-2">
                  <Label htmlFor="company">会社・屋号名</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="company" placeholder="株式会社サンプル" className="pl-10" value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">
                  {role === 'supplier' ? '代表者名' : role === 'buyer' ? '担当者名' : '氏名'} *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" placeholder="山田 太郎" className="pl-10" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="sample@example.com" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">パスワード変更（空白で変更なし）</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="newPassword" type="password" placeholder="変更する場合のみ入力" className="pl-10" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="phone" placeholder="03-1234-5678" className="pl-10" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* バイヤー追加情報 */}
          {role === 'buyer' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  {roleLabels.buyer}情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="buyerContact">担当者名</Label>
                  <Input id="buyerContact" placeholder="山田 太郎" value={buyerContactPerson} onChange={(e) => setBuyerContactPerson(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>業種</Label>
                  <Input placeholder="例: 小売業、製造業、IT など" value={buyerIndustry} onChange={(e) => setBuyerIndustry(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* サプライヤー追加情報 */}
          {role === 'supplier' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-500" />
                  {roleLabels.supplier}情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierRep">代表者名</Label>
                  <Input id="supplierRep" placeholder="山田 太郎" value={supplierRepresentative} onChange={(e) => setSupplierRepresentative(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>都道府県（産地）</Label>
                  <Select value={supplierPrefecture} onValueChange={setSupplierPrefecture}>
                    <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                    <SelectContent>
                      {PREFECTURES.map((pref) => <SelectItem key={pref} value={pref}>{pref}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>主な取扱カテゴリ</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="例: 農産物、IT機器、アパレル など"
                      value={newSupplierCategory}
                      onChange={(e) => setNewSupplierCategory(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSupplierCategory(); } }}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={handleAddSupplierCategory}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {supplierCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {supplierCategories.map((cat) => (
                        <Badge key={cat} variant="secondary" className="gap-1">
                          {cat}
                          <button type="button" onClick={() => handleRemoveSupplierCategory(cat)} className="ml-1 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* カスタムフィールド */}
          {/* カスタムフィールド（スキーマ駆動・会員種別フィルタリング） */}
          {organization?.customerFieldSchema && organization.customerFieldSchema.length > 0 && (
            <CustomerSchemaFields
              schema={organization.customerFieldSchema}
              role={role}
              values={schemaFieldValues}
              onChange={setSchemaFieldValues}
            />
          )}

          {/* 住所セクション（読み取り専用の案内） */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-500" />住所
              </CardTitle>
              <CardDescription>
                住所の編集は顧客詳細ページから行えます
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-sky-500" />タグ</CardTitle>
              <CardDescription>顧客を分類するためのタグを追加できます</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="タグを入力" value={newTag} onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} />
                <Button variant="outline" size="icon" onClick={handleAddTag}><Plus className="h-4 w-4" /></Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-slate-500" />メモ</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea placeholder="顧客に関するメモを入力..." rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

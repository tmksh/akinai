'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Type,
  Hash,
  ToggleLeft,
  Calendar,
  Link2,
  Palette,
  Code,
  Sparkles,
  AlignLeft,
  Mail,
  Star,
  ImageIcon,
  ListOrdered,
  Braces,
  ListFilter,
  Phone,
  Info,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/components/providers/organization-provider';
import type { ProductFieldSchemaItem } from '@/components/providers/organization-provider';
import type { CustomFieldType } from '@/components/products/custom-fields';
import { updateProductFieldSchema, updateVariantInputMode } from '@/lib/actions/settings';
import { toast } from 'sonner';

const fieldTypeConfig: Record<CustomFieldType, { label: string; icon: React.ElementType; color: string; category: 'basic' | 'media' | 'advanced' }> = {
  text:      { label: 'テキスト',     icon: Type,        color: 'text-blue-500',    category: 'basic' },
  textarea:  { label: '長文テキスト', icon: AlignLeft,   color: 'text-blue-400',    category: 'basic' },
  number:    { label: '数値',         icon: Hash,        color: 'text-emerald-500', category: 'basic' },
  boolean:   { label: '真偽値',       icon: ToggleLeft,  color: 'text-violet-500',  category: 'basic' },
  select:    { label: '選択肢',       icon: ListFilter,  color: 'text-indigo-500',  category: 'basic' },
  date:      { label: '日付',         icon: Calendar,    color: 'text-sky-500',   category: 'basic' },
  url:       { label: 'URL',          icon: Link2,       color: 'text-cyan-500',    category: 'media' },
  email:     { label: 'メール',       icon: Mail,        color: 'text-sky-500',     category: 'media' },
  phone:     { label: '電話番号',     icon: Phone,       color: 'text-teal-500',    category: 'media' },
  image_url: { label: '画像',      icon: ImageIcon,   color: 'text-sky-500',  category: 'media' },
  color:     { label: 'カラー',       icon: Palette,     color: 'text-pink-500',    category: 'media' },
  rating:    { label: '評価',         icon: Star,        color: 'text-sky-500',  category: 'advanced' },
  list:      { label: 'リスト',       icon: ListOrdered, color: 'text-rose-500',    category: 'advanced' },
  json:      { label: 'JSON',         icon: Braces,      color: 'text-slate-500',   category: 'advanced' },
};

const categoryLabels = { basic: '基本', media: 'メディア・連絡先', advanced: '高度' };

function generateKeyFromLabel(label: string): string {
  const map: Record<string, string> = {
    '素材': 'material', '材質': 'material', 'サイズ': 'size', '色': 'color',
    'カラー': 'color', '重量': 'weight', '重さ': 'weight', '幅': 'width',
    '高さ': 'height', '奥行': 'depth', '長さ': 'length', 'ブランド': 'brand',
    'メーカー': 'maker', '型番': 'model_number', '産地': 'origin', '原産地': 'origin',
    '容量': 'capacity', '数量': 'quantity', '賞味期限': 'expiry_date',
    '保証期間': 'warranty', '送料': 'shipping_fee', '備考': 'notes',
  };
  const trimmed = label.trim();
  if (map[trimmed]) return map[trimmed];
  const ascii = trimmed
    .replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return ascii || `field_${Date.now().toString(36)}`;
}

export default function ProductSchemaSettingsPage() {
  const { organization, refetch } = useOrganization();
  const [isPending, startTransition] = useTransition();

  const [schema, setSchema] = useState<ProductFieldSchemaItem[]>(
    () => organization?.productFieldSchema ?? []
  );

  const [variantInputMode, setVariantInputMode] = useState<'simple' | 'matrix' | 'swatch'>(
    () => ((organization?.settings?.variant_input_mode as 'simple' | 'matrix' | 'swatch') ?? 'simple')
  );

  // organizationが後から読み込まれた場合に同期
  useEffect(() => {
    if (organization?.productFieldSchema) {
      setSchema(organization.productFieldSchema);
    }
    if (organization?.settings) {
      setVariantInputMode((organization.settings.variant_input_mode as 'simple' | 'matrix' | 'swatch') ?? 'simple');
    }
  }, [organization?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newKeyManual, setNewKeyManual] = useState(false);
  const [newType, setNewType] = useState<CustomFieldType>('text');
  const [newOptions, setNewOptions] = useState('');

  const handleLabelChange = (label: string) => {
    setNewLabel(label);
    if (!newKeyManual) setNewKey(generateKeyFromLabel(label));
  };

  const resetForm = () => {
    setIsAdding(false);
    setNewLabel('');
    setNewKey('');
    setNewKeyManual(false);
    setNewType('text');
    setNewOptions('');
  };

  const addField = () => {
    if (!newLabel.trim() || !newKey.trim()) return;
    if (schema.some(f => f.key === newKey.trim())) {
      toast.error('同じキーIDのフィールドが既に存在します');
      return;
    }
    if (newType === 'select' && !newOptions.trim()) {
      toast.error('選択肢をカンマ区切りで入力してください');
      return;
    }
    const options = newType === 'select'
      ? newOptions.split(',').map(o => o.trim()).filter(Boolean)
      : undefined;

    const newItem: ProductFieldSchemaItem = {
      id: `schema-${Date.now()}`,
      key: newKey.trim(),
      label: newLabel.trim(),
      type: newType,
      ...(options && { options }),
    };
    setSchema(prev => [...prev, newItem]);
    resetForm();
  };

  const removeField = (id: string) => {
    setSchema(prev => prev.filter(f => f.id !== id));
  };

  const handleSave = () => {
    if (!organization?.id) {
      toast.error('組織情報が読み込まれていません');
      return;
    }
    console.log('[Schema Save] org:', organization.id, 'schema:', JSON.stringify(schema));
    startTransition(async () => {
      const { data, error } = await updateProductFieldSchema(organization.id, schema);
      console.log('[Schema Save] result:', { data: !!data, error });
      if (error) {
        toast.error('保存に失敗しました: ' + error);
      } else {
        toast.success('商品スキーマを保存しました');
        await refetch();
      }
    });
  };

  const handleVariantModeSave = (mode: 'simple' | 'matrix' | 'swatch') => {
    if (!organization?.id) return;
    startTransition(async () => {
      const { error } = await updateVariantInputMode(organization.id, mode);
      if (error) {
        toast.error('保存に失敗しました: ' + error);
      } else {
        setVariantInputMode(mode);
        toast.success('バリエーション入力方式を変更しました');
        await refetch();
      }
    });
  };

  const groupedTypes = Object.entries(fieldTypeConfig).reduce<Record<string, [string, typeof fieldTypeConfig[CustomFieldType]][]>>((acc, entry) => {
    const cat = entry[1].category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry as [string, typeof fieldTypeConfig[CustomFieldType]]);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">商品カスタムフィールド</h1>
          <p className="text-muted-foreground">
            全商品に共通で表示されるカスタムフィールドを定義します
          </p>
        </div>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              保存中...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              保存
            </span>
          )}
        </Button>
      </div>

      {/* 説明 */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/10">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p className="font-medium">ここで定義したフィールドは全商品に自動で表示されます</p>
              <p className="text-blue-600/80 dark:text-blue-400/80">
                商品の新規作成・編集画面を開くと、このスキーマに定義されたフィールドが最初から表示されます。
                各商品ごとに値を入力するだけでOKです。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* バリエーション入力方式 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-sky-500" />
            バリエーション入力方式
          </CardTitle>
          <CardDescription>商品登録画面でのバリエーション（色・サイズなど）の入力スタイルを選択します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => handleVariantModeSave('simple')}
              disabled={isPending}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                variantInputMode === 'simple'
                  ? 'border-sky-400 bg-sky-50/60 dark:border-sky-600 dark:bg-sky-950/20'
                  : 'border-border hover:border-sky-200 dark:hover:border-sky-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">手動で追加（デフォルト）</span>
                {variantInputMode === 'simple' && (
                  <Badge className="bg-sky-500 text-white text-xs px-1.5 py-0.5">使用中</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                バリエーションを1行ずつ手動で追加します
              </p>
              <div className="rounded-lg border bg-background p-2 space-y-1">
                {['ホワイト / M', 'ホワイト / L', 'ブラック / M'].map((v) => (
                  <div key={v} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-sm bg-slate-200 dark:bg-slate-700 shrink-0" />
                    {v}
                  </div>
                ))}
              </div>
            </button>

            {/* マトリクスモード */}
            <button
              type="button"
              onClick={() => handleVariantModeSave('matrix')}
              disabled={isPending}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                variantInputMode === 'matrix'
                  ? 'border-sky-400 bg-sky-50/60 dark:border-sky-600 dark:bg-sky-950/20'
                  : 'border-border hover:border-sky-200 dark:hover:border-sky-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">組み合わせで自動生成</span>
                {variantInputMode === 'matrix' && (
                  <Badge className="bg-sky-500 text-white text-xs px-1.5 py-0.5">使用中</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                色・サイズなどの軸を設定すると組み合わせを自動生成します
              </p>
              <div className="rounded-lg border bg-background p-2">
                <div className="grid grid-cols-4 gap-0.5 text-[10px] text-center">
                  <div className="text-muted-foreground/50" />
                  {['S', 'M', 'L'].map(s => (
                    <div key={s} className="font-medium text-muted-foreground">{s}</div>
                  ))}
                  {['白', '黒'].map(c => (
                    <>
                      <div key={c} className="font-medium text-muted-foreground text-left pl-1">{c}</div>
                      {['S', 'M', 'L'].map(s => (
                        <div key={s} className="rounded bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 py-0.5">✓</div>
                      ))}
                    </>
                  ))}
                </div>
              </div>
            </button>

            {/* スウォッチモード */}
            <button
              type="button"
              onClick={() => handleVariantModeSave('swatch')}
              disabled={isPending}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                variantInputMode === 'swatch'
                  ? 'border-sky-400 bg-sky-50/60 dark:border-sky-600 dark:bg-sky-950/20'
                  : 'border-border hover:border-sky-200 dark:hover:border-sky-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">スウォッチ</span>
                {variantInputMode === 'swatch' && (
                  <Badge className="bg-sky-500 text-white text-xs px-1.5 py-0.5">使用中</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                色や画像で直感的に選択 - プレビュー連動表示
              </p>
              <div className="rounded-lg border bg-background p-2">
                <div className="aspect-[4/3] rounded mb-1.5 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30" />
                <div className="flex gap-1">
                  {['#0c4a6e', '#a16207', '#f4a8a8', '#475569'].map(c => (
                    <div key={c} className="w-3.5 h-3.5 rounded-sm border border-border/50" style={{ background: c }} />
                  ))}
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* スキーマ定義 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-sky-500" />
                フィールド定義
              </CardTitle>
              <CardDescription>商品に追加するフィールドを定義してください</CardDescription>
            </div>
            {!isAdding && (
              <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="mr-2 h-4 w-4" />
                追加
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 新規追加フォーム */}
          {isAdding && (
            <div className="rounded-xl border-2 border-dashed border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/10 p-5 space-y-4">
              <p className="text-sm font-medium text-sky-700 dark:text-sky-400">
                新しいフィールドを定義
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">表示名</Label>
                  <Input
                    value={newLabel}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    placeholder="例: 素材"
                    autoFocus
                    className="h-9"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField(); } }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Code className="h-3 w-3" />
                    キーID（API用）
                  </Label>
                  <Input
                    value={newKey}
                    onChange={(e) => { setNewKey(e.target.value); setNewKeyManual(true); }}
                    placeholder="自動生成"
                    className="font-mono text-sm h-9"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField(); } }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">データ型</Label>
                <div className="space-y-3">
                  {Object.entries(groupedTypes).map(([category, types]) => (
                    <div key={category}>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                        {categoryLabels[category as keyof typeof categoryLabels]}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {types.map(([type, config]) => {
                          const Icon = config.icon;
                          const isSelected = newType === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setNewType(type as CustomFieldType)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-all ${
                                isSelected
                                  ? 'border-sky-400 bg-sky-100 text-sky-800 dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-300 shadow-sm'
                                  : 'border-border bg-background text-muted-foreground hover:border-sky-300 hover:text-foreground'
                              }`}
                            >
                              <Icon className={`h-3 w-3 ${isSelected ? config.color : ''}`} />
                              {config.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {newType === 'select' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">選択肢（カンマ区切り）</Label>
                  <Input
                    value={newOptions}
                    onChange={(e) => setNewOptions(e.target.value)}
                    placeholder="例: S, M, L, XL"
                    className="h-9"
                  />
                  {newOptions && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {newOptions.split(',').map((o, i) => o.trim() && (
                        <Badge key={i} variant="secondary" className="text-xs">{o.trim()}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={addField}
                  disabled={!newLabel.trim() || !newKey.trim()}
                  className="btn-premium"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  追加する
                </Button>
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  キャンセル
                </Button>
              </div>
            </div>
          )}

          {/* 定義済みフィールド一覧 */}
          {schema.length > 0 ? (
            <div className="space-y-2">
              {schema.map((field) => {
                const config = fieldTypeConfig[field.type];
                const Icon = config.icon;
                return (
                  <div key={field.id} className="group flex items-center gap-3 rounded-lg border bg-background px-4 py-3 hover:shadow-sm transition-shadow">
                    <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                    <span className="text-sm font-medium flex-1">{field.label}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 h-5 gap-0.5">
                      <Code className="h-2.5 w-2.5 opacity-50" />
                      {field.key}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 h-5">
                      {config.label}
                    </Badge>
                    {field.options && (
                      <span className="text-[10px] text-muted-foreground">
                        {field.options.join(' / ')}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      onClick={() => removeField(field.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            !isAdding && (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full rounded-xl border-2 border-dashed border-muted-foreground/15 hover:border-sky-300 dark:hover:border-sky-800 py-8 text-center transition-colors group cursor-pointer"
              >
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20 group-hover:text-sky-400 transition-colors" />
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  フィールドを追加
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  素材・重量・産地など、全商品に共通で表示したい属性を定義できます
                </p>
              </button>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}

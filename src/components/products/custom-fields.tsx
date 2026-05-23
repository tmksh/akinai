'use client';

import { useState, useCallback } from 'react';
import {
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
  ListChecks,
  X,
  Phone,
  Upload,
  Loader2,
  FileText,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const RichTextEditor = dynamic(
  () => import('@/components/editor/rich-text-editor').then(m => m.RichTextEditor),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-muted rounded-md" /> }
);
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
// uploadContentImage の代わりに /api/upload-image ルートを使う（server action の File 送信が不安定なため）

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'rich_text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'url'
  | 'email'
  | 'phone'
  | 'color'
  | 'rating'
  | 'image_url'
  | 'image_url_list'
  | 'list'
  | 'select'
  | 'multi_select'
  | 'json';

export interface CustomField {
  id: string;
  key: string;
  label: string;
  value: string;
  type: CustomFieldType;
  options?: string[]; // select 型の選択肢
}

// image_url / image_url_list 共用：値を URL 配列にパースする
// - 空 → []
// - JSON 配列文字列 → そのまま
// - 単一 URL 文字列 → [url]
export function parseImageUrls(value: string | null | undefined): string[] {
  if (!value) return [];
  const trimmed = String(value).trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string' && v.length > 0);
    } catch {
      /* fallthrough */
    }
  }
  return [trimmed];
}

// image_url 用のシリアライズ：1枚はプレーン URL、2枚以上は JSON 配列文字列（後方互換）
export function serializeImageUrl(urls: string[]): string {
  const cleaned = urls.filter(u => typeof u === 'string' && u.length > 0);
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return cleaned[0];
  return JSON.stringify(cleaned);
}

// image_url の値から「先頭の URL」だけ取り出す（次画像表示用ヘルパー）
export function firstImageUrl(value: string | null | undefined): string {
  const list = parseImageUrls(value);
  return list[0] ?? '';
}

export interface SavedCustomField {
  key: string;
  label?: string;
  value: string;
  type: string;
  options?: string[];
}

export interface ProductFieldSchemaLike {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
}

export function defaultCustomFieldValue(type: CustomFieldType): string {
  if (type === 'boolean') return 'false';
  if (type === 'rating') return '0';
  if (type === 'list') return '[]';
  if (type === 'multi_select') return '[]';
  if (type === 'json') return '{}';
  return '';
}

/** 保存前に blob: URL 等を除去（image_url / image_url_list 用） */
export function sanitizeCustomFieldValue(type: CustomFieldType | string, value: string): string {
  if (type === 'image_url') {
    const urls = parseImageUrls(value).filter(u => !u.startsWith('blob:'));
    return serializeImageUrl(urls);
  }
  if (type === 'image_url_list') {
    const urls = parseImageUrls(value).filter(u => !u.startsWith('blob:'));
    return JSON.stringify(urls);
  }
  return value;
}

/**
 * 商品に保存済みのカスタムフィールド値と、組織スキーマ（型・ラベル・選択肢）をマージする。
 * 既存商品は保存時の type（例: textarea）が残っていることがあるため、
 * 表示・編集時はスキーマ定義の type を優先する。
 */
export function mergeProductCustomFieldsWithSchema(
  schema: ProductFieldSchemaLike[],
  savedFields: SavedCustomField[],
  options?: { excludeKeys?: string[] },
): CustomField[] {
  const exclude = new Set(options?.excludeKeys ?? ['_swatch_config']);
  const savedMap = new Map(
    savedFields.filter(f => !exclude.has(f.key)).map(f => [f.key, f]),
  );

  if (schema.length === 0) {
    return savedFields
      .filter(f => !exclude.has(f.key))
      .map((f, i) => ({
        id: `cf-${i}-${f.key}`,
        key: f.key,
        label: f.label || f.key,
        value: f.value,
        type: f.type as CustomFieldType,
        ...(f.options && { options: f.options }),
      }));
  }

  const schemaKeys = new Set(schema.map(s => s.key));
  const merged: CustomField[] = schema.map(s => ({
    id: `schema-${s.id}`,
    key: s.key,
    label: s.label,
    value: savedMap.get(s.key)?.value ?? defaultCustomFieldValue(s.type),
    type: s.type,
    ...(s.options && { options: s.options }),
  }));

  for (const saved of savedFields) {
    if (exclude.has(saved.key) || schemaKeys.has(saved.key)) continue;
    merged.push({
      id: `cf-extra-${saved.key}`,
      key: saved.key,
      label: saved.label || saved.key,
      value: saved.value,
      type: saved.type as CustomFieldType,
      ...(saved.options && { options: saved.options }),
    });
  }

  return merged;
}

interface FieldTypeInfo {
  label: string;
  icon: React.ElementType;
  placeholder: string;
  color: string;
  description: string;
  category: 'basic' | 'media' | 'advanced';
}

const fieldTypeConfig: Record<CustomFieldType, FieldTypeInfo> = {
  text:      { label: 'テキスト',         icon: Type,        placeholder: '値を入力',       color: 'text-blue-500',    description: '短いテキスト',             category: 'basic' },
  textarea:  { label: '長文テキスト',     icon: AlignLeft,   placeholder: '長い文章を入力',  color: 'text-blue-400',    description: '複数行のテキスト',         category: 'basic' },
  rich_text: { label: 'リッチテキスト',   icon: FileText,    placeholder: '',               color: 'text-purple-500',  description: 'ビジュアルHTMLエディタ',  category: 'basic' },
  number:    { label: '数値',         icon: Hash,        placeholder: '0',              color: 'text-emerald-500', description: '整数・小数',           category: 'basic' },
  boolean:   { label: '真偽値',       icon: ToggleLeft,  placeholder: '',               color: 'text-violet-500',  description: 'はい/いいえ',         category: 'basic' },
  select:    { label: '選択肢',       icon: ListFilter,  placeholder: '',               color: 'text-indigo-500',  description: 'ドロップダウン（1つ選択）', category: 'basic' },
  multi_select: { label: '複数選択',   icon: ListChecks,  placeholder: '',               color: 'text-orange-500',  description: 'タグ形式で複数選択',   category: 'basic' },
  date:      { label: '日付',         icon: Calendar,    placeholder: '',               color: 'text-sky-500',   description: '日付選択',             category: 'basic' },
  url:       { label: 'URL',          icon: Link2,       placeholder: 'https://',       color: 'text-cyan-500',    description: 'リンクURL',           category: 'media' },
  email:     { label: 'メール',       icon: Mail,        placeholder: 'example@mail.com', color: 'text-sky-500', description: 'メールアドレス',       category: 'media' },
  phone:     { label: '電話番号',     icon: Phone,       placeholder: '03-1234-5678',   color: 'text-teal-500',    description: '電話番号',             category: 'media' },
  image_url: { label: '画像',          icon: ImageIcon,   placeholder: 'https://...',    color: 'text-sky-500',  description: '画像アップロード（1枚）', category: 'media' },
  image_url_list: { label: '複数画像', icon: ImageIcon,   placeholder: 'https://...',    color: 'text-violet-500', description: '複数画像アップロード',  category: 'media' },
  color:     { label: 'カラー',       icon: Palette,     placeholder: '#000000',        color: 'text-pink-500',    description: 'カラーピッカー',       category: 'media' },
  rating:    { label: '評価',         icon: Star,        placeholder: '',               color: 'text-sky-500',  description: '1〜5の星評価',        category: 'advanced' },
  list:      { label: 'リスト',       icon: ListOrdered, placeholder: '項目を追加',      color: 'text-rose-500',    description: 'タグ形式のリスト',     category: 'advanced' },
  json:      { label: 'JSON',         icon: Braces,      placeholder: '{}',             color: 'text-slate-500',   description: '構造化データ',         category: 'advanced' },
};

const categoryLabels = {
  basic: '基本',
  media: 'メディア・連絡先',
  advanced: '高度',
};

/** ラベルから API キーを自動生成（英数字スネークケース） */
function generateKeyFromLabel(label: string): string {
  // よく使われる日本語→英語の簡易マッピング
  const map: Record<string, string> = {
    '素材': 'material', '材質': 'material', 'サイズ': 'size', '色': 'color',
    'カラー': 'color', '重量': 'weight', '重さ': 'weight', '幅': 'width',
    '高さ': 'height', '奥行': 'depth', '長さ': 'length', 'ブランド': 'brand',
    'メーカー': 'maker', '型番': 'model_number', '産地': 'origin', '原産地': 'origin',
    '容量': 'capacity', '数量': 'quantity', '賞味期限': 'expiry_date',
    '保証期間': 'warranty', '送料': 'shipping_fee', '備考': 'notes',
    '説明': 'description', 'タイトル': 'title', '名前': 'name',
    'リンク': 'link', '画像': 'image', '動画': 'video', 'URL': 'url',
  };

  const trimmed = label.trim();
  if (map[trimmed]) return map[trimmed];

  // 英数字のみ抽出してスネークケースに
  const ascii = trimmed
    .replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  // 英数字が取れなかった場合はタイムスタンプベースで生成
  return ascii || `field_${Date.now().toString(36)}`;
}

interface CustomFieldsProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  disabled?: boolean;
  allowAdd?: boolean;
  /** 画像アップロード先の organizationId（image_url フィールド用） */
  organizationId?: string;
}

export function CustomFields({ fields, onChange, disabled = false, allowAdd = true, organizationId }: CustomFieldsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldKeyManual, setNewFieldKeyManual] = useState(false);
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const handleLabelChange = (label: string) => {
    setNewFieldLabel(label);
    if (!newFieldKeyManual) {
      setNewFieldKey(generateKeyFromLabel(label));
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setNewFieldLabel('');
    setNewFieldKey('');
    setNewFieldKeyManual(false);
    setNewFieldType('text');
    setNewFieldOptions('');
  };

  const addField = () => {
    if (!newFieldLabel.trim() || !newFieldKey.trim()) return;

    if (fields.some((f) => f.key === newFieldKey.trim())) {
      alert('同じキーIDのフィールドが既に存在します');
      return;
    }

    // select / multi_select 型の場合は選択肢が必要
    if ((newFieldType === 'select' || newFieldType === 'multi_select') && !newFieldOptions.trim()) {
      alert('選択肢をカンマ区切りで入力してください');
      return;
    }

    let defaultValue = '';
    if (newFieldType === 'boolean') defaultValue = 'false';
    if (newFieldType === 'rating') defaultValue = '0';
    if (newFieldType === 'list') defaultValue = '[]';
    if (newFieldType === 'multi_select') defaultValue = '[]';
    if (newFieldType === 'json') defaultValue = '{}';

    const options = (newFieldType === 'select' || newFieldType === 'multi_select')
      ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean)
      : undefined;

    const newField: CustomField = {
      id: `cf-${Date.now()}`,
      key: newFieldKey.trim(),
      label: newFieldLabel.trim(),
      value: defaultValue,
      type: newFieldType,
      ...(options && { options }),
    };

    onChange([...fields, newField]);
    resetForm();
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  const updateFieldValue = (id: string, value: string) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, value } : f)));
  };

  // リスト型: アイテム追加
  const addListItem = (fieldId: string, items: string | string[]) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    const current: string[] = field.value ? JSON.parse(field.value) : [];
    const toAdd = Array.isArray(items) ? items : [items];
    const newItems = toAdd.map(i => i.trim()).filter(Boolean);
    if (newItems.length === 0) return;
    updateFieldValue(fieldId, JSON.stringify([...current, ...newItems]));
  };

  const removeListItem = (fieldId: string, index: number) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    const current: string[] = field.value ? JSON.parse(field.value) : [];
    current.splice(index, 1);
    updateFieldValue(fieldId, JSON.stringify(current));
  };

  const renderValueInput = (field: CustomField) => {
    const config = fieldTypeConfig[field.type] ?? fieldTypeConfig['text'];

    switch (field.type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-3 h-9">
            <Switch
              checked={field.value === 'true'}
              onCheckedChange={(checked) =>
                updateFieldValue(field.id, checked ? 'true' : 'false')
              }
              disabled={disabled}
            />
            <span className="text-sm">
              {field.value === 'true' ? 'はい' : 'いいえ'}
            </span>
          </div>
        );

      case 'textarea':
        return (
          <Textarea
            value={field.value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder={config.placeholder}
            disabled={disabled}
            rows={3}
            className="text-sm"
          />
        );

      case 'rich_text':
        return (
          <RichTextEditor
            content={field.value}
            onChange={(html) => updateFieldValue(field.id, html)}
            disabled={disabled}
            minHeight="200px"
            placeholder="ここに内容を入力..."
          />
        );

      case 'color':
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={field.value || '#000000'}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              disabled={disabled}
              className="h-9 w-9 rounded-md border border-input cursor-pointer appearance-none bg-transparent p-0.5"
            />
            <Input
              value={field.value}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder="#000000"
              disabled={disabled}
              className="flex-1 font-mono text-sm h-9"
            />
          </div>
        );

      case 'rating':
        return (
          <div className="flex items-center gap-1 h-9">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => updateFieldValue(field.id, String(star))}
                disabled={disabled}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-6 w-6 transition-colors ${
                    star <= parseInt(field.value || '0')
                      ? 'fill-sky-400 text-sky-400'
                      : 'text-slate-200 dark:text-slate-700'
                  }`}
                />
              </button>
            ))}
            <span className="text-sm text-muted-foreground ml-2">
              {field.value || '0'} / 5
            </span>
          </div>
        );

      case 'image_url':
        return (
          <ImageUploadField
            value={field.value}
            onChange={(url) => updateFieldValue(field.id, url)}
            disabled={disabled}
            organizationId={organizationId}
          />
        );

      case 'image_url_list':
        return (
          <ImageUrlListField
            value={field.value}
            onChange={(v) => updateFieldValue(field.id, v)}
            disabled={disabled}
            organizationId={organizationId}
          />
        );

      case 'select':
        return (
          <Select
            value={field.value}
            onValueChange={(v) => updateFieldValue(field.id, v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="選択してください" />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi_select':
        return (
          <MultiSelectChips
            options={field.options ?? []}
            value={field.value}
            onChange={(v) => updateFieldValue(field.id, v)}
            disabled={disabled}
          />
        );

      case 'list':
        return <ListInput fieldId={field.id} value={field.value} onAdd={addListItem} onRemove={removeListItem} disabled={disabled} />;

      case 'json':
        return (
          <Textarea
            value={field.value}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
            placeholder='{ "key": "value" }'
            disabled={disabled}
            rows={3}
            className="font-mono text-xs"
          />
        );

      case 'date':
        return (
          <Input type="date" value={field.value} onChange={(e) => updateFieldValue(field.id, e.target.value)} disabled={disabled} className="h-9" />
        );

      case 'number':
        return (
          <Input type="number" value={field.value} onChange={(e) => updateFieldValue(field.id, e.target.value)} placeholder={config.placeholder} disabled={disabled} className="h-9" />
        );

      case 'email':
        return (
          <Input type="email" value={field.value} onChange={(e) => updateFieldValue(field.id, e.target.value)} placeholder={config.placeholder} disabled={disabled} className="h-9" />
        );

      case 'phone':
        return (
          <Input type="tel" value={field.value} onChange={(e) => updateFieldValue(field.id, e.target.value)} placeholder={config.placeholder} disabled={disabled} className="h-9" />
        );

      case 'url':
        return (
          <Input type="url" value={field.value} onChange={(e) => updateFieldValue(field.id, e.target.value)} placeholder={config.placeholder} disabled={disabled} className="h-9" />
        );

      default:
        return (
          <Input value={field.value} onChange={(e) => updateFieldValue(field.id, e.target.value)} placeholder={config.placeholder} disabled={disabled} className="h-9" />
        );
    }
  };

  // カテゴリごとにグループ化した型一覧
  const groupedTypes = Object.entries(fieldTypeConfig).reduce<Record<string, [string, FieldTypeInfo][]>>((acc, entry) => {
    const cat = entry[1].category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(entry as [string, FieldTypeInfo]);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sky-500" />
              カスタムフィールド
            </CardTitle>
            <CardDescription>
              商品スキーマを自由に拡張できます
            </CardDescription>
          </div>
          {allowAdd && !isAdding && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(true)}
              disabled={disabled}
            >
              <Plus className="mr-2 h-4 w-4" />
              追加
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 新規フィールド追加フォーム */}
        {isAdding && (
          <div className="rounded-xl border-2 border-dashed border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/10 p-5 space-y-4">
            <p className="text-sm font-medium text-sky-700 dark:text-sky-400">
              新しいフィールドを定義
            </p>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">表示名</Label>
                  <Input
                    value={newFieldLabel}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    placeholder="例: 素材"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addField(); }
                    }}
                    autoFocus
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Code className="h-3 w-3" />
                    キーID（API用）
                  </Label>
                  <Input
                    value={newFieldKey}
                    onChange={(e) => { setNewFieldKey(e.target.value); setNewFieldKeyManual(true); }}
                    placeholder="自動生成"
                    className="font-mono text-sm h-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addField(); }
                    }}
                  />
                </div>
              </div>

              {/* データ型セレクター */}
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
                          const isSelected = newFieldType === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setNewFieldType(type as CustomFieldType)}
                              title={config.description}
                              className={`
                                flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-all
                                ${isSelected
                                  ? 'border-sky-400 bg-sky-100 text-sky-800 dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-300 shadow-sm'
                                  : 'border-border bg-background text-muted-foreground hover:border-sky-300 hover:text-foreground'
                                }
                              `}
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

              {/* select / multi_select 型の選択肢入力 */}
              {(newFieldType === 'select' || newFieldType === 'multi_select') && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">選択肢（カンマ区切り）</Label>
                  <Input
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    placeholder={newFieldType === 'multi_select' ? '例: 無添加, オーガニック, グルテンフリー' : '例: S, M, L, XL'}
                    className="h-9"
                  />
                  {newFieldOptions && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {newFieldOptions.split(',').map((o, i) => o.trim() && (
                        <Badge key={i} variant="secondary" className="text-xs">{o.trim()}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={addField}
                disabled={!newFieldLabel.trim() || !newFieldKey.trim()}
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

        {/* 既存フィールド一覧 */}
        {fields.length > 0 ? (
          <div className="space-y-2">
            {fields.map((field) => {
              const config = fieldTypeConfig[field.type] ?? fieldTypeConfig['text'];
              const Icon = config.icon;
              return (
                <div
                  key={field.id}
                  className="group rounded-lg border border-slate-200/90 bg-white shadow-sm hover:shadow-md hover:border-sky-300/70 transition-all dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-sky-700/50 dark:hover:bg-white/[0.05]"
                >
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
                    <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                    <span className="text-sm font-semibold flex-1 text-slate-800 dark:text-slate-100">{field.label}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 h-5 bg-slate-100 text-slate-600 border-slate-200 gap-0.5 dark:bg-white/5 dark:text-slate-300 dark:border-white/10">
                      <Code className="h-2.5 w-2.5 opacity-60" />
                      {field.key}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 bg-white/80 dark:bg-white/5">
                      {config.label}
                    </Badge>
                    {allowAdd && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                        onClick={() => removeField(field.id)}
                        disabled={disabled}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="px-4 pb-3 pt-2.5">
                    {renderValueInput(field)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !isAdding && allowAdd && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              disabled={disabled}
              className="w-full rounded-xl border-2 border-dashed border-muted-foreground/15 hover:border-sky-300 dark:hover:border-sky-800 py-8 text-center transition-colors group cursor-pointer"
            >
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20 group-hover:text-sky-400 transition-colors" />
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                カスタムフィールドを追加
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                素材・重量・産地など、自由な属性を定義できます
              </p>
            </button>
          )
        )}
      </CardContent>
    </Card>
  );
}

/** 複数選択型のチップUI */
function MultiSelectChips({
  options,
  value,
  onChange,
  disabled,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selected: string[] = (() => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
    } catch {
      return [];
    }
  })();

  const toggle = (option: string) => {
    const next = selected.includes(option)
      ? selected.filter((v) => v !== option)
      : [...selected, option];
    onChange(JSON.stringify(next));
  };

  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-2">
        選択肢が定義されていません
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              disabled={disabled}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs transition-all',
                isSelected
                  ? 'border-orange-400 bg-orange-500 text-white shadow-sm dark:border-orange-500 dark:bg-orange-600'
                  : 'border-border bg-background text-muted-foreground hover:border-orange-300 hover:text-foreground',
                disabled && 'opacity-60 cursor-not-allowed'
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-[11px] text-muted-foreground/70">
          {selected.length} 件選択中
        </p>
      )}
    </div>
  );
}

/** リスト型の入力コンポーネント */
function ListInput({
  fieldId,
  value,
  onAdd,
  onRemove,
  disabled,
}: {
  fieldId: string;
  value: string;
  onAdd: (fieldId: string, items: string | string[]) => void;
  onRemove: (fieldId: string, index: number) => void;
  disabled?: boolean;
}) {
  const [input, setInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const items: string[] = value ? JSON.parse(value) : [];

  const handleBulkAdd = () => {
    const newItems = bulkInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (newItems.length > 0) onAdd(fieldId, newItems);
    setBulkInput('');
    setShowBulk(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="項目を追加"
          disabled={disabled}
          className="h-9"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (input.trim()) {
                onAdd(fieldId, input);
                setInput('');
              }
            }
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (input.trim()) {
              onAdd(fieldId, input);
              setInput('');
            }
          }}
          disabled={disabled || !input.trim()}
          className="h-9 shrink-0"
        >
          追加
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowBulk((v) => !v)}
          disabled={disabled}
          className="h-9 shrink-0 text-muted-foreground"
        >
          一括
        </Button>
      </div>
      {showBulk && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-xs text-muted-foreground">改行またはカンマ区切りで複数入力</p>
          <Textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder={'無添加\nオーガニック\nグルテンフリー'}
            rows={5}
            className="text-sm"
            disabled={disabled}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleBulkAdd} disabled={!bulkInput.trim() || disabled}>
              一括追加
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowBulk(false); setBulkInput(''); }}>
              キャンセル
            </Button>
          </div>
        </div>
      )}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1">
              {item}
              <button
                type="button"
                onClick={() => onRemove(fieldId, i)}
                disabled={disabled}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 画像アップロードフィールド（ファイル選択 + ドラッグ&ドロップ）
// ─────────────────────────────────────────────────────────────────────────────
interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  organizationId?: string;
}

function ImageUploadField({ value, onChange, disabled, organizationId }: ImageUploadFieldProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urls = parseImageUrls(value);
  const setUrls = (next: string[]) => onChange(serializeImageUrl(next));

  const uploadOne = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) { setError('画像ファイルを選択してください'); return null; }
    if (file.size > 10 * 1024 * 1024) { setError('10MB 以下のファイルを選択してください'); return null; }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'contents');
    formData.append('folder', organizationId ? `products/${organizationId}` : 'products');
    const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'アップロードに失敗しました'); return null; }
    return data.url as string;
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setError(null);
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const f of arr) {
        const url = await uploadOne(f);
        if (url) uploaded.push(url);
      }
      if (uploaded.length > 0) {
        setUrls([...urls, ...uploaded]);
      }
    } catch {
      setError('アップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  }, [organizationId, urls]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const removeAt = (i: number) => setUrls(urls.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      {/* ドロップゾーン */}
      <label
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all cursor-pointer',
          isDragging
            ? 'border-sky-400 bg-sky-50/60 dark:bg-sky-950/20 scale-[1.01]'
            : 'border-border hover:border-sky-300 hover:bg-muted/20',
          disabled && 'opacity-50 cursor-not-allowed',
          urls.length > 0 ? 'p-2' : 'p-6'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={disabled || isUploading}
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ''; }}
        />

        {urls.length === 1 ? (
          /* ── 1枚のときは大きなプレビュー ── */
          <div className="relative group/preview w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urls[0]}
              alt="プレビュー"
              className="max-h-48 w-full object-contain rounded-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover/preview:opacity-100 transition-opacity">
              <div className="flex flex-col items-center gap-1 text-white">
                <Upload className="h-6 w-6" />
                <span className="text-xs font-medium">クリックまたはドラッグで追加・変更</span>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeAt(0); }}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center bg-black/60 text-white opacity-0 group-hover/preview:opacity-100 hover:bg-destructive transition-all"
              title="この画像を削除"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : urls.length > 1 ? (
          /* ── 複数枚のときはサムネイルグリッド ── */
          <div className="w-full">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
              {urls.map((u, i) => (
                <div
                  key={i}
                  className="relative group/thumb aspect-square rounded-lg overflow-hidden border border-border bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u}
                    alt={`画像${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeAt(i); }}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity"
                    title="この画像を削除"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                  <span className="absolute top-0.5 left-0.5 text-[9px] text-white/90 bg-black/50 rounded px-1 leading-tight">
                    {i + 1}
                  </span>
                </div>
              ))}
              {/* 追加スロット */}
              <div className="aspect-square rounded-lg border-2 border-dashed border-input bg-background/60 hover:border-sky-300 hover:bg-muted/30 flex flex-col items-center justify-center gap-0.5 text-muted-foreground transition-colors">
                <Plus className="h-4 w-4" />
                <span className="text-[10px]">追加</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-1.5 text-center">
              {urls.length}枚 ・ ドラッグ&ドロップで追加
            </p>
          </div>
        ) : (
          /* ── 空状態 ── */
          <div className="flex flex-col items-center gap-2 text-muted-foreground pointer-events-none">
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                <p className="text-xs">アップロード中...</p>
              </>
            ) : (
              <>
                <ImageIcon className={cn('h-8 w-8', isDragging ? 'text-sky-500' : 'opacity-30')} />
                <div className="text-center">
                  <p className="text-xs font-medium">クリックして画像を選択</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">またはここにドラッグ&ドロップ（複数 OK）</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-1">JPG / PNG / WEBP / GIF・10MB 以下</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* アップロード中オーバーレイ */}
        {isUploading && urls.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        )}
      </label>

      {/* URL 直接入力（折りたたみ） */}
      <details className="group">
        <summary className="cursor-pointer text-[11px] text-muted-foreground/60 hover:text-muted-foreground list-none flex items-center gap-1">
          <span className="group-open:hidden">▶ URLを直接入力{urls.length > 1 ? `（${urls.length}枚）` : ''}</span>
          <span className="hidden group-open:inline">▼ URLを直接入力</span>
        </summary>
        <div className="mt-1.5 space-y-1.5">
          {urls.length === 0 ? (
            <Input
              type="url"
              value=""
              onChange={(e) => { setUrls(e.target.value ? [e.target.value] : []); setError(null); }}
              placeholder="https://example.com/image.jpg"
              disabled={disabled}
              className="h-8 text-xs"
            />
          ) : (
            urls.map((u, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-[10px] text-muted-foreground w-5 shrink-0">{i + 1}</span>
                <Input
                  type="url"
                  value={u}
                  onChange={(e) => {
                    const next = [...urls];
                    next[i] = e.target.value;
                    setUrls(next);
                    setError(null);
                  }}
                  placeholder="https://example.com/image.jpg"
                  disabled={disabled}
                  className="h-8 text-xs flex-1 min-w-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAt(i)}
                  className="h-8 px-2 text-muted-foreground hover:text-destructive shrink-0"
                  title="削除"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
          {urls.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUrls([...urls, ''])}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3 mr-1" />
              URL を追加
            </Button>
          )}
        </div>
      </details>

      {/* エラー */}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 複数画像フィールド（image_url_list 型）
// value は JSON 配列文字列: ["url1", "url2", ...]
// ─────────────────────────────────────────────────────────────────────────────
interface ImageUrlListFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  organizationId?: string;
}

function ImageUrlListField({ value, onChange, disabled, organizationId }: ImageUrlListFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const urls: string[] = (() => {
    if (!value) return [];
    try { const p = JSON.parse(value); return Array.isArray(p) ? p : []; }
    catch { return value ? [value] : []; }
  })();

  const setUrls = (next: string[]) => onChange(JSON.stringify(next));

  const handleFile = useCallback(async (file: File, replaceIndex?: number) => {
    if (!file.type.startsWith('image/')) { setError('画像ファイルを選択してください'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('10MB 以下のファイルを選択してください'); return; }
    setError(null);
    setIsUploading(true);
    setUploadingIndex(replaceIndex ?? null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'contents');
      formData.append('folder', organizationId ? `products/${organizationId}` : 'products');
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'アップロードに失敗しました');
      } else {
        if (replaceIndex !== undefined) {
          const next = [...urls];
          next[replaceIndex] = data.url;
          setUrls(next);
        } else {
          setUrls([...urls, data.url]);
        }
      }
    } catch {
      setError('アップロードに失敗しました');
    } finally {
      setIsUploading(false);
      setUploadingIndex(null);
    }
  }, [organizationId, urls]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeUrl = (index: number) => {
    const next = urls.filter((_, i) => i !== index);
    setUrls(next);
  };

  const moveUrl = (from: number, to: number) => {
    if (to < 0 || to >= urls.length) return;
    const next = [...urls];
    [next[from], next[to]] = [next[to], next[from]];
    setUrls(next);
  };

  return (
    <div className="space-y-3">
      {/* 既存画像グリッド */}
      {urls.length > 0 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
          {urls.map((url, i) => (
            <div key={i} className="group relative rounded-lg overflow-hidden border border-border aspect-square bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`画像 ${i + 1}`} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />

              {/* アップロード中オーバーレイ */}
              {uploadingIndex === i && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                </div>
              )}

              {/* ホバーオーバーレイ */}
              {!disabled && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                  {/* 差し替え */}
                  <label className="cursor-pointer rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-white transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, i); }} />
                    差し替え
                  </label>
                  <div className="flex gap-1">
                    {i > 0 && (
                      <button type="button" onClick={() => moveUrl(i, i - 1)} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-white">←</button>
                    )}
                    {i < urls.length - 1 && (
                      <button type="button" onClick={() => moveUrl(i, i + 1)} className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-white">→</button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUrl(i)}
                    className="rounded-full bg-red-500/90 p-0.5 text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              {/* 番号バッジ */}
              <span className="absolute top-1 left-1 text-[9px] font-bold bg-black/50 text-white rounded px-1 leading-4">{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {/* 追加エリア */}
      {!disabled && (
        <label
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all cursor-pointer p-4',
            isUploading && uploadingIndex === null
              ? 'border-sky-400 bg-sky-50/60'
              : 'border-border hover:border-sky-300 hover:bg-muted/20'
          )}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={isUploading}
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              for (const f of files) await handleFile(f);
              e.target.value = '';
            }}
          />
          {isUploading && uploadingIndex === null ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
              <p className="text-xs text-muted-foreground">アップロード中...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-6 w-6 opacity-30" />
              <div className="text-center">
                <p className="text-xs font-medium">クリックして画像を追加</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">複数ファイル同時選択可</p>
              </div>
            </>
          )}
        </label>
      )}

      {/* URL 直接入力 */}
      <details className="group">
        <summary className="cursor-pointer text-[11px] text-muted-foreground/60 hover:text-muted-foreground list-none flex items-center gap-1">
          <span className="group-open:hidden">▶ URLを直接追加</span>
          <span className="hidden group-open:inline">▼ URLを直接追加</span>
        </summary>
        <DirectUrlInput onAdd={(url) => { if (url && !urls.includes(url)) setUrls([...urls, url]); }} disabled={disabled} />
      </details>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function DirectUrlInput({ onAdd, disabled }: { onAdd: (url: string) => void; disabled?: boolean }) {
  const [url, setUrl] = useState('');
  return (
    <div className="mt-1.5 flex gap-2">
      <Input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/image.jpg"
        disabled={disabled}
        className="h-8 text-xs"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (url.trim()) { onAdd(url.trim()); setUrl(''); } } }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0"
        disabled={disabled || !url.trim()}
        onClick={() => { if (url.trim()) { onAdd(url.trim()); setUrl(''); } }}
      >
        追加
      </Button>
    </div>
  );
}

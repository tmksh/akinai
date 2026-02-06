'use client';

import { useState } from 'react';
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
  X,
  Phone,
} from 'lucide-react';
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

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'url'
  | 'email'
  | 'phone'
  | 'color'
  | 'rating'
  | 'image_url'
  | 'list'
  | 'select'
  | 'json';

export interface CustomField {
  id: string;
  key: string;
  label: string;
  value: string;
  type: CustomFieldType;
  options?: string[]; // select 型の選択肢
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
  text:      { label: 'テキスト',     icon: Type,        placeholder: '値を入力',       color: 'text-blue-500',    description: '短いテキスト',         category: 'basic' },
  textarea:  { label: '長文テキスト', icon: AlignLeft,   placeholder: '長い文章を入力',  color: 'text-blue-400',    description: '複数行のテキスト',     category: 'basic' },
  number:    { label: '数値',         icon: Hash,        placeholder: '0',              color: 'text-emerald-500', description: '整数・小数',           category: 'basic' },
  boolean:   { label: '真偽値',       icon: ToggleLeft,  placeholder: '',               color: 'text-violet-500',  description: 'はい/いいえ',         category: 'basic' },
  select:    { label: '選択肢',       icon: ListFilter,  placeholder: '',               color: 'text-indigo-500',  description: 'ドロップダウン',       category: 'basic' },
  date:      { label: '日付',         icon: Calendar,    placeholder: '',               color: 'text-amber-500',   description: '日付選択',             category: 'basic' },
  url:       { label: 'URL',          icon: Link2,       placeholder: 'https://',       color: 'text-cyan-500',    description: 'リンクURL',           category: 'media' },
  email:     { label: 'メール',       icon: Mail,        placeholder: 'example@mail.com', color: 'text-sky-500', description: 'メールアドレス',       category: 'media' },
  phone:     { label: '電話番号',     icon: Phone,       placeholder: '03-1234-5678',   color: 'text-teal-500',    description: '電話番号',             category: 'media' },
  image_url: { label: '画像URL',      icon: ImageIcon,   placeholder: 'https://...',    color: 'text-orange-500',  description: '画像プレビュー付き',   category: 'media' },
  color:     { label: 'カラー',       icon: Palette,     placeholder: '#000000',        color: 'text-pink-500',    description: 'カラーピッカー',       category: 'media' },
  rating:    { label: '評価',         icon: Star,        placeholder: '',               color: 'text-yellow-500',  description: '1〜5の星評価',        category: 'advanced' },
  list:      { label: 'リスト',       icon: ListOrdered, placeholder: '項目を追加',      color: 'text-rose-500',    description: 'タグ形式のリスト',     category: 'advanced' },
  json:      { label: 'JSON',         icon: Braces,      placeholder: '{}',             color: 'text-slate-500',   description: '構造化データ',         category: 'advanced' },
};

const categoryLabels = {
  basic: '基本',
  media: 'メディア・連絡先',
  advanced: '高度',
};

/** ラベルから API キーを自動生成 */
function generateKeyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

interface CustomFieldsProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
  disabled?: boolean;
}

export function CustomFields({ fields, onChange, disabled = false }: CustomFieldsProps) {
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

    // select 型の場合は選択肢が必要
    if (newFieldType === 'select' && !newFieldOptions.trim()) {
      alert('選択肢をカンマ区切りで入力してください');
      return;
    }

    let defaultValue = '';
    if (newFieldType === 'boolean') defaultValue = 'false';
    if (newFieldType === 'rating') defaultValue = '0';
    if (newFieldType === 'list') defaultValue = '[]';
    if (newFieldType === 'json') defaultValue = '{}';

    const options = newFieldType === 'select'
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
  const addListItem = (fieldId: string, item: string) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || !item.trim()) return;
    const current: string[] = field.value ? JSON.parse(field.value) : [];
    updateFieldValue(fieldId, JSON.stringify([...current, item.trim()]));
  };

  const removeListItem = (fieldId: string, index: number) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field) return;
    const current: string[] = field.value ? JSON.parse(field.value) : [];
    current.splice(index, 1);
    updateFieldValue(fieldId, JSON.stringify(current));
  };

  const renderValueInput = (field: CustomField) => {
    const config = fieldTypeConfig[field.type];

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
                      ? 'fill-amber-400 text-amber-400'
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
          <div className="space-y-2">
            <Input
              type="url"
              value={field.value}
              onChange={(e) => updateFieldValue(field.id, e.target.value)}
              placeholder={config.placeholder}
              disabled={disabled}
              className="h-9"
            />
            {field.value && (
              <div className="rounded-lg border overflow-hidden bg-muted/30 w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={field.value}
                  alt="プレビュー"
                  className="max-h-24 max-w-48 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
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
              <Sparkles className="h-5 w-5 text-orange-500" />
              カスタムフィールド
            </CardTitle>
            <CardDescription>
              商品スキーマを自由に拡張できます
            </CardDescription>
          </div>
          {!isAdding && (
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
          <div className="rounded-xl border-2 border-dashed border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/10 p-5 space-y-4">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
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
                                  ? 'border-orange-400 bg-orange-100 text-orange-800 dark:border-orange-600 dark:bg-orange-950/40 dark:text-orange-300 shadow-sm'
                                  : 'border-border bg-background text-muted-foreground hover:border-orange-300 hover:text-foreground'
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

              {/* select 型の選択肢入力 */}
              {newFieldType === 'select' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">選択肢（カンマ区切り）</Label>
                  <Input
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    placeholder="例: S, M, L, XL"
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
              const config = fieldTypeConfig[field.type];
              const Icon = config.icon;
              return (
                <div
                  key={field.id}
                  className="group rounded-lg border bg-background hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                    <span className="text-sm font-medium flex-1">{field.label}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 h-5 bg-muted">
                      {field.key}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] px-1.5 h-5">
                      {config.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                      onClick={() => removeField(field.id)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="px-4 pb-3 pt-1">
                    {renderValueInput(field)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              disabled={disabled}
              className="w-full rounded-xl border-2 border-dashed border-muted-foreground/15 hover:border-orange-300 dark:hover:border-orange-800 py-8 text-center transition-colors group cursor-pointer"
            >
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20 group-hover:text-orange-400 transition-colors" />
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
  onAdd: (fieldId: string, item: string) => void;
  onRemove: (fieldId: string, index: number) => void;
  disabled?: boolean;
}) {
  const [input, setInput] = useState('');
  const items: string[] = value ? JSON.parse(value) : [];

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
      </div>
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

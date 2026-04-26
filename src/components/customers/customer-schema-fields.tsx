'use client';

import Link from 'next/link';
import { Sparkles, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { CustomerFieldSchemaItem } from '@/components/providers/organization-provider';

type CustomerRole = 'personal' | 'buyer' | 'supplier';

const ROLE_LABELS: Record<CustomerRole, string> = {
  personal: '個人会員',
  buyer: 'バイヤー',
  supplier: 'サプライヤー',
};

interface CustomerSchemaFieldsProps {
  schema: CustomerFieldSchemaItem[];
  role: CustomerRole;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  disabled?: boolean;
}

/**
 * org の customerFieldSchema に基づき、会員種別でフィルタリングして入力フォームを表示する。
 * roles が未指定（空 or undefined）のフィールドは全会員種別に表示。
 * スキーマが空の場合は設定へ誘導するメッセージを表示する。
 */
export function CustomerSchemaFields({
  schema,
  role,
  values,
  onChange,
  disabled = false,
}: CustomerSchemaFieldsProps) {
  const visibleFields = schema.filter((field) => {
    if (!field.roles || field.roles.length === 0) return true;
    return field.roles.includes(role);
  });

  const setValue = (key: string, value: string) => {
    onChange({ ...values, [key]: value });
  };

  const getMultiselectValues = (key: string): string[] => {
    const raw = values[key];
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  };

  const toggleMultiselect = (key: string, option: string) => {
    const current = getMultiselectValues(key);
    const next = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    setValue(key, JSON.stringify(next));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-sky-500" />
            カスタムフィールド
            {visibleFields.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                （{ROLE_LABELS[role]}）
              </span>
            )}
          </CardTitle>
          <Link
            href="/settings/customers"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <Settings className="h-3 w-3" />
            フィールドを設定
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {visibleFields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center rounded-lg border-2 border-dashed border-muted-foreground/15">
            <Sparkles className="h-7 w-7 text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">
              {schema.length === 0
                ? 'カスタムフィールドが設定されていません'
                : `${ROLE_LABELS[role]}向けのフィールドがありません`}
            </p>
            <Link
              href="/settings/customers"
              className="mt-2 text-xs text-sky-500 hover:underline"
            >
              設定ページで追加する →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-sm">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>

                {field.type === 'text' && (
                  <Input
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    placeholder={field.placeholder ?? ''}
                    disabled={disabled}
                    className="h-9"
                  />
                )}

                {field.type === 'textarea' && (
                  <Textarea
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    placeholder={field.placeholder ?? ''}
                    disabled={disabled}
                    rows={3}
                    className="text-sm"
                  />
                )}

                {field.type === 'number' && (
                  <Input
                    type="number"
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    placeholder={field.placeholder ?? '0'}
                    disabled={disabled}
                    className="h-9"
                  />
                )}

                {field.type === 'boolean' && (
                  <div className="flex items-center gap-3 h-9">
                    <Switch
                      checked={values[field.key] === 'true'}
                      onCheckedChange={(checked) => setValue(field.key, checked ? 'true' : 'false')}
                      disabled={disabled}
                    />
                    <span className="text-sm text-muted-foreground">
                      {values[field.key] === 'true' ? 'はい' : 'いいえ'}
                    </span>
                  </div>
                )}

                {field.type === 'select' && (
                  <Select
                    value={values[field.key] ?? ''}
                    onValueChange={(v) => setValue(field.key, v)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={field.placeholder ?? '選択してください'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {field.type === 'multiselect' && (
                  <div className="flex flex-wrap gap-2">
                    {(field.options ?? []).map((opt) => {
                      const selected = getMultiselectValues(field.key).includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleMultiselect(field.key, opt)}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            selected
                              ? 'bg-sky-500 text-white border-sky-500'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                    {getMultiselectValues(field.key).length > 0 && (
                      <div className="w-full flex flex-wrap gap-1 mt-1">
                        {getMultiselectValues(field.key).map((v) => (
                          <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

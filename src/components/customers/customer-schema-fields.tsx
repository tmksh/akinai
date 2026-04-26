'use client';

import { Sparkles } from 'lucide-react';
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

  if (visibleFields.length === 0) return null;

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
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-sky-500" />
          カスタムフィールド
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}

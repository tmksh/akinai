'use client';

import { useState, useTransition, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Loader2, Building2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useOrganization } from '@/components/providers/organization-provider';
import { updateAgentFieldSchema } from '@/lib/actions/settings';
import type { AgentFieldSchemaItem } from '@/components/providers/organization-provider';
import { toast } from 'sonner';

const FIELD_TYPES = [
  { value: 'text', label: 'テキスト' },
  { value: 'textarea', label: 'テキストエリア' },
  { value: 'number', label: '数値' },
  { value: 'select', label: '選択肢' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'メールアドレス' },
  { value: 'phone', label: '電話番号' },
] as const;

function generateId() {
  return `field_${Math.random().toString(36).slice(2, 10)}`;
}

function autoKey(label: string): string {
  const map: Record<string, string> = {
    '担当エリア': 'area', 'エリア': 'area', '地域': 'region',
    '契約種別': 'contract_type', '契約': 'contract',
    '担当者': 'contact_person', '業種': 'industry',
    '備考': 'notes', 'メモ': 'memo', 'URL': 'url',
    'ウェブサイト': 'website', '紹介コード': 'referral_code',
    'ランク': 'rank', '等級': 'grade',
  };
  const trimmed = label.trim();
  if (map[trimmed]) return map[trimmed];
  const ascii = trimmed
    .replace(/[A-Z]/g, c => '_' + c.toLowerCase())
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return ascii || `field_${Date.now().toString(36)}`;
}

export default function AgentsSchemaPage() {
  const { organization, refetch } = useOrganization();
  const [fields, setFields] = useState<AgentFieldSchemaItem[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (organization?.agentFieldSchema) {
      setFields(organization.agentFieldSchema);
    }
  }, [organization?.agentFieldSchema]);

  const addField = () => {
    setFields(prev => [...prev, {
      id: generateId(), key: '', label: '', type: 'text', required: false,
    }]);
  };

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<AgentFieldSchemaItem>) => {
    setFields(prev => prev.map(f => {
      if (f.id !== id) return f;
      // ラベルが変わり、かつキーがまだ空 or 自動生成のままなら自動更新
      if (updates.label !== undefined && !updates.key) {
        const currentAutoKey = autoKey(f.label);
        const shouldAutoUpdate = !f.key || f.key === currentAutoKey;
        if (shouldAutoUpdate) {
          return { ...f, ...updates, key: autoKey(updates.label) };
        }
      }
      return { ...f, ...updates };
    }));
  };

  const handleSave = () => {
    if (!organization?.id) return;

    for (const f of fields) {
      if (!f.label.trim()) {
        toast.error('ラベルを入力してください');
        return;
      }
      if (!f.key.trim()) {
        toast.error('フィールドキーを入力してください');
        return;
      }
    }

    startTransition(async () => {
      const result = await updateAgentFieldSchema(organization.id, fields);
      if (result.error) {
        toast.error(`保存に失敗しました: ${result.error}`);
      } else {
        toast.success('保存しました');
        await refetch();
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-sky-500" />
              代理店カスタムフィールド
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              代理店登録・編集フォームに表示する追加フィールドを定義します
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          保存
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">フィールド一覧</CardTitle>
          <CardDescription>
            定義したフィールドは代理店の登録・編集ダイアログに「追加情報」として表示されます
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              フィールドがありません。「フィールドを追加」で作成してください。
            </div>
          )}

          {fields.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">フィールド {index + 1}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeField(field.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">ラベル <span className="text-destructive">*</span></Label>
                  <Input placeholder="例: 担当エリア" value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">フィールドキー <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="自動生成"
                    value={field.key}
                    onChange={(e) => updateField(field.id, { key: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">タイプ</Label>
                  <Select value={field.type} onValueChange={(v) => updateField(field.id, { type: v as AgentFieldSchemaItem['type'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">必須</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch checked={field.required ?? false}
                      onCheckedChange={(v) => updateField(field.id, { required: v })} />
                    <span className="text-sm text-muted-foreground">{field.required ? '必須' : '任意'}</span>
                  </div>
                </div>
              </div>

              {field.type === 'select' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">選択肢（改行区切り）</Label>
                  <textarea
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={3}
                    placeholder="選択肢1&#10;選択肢2&#10;選択肢3"
                    value={(field.options ?? []).join('\n')}
                    onChange={(e) => updateField(field.id, { options: e.target.value.split('\n').filter(Boolean) })}
                  />
                </div>
              )}
            </div>
          ))}

          <Separator />
          <Button variant="outline" className="w-full" onClick={addField}>
            <Plus className="mr-2 h-4 w-4" />
            フィールドを追加
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useTransition, useEffect } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Type, AlignLeft, Hash, ToggleLeft, ListFilter, Users, Info, Code, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useOrganization } from '@/components/providers/organization-provider';
import type { CustomerFieldSchemaItem } from '@/components/providers/organization-provider';
import { updateCustomerFieldSchema } from '@/lib/actions/settings';
import { toast } from 'sonner';

type FieldType = CustomerFieldSchemaItem['type'];
type CustomerRole = 'personal' | 'buyer' | 'supplier';

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'text',        label: 'テキスト',     icon: Type,       color: 'text-blue-500' },
  { type: 'textarea',    label: '長文テキスト', icon: AlignLeft,  color: 'text-blue-400' },
  { type: 'number',      label: '数値',         icon: Hash,       color: 'text-emerald-500' },
  { type: 'boolean',     label: 'チェック',     icon: ToggleLeft, color: 'text-violet-500' },
  { type: 'select',      label: '単一選択',     icon: ListFilter, color: 'text-indigo-500' },
  { type: 'multiselect', label: '複数選択',     icon: ListFilter, color: 'text-sky-500' },
];

type RoleTab = 'all' | CustomerRole;

const ROLE_TABS: { key: RoleTab; label: string }[] = [
  { key: 'all',      label: '全員共通' },
  { key: 'personal', label: '個人会員' },
  { key: 'buyer',    label: 'バイヤー' },
  { key: 'supplier', label: 'サプライヤー' },
];

function generateKeyFromLabel(label: string): string {
  const map: Record<string, string> = {
    '業種': 'industry', '職種': 'job_type', '会社規模': 'company_size',
    '担当者': 'contact_person', '部署': 'department', '産地': 'origin',
    '資格': 'certification', '備考': 'notes', '紹介者': 'referrer',
  };
  const trimmed = label.trim();
  if (map[trimmed]) return map[trimmed];
  const ascii = trimmed
    .replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return ascii || `field_${Date.now().toString(36)}`;
}

// タブに対応するフィールドを抽出
function getFieldsForTab(schema: CustomerFieldSchemaItem[], tab: RoleTab): CustomerFieldSchemaItem[] {
  if (tab === 'all') return schema.filter(f => !f.roles || f.roles.length === 0);
  return schema.filter(f => f.roles && f.roles.length === 1 && f.roles[0] === tab);
}

// スキーマ全体を更新（特定タブのフィールドを差し替え）
function replaceTabFields(
  schema: CustomerFieldSchemaItem[],
  tab: RoleTab,
  newFields: CustomerFieldSchemaItem[]
): CustomerFieldSchemaItem[] {
  const unchanged = schema.filter(f => {
    if (tab === 'all') return f.roles && f.roles.length > 0;
    return !(f.roles && f.roles.length === 1 && f.roles[0] === tab);
  });
  return [...unchanged, ...newFields];
}

interface FieldEditorProps {
  fields: CustomerFieldSchemaItem[];
  onChange: (fields: CustomerFieldSchemaItem[]) => void;
  role: RoleTab;
  allKeys: string[]; // 他タブのキーも含めた重複チェック用
}

function FieldEditor({ fields, onChange, role, allKeys }: FieldEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newKeyManual, setNewKeyManual] = useState(false);
  const [newType, setNewType] = useState<FieldType>('text');
  const [newOptions, setNewOptions] = useState('');
  const [newRequired, setNewRequired] = useState(false);
  const [newPlaceholder, setNewPlaceholder] = useState('');

  const handleLabelChange = (label: string) => {
    setNewLabel(label);
    if (!newKeyManual) setNewKey(generateKeyFromLabel(label));
  };

  const resetForm = () => {
    setIsAdding(false);
    setNewLabel(''); setNewKey(''); setNewKeyManual(false);
    setNewType('text'); setNewOptions(''); setNewRequired(false); setNewPlaceholder('');
  };

  const addField = () => {
    if (!newLabel.trim() || !newKey.trim()) return;
    if (allKeys.includes(newKey.trim())) {
      toast.error('同じキーIDのフィールドが既に存在します');
      return;
    }
    if ((newType === 'select' || newType === 'multiselect') && !newOptions.trim()) {
      toast.error('選択肢をカンマ区切りで入力してください');
      return;
    }
    const options = (newType === 'select' || newType === 'multiselect')
      ? newOptions.split(',').map(o => o.trim()).filter(Boolean)
      : undefined;

    const newItem: CustomerFieldSchemaItem = {
      id: `cf-${Date.now()}`,
      key: newKey.trim(),
      label: newLabel.trim(),
      type: newType,
      ...(options && { options }),
      ...(newRequired && { required: true }),
      ...(newPlaceholder.trim() && { placeholder: newPlaceholder.trim() }),
      ...(role !== 'all' && { roles: [role] }),
    };
    onChange([...fields, newItem]);
    resetForm();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CardDescription>
          {role === 'all' ? '全会員種別に表示されるフィールドを定義します' : `${ROLE_TABS.find(t => t.key === role)?.label}のみに表示されるフィールドを定義します`}
        </CardDescription>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />追加
          </Button>
        )}
      </div>

      {/* 新規追加フォーム */}
      {isAdding && (
        <div className="rounded-xl border-2 border-dashed border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/10 p-5 space-y-4">
          <p className="text-sm font-medium text-sky-700 dark:text-sky-400">新しいフィールドを定義</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">表示名</Label>
              <Input
                value={newLabel}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="例: 担当者名"
                autoFocus
                className="h-9"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField(); } }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Code className="h-3 w-3" />キーID（API用）
              </Label>
              <Input
                value={newKey}
                onChange={(e) => { setNewKey(e.target.value); setNewKeyManual(true); }}
                placeholder="自動生成"
                className="font-mono text-sm h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">プレースホルダー（省略可）</Label>
            <Input
              value={newPlaceholder}
              onChange={(e) => setNewPlaceholder(e.target.value)}
              placeholder="例: 入力してください"
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">データ型</Label>
            <div className="flex flex-wrap gap-1.5">
              {FIELD_TYPES.map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setNewType(type)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-all ${
                    newType === type
                      ? 'border-sky-400 bg-sky-100 text-sky-800 dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-300 shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:border-sky-300 hover:text-foreground'
                  }`}
                >
                  <Icon className={`h-3 w-3 ${newType === type ? color : ''}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(newType === 'select' || newType === 'multiselect') && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">選択肢（カンマ区切り）</Label>
              <Input
                value={newOptions}
                onChange={(e) => setNewOptions(e.target.value)}
                placeholder="例: 飲食店, 小売店, ホテル"
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="newRequired"
              checked={newRequired}
              onChange={(e) => setNewRequired(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="newRequired" className="text-xs text-muted-foreground cursor-pointer">必須項目にする</Label>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={addField} disabled={!newLabel.trim() || !newKey.trim()}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />追加する
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>キャンセル</Button>
          </div>
        </div>
      )}

      {/* フィールド一覧 */}
      {fields.length > 0 ? (
        <div className="space-y-2">
          {fields.map((field) => {
            const typeConfig = FIELD_TYPES.find(t => t.type === field.type) ?? FIELD_TYPES[0];
            const Icon = typeConfig.icon;
            return (
              <div key={field.id} className="group flex items-center gap-3 rounded-lg border bg-background px-4 py-3 hover:shadow-sm transition-shadow">
                <Icon className={`h-4 w-4 shrink-0 ${typeConfig.color}`} />
                <span className="text-sm font-medium flex-1">{field.label}</span>
                {field.required && (
                  <Badge className="text-[10px] bg-red-50 text-red-600 border-red-200 px-1.5 h-5">必須</Badge>
                )}
                <Badge variant="secondary" className="text-[10px] font-mono px-1.5 h-5 gap-0.5">
                  <Code className="h-2.5 w-2.5 opacity-50" />{field.key}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 h-5">{typeConfig.label}</Badge>
                {field.options && (
                  <span className="text-[10px] text-muted-foreground hidden sm:block">{field.options.join(' / ')}</span>
                )}
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  onClick={() => onChange(fields.filter(f => f.id !== field.id))}
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
            <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">フィールドを追加</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {role === 'all' ? '全会員種別に共通で表示されるフィールドを定義できます' : `${ROLE_TABS.find(t => t.key === role)?.label}だけに表示されるフィールドを定義できます`}
            </p>
          </button>
        )
      )}
    </div>
  );
}

export default function CustomerSchemaSettingsPage() {
  const { organization, refetch } = useOrganization();
  const [isPending, startTransition] = useTransition();
  const [schema, setSchema] = useState<CustomerFieldSchemaItem[]>(
    () => organization?.customerFieldSchema ?? []
  );
  const [activeTab, setActiveTab] = useState<RoleTab>('all');

  useEffect(() => {
    if (organization?.customerFieldSchema) {
      setSchema(organization.customerFieldSchema);
    }
  }, [organization?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const allKeys = schema.map(f => f.key);

  const updateTab = (tab: RoleTab, fields: CustomerFieldSchemaItem[]) => {
    setSchema(prev => replaceTabFields(prev, tab, fields));
  };

  const handleSave = () => {
    if (!organization?.id) {
      toast.error('組織情報が読み込まれていません');
      return;
    }
    startTransition(async () => {
      const { error } = await updateCustomerFieldSchema(organization.id, schema);
      if (error) {
        toast.error('保存に失敗しました: ' + error);
      } else {
        toast.success('顧客フィールドを保存しました');
        await refetch();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/customers">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">顧客カスタムフィールド</h1>
          <p className="text-muted-foreground">会員種別ごとにカスタムフィールドを定義します</p>
        </div>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />保存中...
            </span>
          ) : (
            <span className="flex items-center gap-2"><Save className="h-4 w-4" />保存</span>
          )}
        </Button>
      </div>

      {/* 説明 */}
      <Card className="border-sky-200 bg-sky-50/50 dark:border-sky-900/50 dark:bg-sky-950/10">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
            <div className="text-sm text-sky-700 dark:text-sky-300 space-y-1">
              <p className="font-medium">会員種別ごとに独立したカスタムフィールドを設定できます</p>
              <p className="text-sky-600/80 dark:text-sky-400/80">
                「全員共通」タブのフィールドは全会員種別に表示されます。各種別タブで追加したフィールドはその会員種別のみに表示されます。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 会員種別タブ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-500" />
            フィールド定義
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RoleTab)}>
            <TabsList className="flex-wrap h-auto gap-1 mb-6">
              {ROLE_TABS.map(({ key, label }) => {
                const count = getFieldsForTab(schema, key).length;
                const Icon = key === 'all' ? Users : undefined;
                return (
                  <TabsTrigger key={key} value={key} className="gap-1.5">
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {label}
                    {count > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-0.5">{count}</Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {ROLE_TABS.map(({ key }) => (
              <TabsContent key={key} value={key}>
                <FieldEditor
                  fields={getFieldsForTab(schema, key)}
                  onChange={(fields) => updateTab(key, fields)}
                  role={key}
                  allKeys={allKeys.filter(k => !getFieldsForTab(schema, key).some(f => f.key === k))}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Building2, User, Mail, Phone, MapPin, Percent, Loader2, Plus, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useOrganization } from '@/components/providers/organization-provider';
import type { AgentDisplay } from '../types';
import { toast } from 'sonner';

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: AgentDisplay | null;
  onSubmit: (data: AgentFormData) => Promise<void>;
}

export interface AgentFormData {
  code: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  commissionRate: number;
  status: AgentDisplay['status'];
  customFields: Record<string, string>;
}

type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'url' | 'email' | 'phone';

interface ExtraField {
  id: string;
  label: string;
  key: string;
  value: string;
  type: FieldType;
  options: string[];
}

function autoKeyFromLabel(label: string): string {
  const raw = label.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return raw || `field_${Date.now().toString(36)}`;
}

function renderFieldInput(
  ef: ExtraField,
  onChange: (value: string) => void
) {
  if (ef.type === 'boolean') {
    return (
      <div className="flex items-center gap-2 h-9">
        <Switch checked={ef.value === 'true'} onCheckedChange={(v) => onChange(v ? 'true' : 'false')} />
        <span className="text-sm text-muted-foreground">{ef.value === 'true' ? 'ON' : 'OFF'}</span>
      </div>
    );
  }
  if (ef.type === 'select') {
    return (
      <Select value={ef.value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
        <SelectContent>
          {ef.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  if (ef.type === 'textarea') {
    return (
      <Textarea value={ef.value} onChange={(e) => onChange(e.target.value)} rows={2} />
    );
  }
  return (
    <Input
      type={ef.type === 'number' ? 'number' : ef.type === 'email' ? 'email' : ef.type === 'url' ? 'url' : ef.type === 'phone' ? 'tel' : 'text'}
      value={ef.value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function AgentFormDialog({ open, onOpenChange, agent, onSubmit }: AgentFormDialogProps) {
  const { organization } = useOrganization();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    code: '', name: '', company: '', email: '', phone: '',
    address: '', commissionRate: 10, status: 'pending', customFields: {},
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AgentFormData, string>>>({});

  // スキーマ外の追加フィールド
  const [extraFields, setExtraFields] = useState<ExtraField[]>([]);
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [newExtraLabel, setNewExtraLabel] = useState('');
  const [newExtraKey, setNewExtraKey] = useState('');
  const [newExtraKeyManual, setNewExtraKeyManual] = useState(false);
  const [newExtraType, setNewExtraType] = useState<FieldType>('text');
  const [newExtraOptions, setNewExtraOptions] = useState('');
  const [newExtraValue, setNewExtraValue] = useState('');

  const isEditing = !!agent?.id;
  const agentFieldSchema = organization?.agentFieldSchema ?? [];

  useEffect(() => {
    if (agent) {
      const schemaKeys = new Set(agentFieldSchema.map(f => f.key));
      const cf = agent.customFields ?? {};
      const storedLabels = (cf['__labels__'] as unknown as Record<string, string>) ?? {};
      const storedMeta = (cf['__meta__'] as unknown as Record<string, { type?: string; options?: string[] }>) ?? {};
      const schemaValues: Record<string, string> = {};
      const extras: ExtraField[] = [];
      for (const [k, v] of Object.entries(cf)) {
        if (k === '__labels__' || k === '__meta__') continue;
        if (schemaKeys.has(k)) {
          schemaValues[k] = v;
        } else {
          const meta = storedMeta[k] ?? {};
          extras.push({
            id: k,
            label: storedLabels[k] || k,
            key: k,
            value: v,
            type: (meta.type as FieldType) || 'text',
            options: meta.options ?? [],
          });
        }
      }
      setFormData({
        code: agent.code, name: agent.name, company: agent.company,
        email: agent.email, phone: agent.phone, address: agent.address,
        commissionRate: agent.commissionRate, status: agent.status,
        customFields: schemaValues,
      });
      setExtraFields(extras);
    } else {
      const defaultCf: Record<string, string> = {};
      agentFieldSchema.forEach(f => { defaultCf[f.key] = ''; });
      setFormData({
        code: '', name: '', company: '', email: '', phone: '',
        address: '', commissionRate: 10, status: 'pending', customFields: defaultCf,
      });
      setExtraFields([]);
    }
    setErrors({});
    setIsAddingExtra(false);
  }, [agent, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AgentFormData, string>> = {};
    if (!formData.code.trim()) newErrors.code = '代理店コードは必須です';
    if (!formData.name.trim()) newErrors.name = '担当者名は必須です';
    if (!formData.company.trim()) newErrors.company = '会社名は必須です';
    if (!formData.email.trim()) newErrors.email = 'メールアドレスは必須です';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'メールアドレスの形式が正しくありません';
    if (formData.commissionRate < 0 || formData.commissionRate > 100) newErrors.commissionRate = '0〜100の範囲で入力してください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    const merged: Record<string, unknown> = { ...formData.customFields };
    const labels: Record<string, string> = {};
    const meta: Record<string, unknown> = {};
    extraFields.forEach(f => {
      if (!f.key) return;
      merged[f.key] = f.value;
      labels[f.key] = f.label;
      const fieldMeta: Record<string, unknown> = { type: f.type };
      if (f.type === 'select' && f.options.length > 0) fieldMeta.options = f.options;
      meta[f.key] = fieldMeta;
    });
    if (Object.keys(labels).length > 0) merged['__labels__'] = labels;
    if (Object.keys(meta).length > 0) merged['__meta__'] = meta;
    try {
      await onSubmit({ ...formData, customFields: merged as Record<string, string> });
      toast.success(isEditing ? '代理店情報を更新しました' : '代理店を登録しました');
      onOpenChange(false);
    } catch {
      toast.error(isEditing ? '更新に失敗しました' : '登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof AgentFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleCfChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, customFields: { ...prev.customFields, [key]: value } }));
  };

  const addExtraField = () => {
    if (!newExtraLabel.trim() || !newExtraKey.trim()) {
      toast.error('ラベルとキーを入力してください');
      return;
    }
    setExtraFields(prev => [...prev, {
      id: `extra_${Date.now()}`,
      label: newExtraLabel,
      key: newExtraKey,
      value: newExtraValue,
      type: newExtraType,
      options: newExtraType === 'select' ? newExtraOptions.split('\n').filter(Boolean) : [],
    }]);
    setNewExtraLabel(''); setNewExtraKey(''); setNewExtraKeyManual(false);
    setNewExtraType('text'); setNewExtraOptions(''); setNewExtraValue('');
    setIsAddingExtra(false);
  };

  const removeExtraField = (id: string) => {
    setExtraFields(prev => prev.filter(f => f.id !== id));
  };

  const updateExtraValue = (id: string, value: string) => {
    setExtraFields(prev => prev.map(f => f.id === id ? { ...f, value } : f));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-sky-500" />
            {isEditing ? '代理店情報を編集' : '新規代理店登録'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? '代理店パートナーの情報を更新します' : '新しい代理店パートナーを登録します'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 代理店コード・ステータス */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="flex items-center gap-1">代理店コード<span className="text-destructive">*</span></Label>
              <Input id="code" placeholder="AG-006" value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                className={errors.code ? 'border-destructive' : ''} />
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">ステータス</Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v as AgentDisplay['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">審査中</SelectItem>
                  <SelectItem value="active">アクティブ</SelectItem>
                  <SelectItem value="inactive">停止中</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 会社名 */}
          <div className="space-y-2">
            <Label htmlFor="company" className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />会社名<span className="text-destructive">*</span></Label>
            <Input id="company" placeholder="株式会社サンプル" value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              className={errors.company ? 'border-destructive' : ''} />
            {errors.company && <p className="text-xs text-destructive">{errors.company}</p>}
          </div>

          {/* 担当者名 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-1"><User className="h-3.5 w-3.5" />担当者名<span className="text-destructive">*</span></Label>
            <Input id="name" placeholder="山田 太郎" value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? 'border-destructive' : ''} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* 連絡先 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />メールアドレス<span className="text-destructive">*</span></Label>
              <Input id="email" type="email" placeholder="contact@example.com" value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={errors.email ? 'border-destructive' : ''} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />電話番号</Label>
              <Input id="phone" placeholder="03-1234-5678" value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)} />
            </div>
          </div>

          {/* 住所 */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />住所</Label>
            <Textarea id="address" placeholder="東京都千代田区..." value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)} rows={2} />
          </div>

          {/* コミッション率 */}
          <div className="space-y-2">
            <Label htmlFor="commissionRate" className="flex items-center gap-1"><Percent className="h-3.5 w-3.5" />コミッション率</Label>
            <div className="flex items-center gap-2">
              <Input id="commissionRate" type="number" min="0" max="100" step="0.5"
                value={formData.commissionRate}
                onChange={(e) => handleChange('commissionRate', parseFloat(e.target.value) || 0)}
                className={`w-24 ${errors.commissionRate ? 'border-destructive' : ''}`} />
              <span className="text-muted-foreground">%</span>
            </div>
            {errors.commissionRate && <p className="text-xs text-destructive">{errors.commissionRate}</p>}
            <p className="text-xs text-muted-foreground">売上に対して支払うコミッションの割合</p>
          </div>

          {/* カスタムフィールド（スキーマ定義 + 自由追加） */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">追加情報</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingExtra(true)}
                className="h-7 text-xs text-sky-600 hover:text-sky-700">
                <Plus className="h-3.5 w-3.5 mr-1" />フィールドを追加
              </Button>
            </div>

            {/* スキーマ定義済みフィールド */}
            {agentFieldSchema.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-sm flex items-center gap-1">
                  {field.label}
                  {field.required && <span className="text-destructive">*</span>}
                </Label>
                {field.type === 'select' && field.options ? (
                  <Select value={formData.customFields[field.key] ?? ''} onValueChange={(v) => handleCfChange(field.key, v)}>
                    <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                    <SelectContent>
                      {field.options.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : field.type === 'boolean' ? (
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      checked={formData.customFields[field.key] === 'true'}
                      onCheckedChange={(v) => handleCfChange(field.key, v ? 'true' : 'false')}
                    />
                    <span className="text-sm text-muted-foreground">
                      {formData.customFields[field.key] === 'true' ? 'ON' : 'OFF'}
                    </span>
                  </div>
                ) : field.type === 'textarea' ? (
                  <Textarea value={formData.customFields[field.key] ?? ''}
                    onChange={(e) => handleCfChange(field.key, e.target.value)} rows={2} />
                ) : (
                  <Input
                    type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'phone' ? 'tel' : 'text'}
                    value={formData.customFields[field.key] ?? ''}
                    onChange={(e) => handleCfChange(field.key, e.target.value)} />
                )}
              </div>
            ))}

            {/* 自由追加フィールド */}
            {extraFields.map((ef) => (
              <div key={ef.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{ef.label}</Label>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeExtraField(ef.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {renderFieldInput(ef, (v) => updateExtraValue(ef.id, v))}
              </div>
            ))}

            {/* 新規フィールド追加フォーム */}
            {isAddingExtra && (
              <div className="rounded-lg border border-dashed border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/10 p-3 space-y-2">
                <p className="text-xs font-medium text-sky-700 dark:text-sky-400">新しいフィールド</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ラベル</Label>
                    <Input
                      placeholder="例: 担当エリア"
                      value={newExtraLabel}
                      autoFocus
                      onChange={(e) => {
                        setNewExtraLabel(e.target.value);
                        if (!newExtraKeyManual) setNewExtraKey(autoKeyFromLabel(e.target.value));
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">タイプ</Label>
                    <Select value={newExtraType} onValueChange={(v) => { setNewExtraType(v as FieldType); setNewExtraValue(''); }}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">テキスト</SelectItem>
                        <SelectItem value="textarea">長文</SelectItem>
                        <SelectItem value="number">数値</SelectItem>
                        <SelectItem value="select">選択肢</SelectItem>
                        <SelectItem value="boolean">ON/OFF</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                        <SelectItem value="email">メール</SelectItem>
                        <SelectItem value="phone">電話</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">キー</Label>
                  <Input
                    placeholder="自動生成"
                    value={newExtraKey}
                    className="font-mono text-sm"
                    onChange={(e) => { setNewExtraKey(e.target.value); setNewExtraKeyManual(true); }}
                  />
                </div>
                {newExtraType === 'select' && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">選択肢（改行区切り）</Label>
                    <textarea
                      className="w-full border rounded-md px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring text-xs"
                      rows={3}
                      placeholder={'例:\n東京\n大阪\n名古屋'}
                      value={newExtraOptions}
                      onChange={(e) => setNewExtraOptions(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">値（初期値）</Label>
                  {newExtraType === 'boolean' ? (
                    <div className="flex items-center gap-2 h-9">
                      <Switch checked={newExtraValue === 'true'} onCheckedChange={(v) => setNewExtraValue(v ? 'true' : 'false')} />
                      <span className="text-sm text-muted-foreground">{newExtraValue === 'true' ? 'ON' : 'OFF'}</span>
                    </div>
                  ) : newExtraType === 'select' ? (
                    <Select value={newExtraValue} onValueChange={setNewExtraValue}>
                      <SelectTrigger><SelectValue placeholder="選択してください" /></SelectTrigger>
                      <SelectContent>
                        {newExtraOptions.split('\n').filter(Boolean).map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="入力（後からでも変更可）"
                      value={newExtraValue}
                      type={newExtraType === 'number' ? 'number' : newExtraType === 'email' ? 'email' : newExtraType === 'url' ? 'url' : newExtraType === 'phone' ? 'tel' : 'text'}
                      onChange={(e) => setNewExtraValue(e.target.value)}
                    />
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={addExtraField}
                    disabled={!newExtraLabel.trim() || !newExtraKey.trim()}>
                    <Plus className="h-3.5 w-3.5 mr-1" />追加する
                  </Button>
                  <Button type="button" size="sm" variant="ghost"
                    onClick={() => { setIsAddingExtra(false); setNewExtraLabel(''); setNewExtraKey(''); setNewExtraKeyManual(false); setNewExtraType('text'); setNewExtraOptions(''); setNewExtraValue(''); }}>
                    キャンセル
                  </Button>
                </div>
              </div>
            )}

            {agentFieldSchema.length === 0 && extraFields.length === 0 && !isAddingExtra && (
              <p className="text-xs text-muted-foreground">
                「フィールドを追加」でこの代理店専用の情報を自由に追加できます
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>キャンセル</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? '更新する' : '登録する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  AlertCircle,
  CheckCircle2,
  Tag,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganization } from '@/components/providers/organization-provider';
import { getCustomerRoleLabels } from '@/lib/actions/settings';
import {
  type CustomerSubscriptionPlan,
  type CustomerRoleKey,
  type SubscriptionInterval,
  DEFAULT_CUSTOMER_SUBSCRIPTION_PLANS_SETTINGS,
} from '@/lib/customer-subscription-plans';
import {
  DEFAULT_CUSTOMER_ROLE_LABELS,
  type CustomerRoleLabels,
  type CustomerRoleEnabled,
  DEFAULT_CUSTOMER_ROLE_ENABLED,
} from '@/lib/customer-roles';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CustomerPlansSectionProps {
  /** Stripe Connect 接続済みかどうか（親から渡してもらう） */
  isStripeConnected: boolean;
}

interface PlanFormState {
  targetRole: CustomerRoleKey;
  name: string;
  description: string;
  amount: string;
  interval: SubscriptionInterval;
  features: string[];
  isActive: boolean;
}

const DEFAULT_FORM: PlanFormState = {
  targetRole: 'supplier',
  name: '',
  description: '',
  amount: '',
  interval: 'year',
  features: [''],
  isActive: true,
};

const INTERVAL_LABEL: Record<SubscriptionInterval, string> = {
  month: '月額',
  year: '年額',
};

export function CustomerSubscriptionPlansSection({ isStripeConnected }: CustomerPlansSectionProps) {
  const { organization } = useOrganization();
  const [enabled, setEnabled] = useState(DEFAULT_CUSTOMER_SUBSCRIPTION_PLANS_SETTINGS.enabled);
  const [plans, setPlans] = useState<CustomerSubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabledSaving, setEnabledSaving] = useState(false);

  const [labels, setLabels] = useState<CustomerRoleLabels>(DEFAULT_CUSTOMER_ROLE_LABELS);
  const [roleEnabled, setRoleEnabled] = useState<CustomerRoleEnabled>(DEFAULT_CUSTOMER_ROLE_ENABLED);

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/customer-plans', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setEnabled(data.enabled ?? false);
      setPlans(Array.isArray(data.plans) ? data.plans : []);
    } catch (e) {
      console.error(e);
      toast.error('プランの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (!organization?.id) return;
    (async () => {
      const { data, enabled: en } = await getCustomerRoleLabels(organization.id);
      setLabels(data);
      setRoleEnabled(en);
    })();
  }, [organization?.id]);

  const availableRoles: CustomerRoleKey[] = (Object.keys(labels) as CustomerRoleKey[]).filter(
    (r) => roleEnabled[r]
  );

  const openEdit = (plan: CustomerSubscriptionPlan) => {
    setEditingId(plan.id);
    setForm({
      targetRole: plan.targetRole,
      name: plan.name,
      description: plan.description,
      amount: String(plan.amount),
      interval: plan.interval,
      features: plan.features.length > 0 ? [...plan.features] : [''],
      isActive: plan.isActive,
    });
    setShowDialog(true);
  };

  const handleEnabledToggle = async (next: boolean) => {
    setEnabledSaving(true);
    try {
      const res = await fetch('/api/stripe/customer-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error('Failed');
      setEnabled(next);
      toast.success(next ? '会員サブスクを有効にしました' : '無効にしました');
    } catch (e) {
      console.error(e);
      toast.error('保存に失敗しました');
    } finally {
      setEnabledSaving(false);
    }
  };

  const updateFeature = (index: number, value: string) => {
    setForm((prev) => {
      const next = [...prev.features];
      next[index] = value;
      return { ...prev, features: next };
    });
  };

  const addFeature = () => {
    setForm((prev) => ({ ...prev, features: [...prev.features, ''] }));
  };

  const removeFeature = (index: number) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.length > 1 ? prev.features.filter((_, i) => i !== index) : prev.features,
    }));
  };

  const handleSubmit = async () => {
    const amount = Number(form.amount);
    if (!form.name.trim()) {
      toast.error('プラン名を入力してください');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('金額を正しく入力してください');
      return;
    }

    setSubmitting(true);
    try {
      const features = form.features.map((f) => f.trim()).filter(Boolean);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        amount,
        interval: form.interval,
        features,
        isActive: form.isActive,
        ...(editingId ? {} : { targetRole: form.targetRole, currency: 'jpy' }),
      };

      const res = await fetch(
        editingId ? `/api/stripe/customer-plans/${editingId}` : '/api/stripe/customer-plans',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || '保存に失敗しました');
        return;
      }
      toast.success(editingId ? 'プランを更新しました' : 'プランを作成しました');
      setShowDialog(false);
      await loadPlans();
    } catch (e) {
      console.error(e);
      toast.error('保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/stripe/customer-plans/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        toast.error(result.error || '削除に失敗しました');
        return;
      }
      toast.success('プランを削除しました');
      await loadPlans();
    } catch (e) {
      console.error(e);
      toast.error('削除に失敗しました');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  // role別にグルーピング
  const grouped = availableRoles.reduce<Record<CustomerRoleKey, CustomerSubscriptionPlan[]>>(
    (acc, role) => {
      acc[role] = plans.filter((p) => p.targetRole === role).sort((a, b) => a.sortOrder - b.sortOrder);
      return acc;
    },
    { personal: [], buyer: [], supplier: [] }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">会員サブスクリプション</h2>
          <p className="text-sm text-muted-foreground">
            会員種別ごとに有料プランを設定できます。Stripe 上に商品が自動作成されます。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/settings/customer-roles">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" />
              会員種別を編集
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Label htmlFor="cs-enabled" className="text-sm text-muted-foreground">
              機能を有効化
            </Label>
            <Switch
              id="cs-enabled"
              checked={enabled}
              disabled={enabledSaving}
              onCheckedChange={handleEnabledToggle}
            />
          </div>
        </div>
      </div>

      {!isStripeConnected && (
        <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-800">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                プランを作成するには Stripe 連携が必要です
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
                上の Stripe Connect セクションから連携してください。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {availableRoles.map((role) => {
            const rolePlans = grouped[role] || [];
            return (
              <Card key={role}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{labels[role]}</CardTitle>
                      <Badge variant="outline" className="text-[10px]">
                        role: {role}
                      </Badge>
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        title="会員種別の名称や有効/無効を編集"
                      >
                        <Link href="/settings/customer-roles">
                          <Pencil className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!isStripeConnected}
                      onClick={() => {
                        setEditingId(null);
                        setForm({ ...DEFAULT_FORM, targetRole: role });
                        setShowDialog(true);
                      }}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> プランを追加
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {rolePlans.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-6">
                      プラン未設定
                    </div>
                  ) : (
                    <div className="divide-y">
                      {rolePlans.map((plan) => (
                        <div key={plan.id} className="flex items-center justify-between py-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{plan.name}</span>
                              {!plan.isActive && (
                                <Badge variant="outline" className="text-[10px]">
                                  非公開
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px]',
                                  plan.isActive && 'border-emerald-300 text-emerald-700 dark:text-emerald-400'
                                )}
                              >
                                <CheckCircle2 className="mr-0.5 h-3 w-3" />
                                Stripe同期済
                              </Badge>
                            </div>
                            {plan.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {plan.description}
                              </p>
                            )}
                            <div className="text-sm mt-1">
                              <span className="font-semibold">
                                ¥{plan.amount.toLocaleString()}
                              </span>
                              <span className="text-muted-foreground">
                                {' '}
                                / {INTERVAL_LABEL[plan.interval]}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-3">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(plan)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              disabled={deletingId === plan.id}
                              onClick={() => setConfirmDeleteId(plan.id)}
                            >
                              {deletingId === plan.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 作成・編集ダイアログ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'プランを編集' : '新規プラン作成'}</DialogTitle>
            <DialogDescription>
              Stripe 上に商品と料金が自動作成されます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!editingId && (
              <div className="space-y-2">
                <Label>対象会員種別</Label>
                <Select
                  value={form.targetRole}
                  onValueChange={(v) => setForm((p) => ({ ...p, targetRole: v as CustomerRoleKey }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {labels[r]}（{r}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="plan-name">プラン名</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="例: スタンダードプラン"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-desc">説明</Label>
              <Textarea
                id="plan-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="例: 月50件まで掲載可能"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="plan-amount">金額（JPY）</Label>
                <Input
                  id="plan-amount"
                  type="number"
                  min={1}
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="例: 36000"
                />
              </div>
              <div className="space-y-2">
                <Label>課金周期</Label>
                <Select
                  value={form.interval}
                  onValueChange={(v) => setForm((p) => ({ ...p, interval: v as SubscriptionInterval }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">月額</SelectItem>
                    <SelectItem value="year">年額</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>特典（箇条書き）</Label>
                <Button type="button" variant="ghost" size="sm" onClick={addFeature}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> 追加
                </Button>
              </div>
              <div className="space-y-2">
                {form.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={feature}
                      onChange={(e) => updateFeature(idx, e.target.value)}
                      placeholder="例: 商品掲載 50件まで"
                    />
                    {form.features.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFeature(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="plan-active" className="font-medium">
                  公開状態
                </Label>
                <p className="text-xs text-muted-foreground">
                  オフにすると新規購読を停止できます（既存契約は継続）
                </p>
              </div>
              <Switch
                id="plan-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={submitting}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : editingId ? (
                '更新する'
              ) : (
                '作成する'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認 */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>プランを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              削除すると新規購読を受け付けなくなります。既存の契約は継続されます（手動で停止が必要）。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

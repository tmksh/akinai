'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Tag,
  Copy,
  Hash,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CUSTOMER_SERVICE_CATEGORIES,
  type CustomerOneTimeService,
  type CustomerServiceCategory,
  type CustomerServiceTargetRole,
  DEFAULT_CUSTOMER_ONE_TIME_SERVICES_SETTINGS,
} from '@/lib/customer-one-time-services';

/** UI上の Select は空文字を扱えないため "none" を「指定なし」のセンチネルとして使う */
const TARGET_ROLE_NONE = 'none';
type TargetRoleFormValue = typeof TARGET_ROLE_NONE | CustomerServiceTargetRole;
const CATEGORY_NONE = 'none';
type CategoryFormValue = typeof CATEGORY_NONE | CustomerServiceCategory;
import { toast } from 'sonner';

interface CustomerServicesSectionProps {
  isStripeConnected: boolean;
}

interface ServiceFormState {
  name: string;
  description: string;
  amount: string;
  features: string[];
  isActive: boolean;
  imageUrl: string;
  displayOrder: string;
  targetRole: TargetRoleFormValue;
  category: CategoryFormValue;
  googleFormUrl: string;
  buyerGoogleFormUrl: string;
}

const DEFAULT_FORM: ServiceFormState = {
  name: '',
  description: '',
  amount: '',
  features: [''],
  isActive: true,
  imageUrl: '',
  displayOrder: '0',
  targetRole: TARGET_ROLE_NONE,
  category: CATEGORY_NONE,
  googleFormUrl: '',
  buyerGoogleFormUrl: '',
};

function StripeIdRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="shrink-0">{label}:</span>
      <span className="font-mono truncate max-w-[260px]">{value}</span>
      <button
        onClick={copy}
        className="shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
        title={`${label}をコピー`}
      >
        {copied ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

export function CustomerServicesSection({ isStripeConnected }: CustomerServicesSectionProps) {
  const [enabled, setEnabled] = useState(DEFAULT_CUSTOMER_ONE_TIME_SERVICES_SETTINGS.enabled);
  const [services, setServices] = useState<CustomerOneTimeService[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabledSaving, setEnabledSaving] = useState(false);

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/customer-services', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setEnabled(data.enabled ?? false);
      setServices(Array.isArray(data.services) ? data.services : []);
    } catch (e) {
      console.error(e);
      toast.error('サービスの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleEnabledToggle = async (next: boolean) => {
    setEnabledSaving(true);
    try {
      const res = await fetch('/api/stripe/customer-services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) throw new Error('Failed');
      setEnabled(next);
      toast.success(next ? '単発サービスを有効にしました' : '無効にしました');
    } catch (e) {
      console.error(e);
      toast.error('保存に失敗しました');
    } finally {
      setEnabledSaving(false);
    }
  };

  const openEdit = (service: CustomerOneTimeService) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description,
      amount: String(service.amount),
      features: service.features.length > 0 ? [...service.features] : [''],
      isActive: service.isActive,
      imageUrl: service.imageUrl ?? '',
      displayOrder: String(service.displayOrder ?? 0),
      targetRole: service.targetRole ?? TARGET_ROLE_NONE,
      category: service.category ?? CATEGORY_NONE,
      googleFormUrl: service.googleFormUrl ?? '',
      buyerGoogleFormUrl: service.buyerGoogleFormUrl ?? '',
    });
    setShowDialog(true);
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
      toast.error('サービス名を入力してください');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('金額を正しく入力してください');
      return;
    }

    setSubmitting(true);
    try {
      const features = form.features.map((f) => f.trim()).filter(Boolean);
      const displayOrderNum = Number(form.displayOrder);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        amount,
        features,
        isActive: form.isActive,
        currency: 'jpy',
        imageUrl: form.imageUrl.trim(),
        displayOrder: Number.isFinite(displayOrderNum) ? Math.max(0, Math.floor(displayOrderNum)) : 0,
        // 「指定なし」の場合は null を送ることでサーバー側で undefined にクリアされる
        targetRole: form.targetRole === TARGET_ROLE_NONE ? null : form.targetRole,
        category: form.category === CATEGORY_NONE ? null : form.category,
        googleFormUrl: form.googleFormUrl.trim() || null,
        buyerGoogleFormUrl: form.buyerGoogleFormUrl.trim() || null,
      };

      const res = await fetch(
        editingId ? `/api/stripe/customer-services/${editingId}` : '/api/stripe/customer-services',
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
      toast.success(editingId ? 'サービスを更新しました' : 'サービスを作成しました');
      setShowDialog(false);
      await loadServices();
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
      const res = await fetch(`/api/stripe/customer-services/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        toast.error(result.error || '削除に失敗しました');
        return;
      }
      toast.success('サービスを削除しました');
      await loadServices();
    } catch (e) {
      console.error(e);
      toast.error('削除に失敗しました');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">単発サービス</h2>
          <p className="text-sm text-muted-foreground">
            特集記事掲載・LP作成代行などの無形サービスを登録できます。Stripe 上に商品が自動作成されます。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="cs-svc-enabled" className="text-sm text-muted-foreground">
            機能を有効化
          </Label>
          <Switch
            id="cs-svc-enabled"
            checked={enabled}
            disabled={enabledSaving}
            onCheckedChange={handleEnabledToggle}
          />
        </div>
      </div>

      {!isStripeConnected && (
        <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-800">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                サービスを作成するには Stripe 連携が必要です
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
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">サービス一覧</CardTitle>
              <Button
                size="sm"
                variant="outline"
                disabled={!isStripeConnected}
                onClick={() => {
                  setEditingId(null);
                  setForm(DEFAULT_FORM);
                  setShowDialog(true);
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> サービスを追加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                サービス未設定
              </div>
            ) : (
              <div className="divide-y">
                {services
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((service) => (
                    <div key={service.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{service.name}</span>
                          {!service.isActive && (
                            <Badge variant="outline" className="text-[10px]">
                              非公開
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className="text-[10px] border-emerald-300 text-emerald-700 dark:text-emerald-400"
                          >
                            <CheckCircle2 className="mr-0.5 h-3 w-3" />
                            Stripe同期済
                          </Badge>
                        </div>
                        {service.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {service.description}
                          </p>
                        )}
                        <div className="text-sm mt-1">
                          <span className="font-semibold">
                            ¥{service.amount.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground"> / 単発</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="sm" variant="ghost" title="IDを確認">
                              <Hash className="h-3.5 w-3.5" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3" align="end">
                            <p className="text-xs font-medium text-muted-foreground mb-2">API連携用ID</p>
                            <div className="flex flex-col gap-1.5">
                              <StripeIdRow label="Service ID" value={service.id} />
                              {service.stripePriceId && (
                                <StripeIdRow label="Price ID" value={service.stripePriceId} />
                              )}
                              {service.stripeProductId && (
                                <StripeIdRow label="Product ID" value={service.stripeProductId} />
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(service)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          disabled={deletingId === service.id}
                          onClick={() => setConfirmDeleteId(service.id)}
                        >
                          {deletingId === service.id ? (
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
      )}

      {/* 作成・編集ダイアログ */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'サービスを編集' : '新規サービス作成'}</DialogTitle>
            <DialogDescription>
              Stripe 上に商品と料金が自動作成されます。決済完了時は注文管理に記録され、顧客に確認メールが送信されます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="svc-name">サービス名</Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="例: 特集記事掲載"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-desc">説明</Label>
              <Textarea
                id="svc-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="例: トップページ特集枠に1ヶ月掲載"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-amount">金額（JPY）</Label>
              <Input
                id="svc-amount"
                type="number"
                min={1}
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="例: 30000"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="svc-image-url">サムネイル画像URL</Label>
                <Input
                  id="svc-image-url"
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-[11px] text-muted-foreground">
                  公開API経由で外部サイトに表示する画像URL（任意）
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="svc-display-order">TOP表示の順番</Label>
                <Input
                  id="svc-display-order"
                  type="number"
                  min={0}
                  step={1}
                  value={form.displayOrder}
                  onChange={(e) => setForm((p) => ({ ...p, displayOrder: e.target.value }))}
                  placeholder="0"
                />
                <p className="text-[11px] text-muted-foreground">
                  小さい数字が優先。0または未設定はTOPに非表示
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="svc-target-role">対象会員種別</Label>
                <Select
                  value={form.targetRole}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, targetRole: v as TargetRoleFormValue }))
                  }
                >
                  <SelectTrigger id="svc-target-role">
                    <SelectValue placeholder="指定なし" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TARGET_ROLE_NONE}>指定なし</SelectItem>
                    <SelectItem value="supplier">サプライヤー向け</SelectItem>
                    <SelectItem value="buyer">バイヤー向け</SelectItem>
                    <SelectItem value="both">両方</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  どの会員種別向けのサービスかを設定します（任意）
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="svc-category">カテゴリ</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, category: v as CategoryFormValue }))
                  }
                >
                  <SelectTrigger id="svc-category">
                    <SelectValue placeholder="指定なし" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CATEGORY_NONE}>指定なし</SelectItem>
                    {CUSTOMER_SERVICE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  外部TOPでのグルーピング表示などに利用します（任意）
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-google-form-url">
                受注後の案内URL（サプライヤー向け）
              </Label>
              <Input
                id="svc-google-form-url"
                type="url"
                value={form.googleFormUrl}
                onChange={(e) => setForm((p) => ({ ...p, googleFormUrl: e.target.value }))}
                placeholder="https://forms.gle/..."
              />
              <p className="text-[11px] text-muted-foreground">
                サプライヤー会員へ決済完了後に案内するフォームURL（任意）。公開API経由で取得できます。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-buyer-google-form-url">
                受注後の案内URL（バイヤー向け）
              </Label>
              <Input
                id="svc-buyer-google-form-url"
                type="url"
                value={form.buyerGoogleFormUrl}
                onChange={(e) =>
                  setForm((p) => ({ ...p, buyerGoogleFormUrl: e.target.value }))
                }
                placeholder="https://forms.gle/..."
              />
              <p className="text-[11px] text-muted-foreground">
                バイヤー会員向けに別フォームを案内する場合に設定（任意）。
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>内容・特典（箇条書き）</Label>
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
                      placeholder="例: 記事本文 1,000〜3,000文字"
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
                <Label htmlFor="svc-active" className="font-medium">
                  公開状態
                </Label>
                <p className="text-xs text-muted-foreground">
                  オフにすると新規購入を停止できます
                </p>
              </div>
              <Switch
                id="svc-active"
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
            <AlertDialogTitle>サービスを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              削除すると新規購入を受け付けなくなります。Stripe 上の商品も非アクティブになります。
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

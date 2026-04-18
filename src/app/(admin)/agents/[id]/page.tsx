'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useTransition } from 'react';
import {
  ArrowLeft, Building2, Mail, Phone, MapPin, Calendar, TrendingUp,
  DollarSign, ShoppingCart, Percent, Loader2, Edit, Trash2, Sparkles,
  Plus, X, Check,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getAgent, deleteAgent, updateAgent } from '@/lib/actions/agents';
import { useOrganization } from '@/components/providers/organization-provider';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AgentFormDialog } from '../_components';
import type { AgentDisplay } from '../types';
import type { Database } from '@/types/database';
import { toast } from 'sonner';

type AgentRow = Database['public']['Tables']['agents']['Row'];

const statusConfig = {
  active: { label: '稼働中', variant: 'default' as const },
  inactive: { label: '停止中', variant: 'secondary' as const },
  pending: { label: '審査中', variant: 'outline' as const },
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);
}

function mapToDisplay(row: AgentRow): AgentDisplay {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone ?? '',
    address: row.address ?? '',
    commissionRate: Number(row.commission_rate),
    status: row.status,
    totalSales: Number(row.total_sales),
    totalCommission: Number(row.total_commission),
    ordersCount: 0,
    joinedAt: row.joined_at,
    customFields: (row.custom_fields as Record<string, string>) ?? {},
  };
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const { organization } = useOrganization();

  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPending, startTransition] = useTransition();

  // インライン追加フィールド
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldKeyManual, setNewFieldKeyManual] = useState(false);
  const [newFieldValue, setNewFieldValue] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);

  const agentFieldSchema = organization?.agentFieldSchema ?? [];

  useEffect(() => {
    getAgent(agentId).then(({ data, error }) => {
      if (data) setAgent(data);
      else { setNotFound(true); if (error) console.error(error); }
      setLoading(false);
    });
  }, [agentId]);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteAgent(agentId);
      if (result.success) {
        toast.success('代理店を削除しました');
        router.push('/agents');
      } else {
        toast.error(result.error || '削除に失敗しました');
      }
      setShowDeleteDialog(false);
    });
  };

  const handleAddField = async () => {
    if (!newFieldLabel.trim() || !newFieldKey.trim() || !agent) return;
    setIsSavingField(true);
    const current = (agent.custom_fields as Record<string, string>) ?? {};
    const updated = { ...current, [newFieldKey]: newFieldValue };
    const result = await updateAgent(agentId, { customFields: updated });
    if (result.data) {
      const { data: d } = await getAgent(agentId);
      if (d) setAgent(d);
      toast.success(`「${newFieldLabel}」を追加しました`);
      setNewFieldLabel(''); setNewFieldKey(''); setNewFieldKeyManual(false);
      setNewFieldValue(''); setIsAddingField(false);
    } else {
      toast.error('追加に失敗しました');
    }
    setIsSavingField(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !agent) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold mb-2">代理店が見つかりません</h2>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/agents"><ArrowLeft className="mr-2 h-4 w-4" />一覧に戻る</Link>
        </Button>
      </div>
    );
  }

  const statusInfo = statusConfig[agent.status as keyof typeof statusConfig] || statusConfig.pending;
  const display = mapToDisplay(agent);
  const customFields = (agent.custom_fields as Record<string, string>) ?? {};
  const schemaKeys = new Set(agentFieldSchema.map(f => f.key));
  const extraEntries = Object.entries(customFields).filter(([k]) => !schemaKeys.has(k));
  const hasAnyCustomField = agentFieldSchema.length > 0 || extraEntries.length > 0;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/agents"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{agent.company}</h1>
            <p className="text-muted-foreground text-sm">代理店コード: {agent.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />編集
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />削除
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-950/30">
                <DollarSign className="h-4 w-4 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">総売上</p>
                <p className="text-lg font-bold">{formatCurrency(Number(agent.total_sales))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950/30">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">総コミッション</p>
                <p className="text-lg font-bold">{formatCurrency(Number(agent.total_commission))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950/30">
                <Percent className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">コミッション率</p>
                <p className="text-lg font-bold">{Number(agent.commission_rate)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/30">
                <ShoppingCart className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ステータス</p>
                <Badge variant={statusInfo.variant} className="mt-1 text-xs">{statusInfo.label}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div><p className="text-xs text-muted-foreground">担当者名</p><p className="font-medium">{agent.name}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">メールアドレス</p>
                <a href={`mailto:${agent.email}`} className="font-medium text-sky-500 hover:underline">{agent.email}</a>
              </div>
            </div>
            {agent.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <div><p className="text-xs text-muted-foreground">電話番号</p><p className="font-medium">{agent.phone}</p></div>
              </div>
            )}
            {agent.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div><p className="text-xs text-muted-foreground">住所</p><p className="font-medium">{agent.address}</p></div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">登録日</p>
                <p className="font-medium">
                  {new Date(agent.joined_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* 追加情報セクション */}
            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">追加情報</p>
              {!isAddingField && (
                <Button type="button" variant="ghost" size="sm"
                  className="h-6 text-xs text-sky-600 hover:text-sky-700 px-2"
                  onClick={() => setIsAddingField(true)}>
                  <Plus className="h-3 w-3 mr-1" />追加
                </Button>
              )}
            </div>

            {/* スキーマ定義フィールド */}
            {agentFieldSchema.map(field => (
              <div key={field.key} className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">{field.label}</p>
                  <p className="font-medium">{customFields[field.key] || <span className="text-muted-foreground">—</span>}</p>
                </div>
              </div>
            ))}

            {/* 自由追加フィールド */}
            {extraEntries.map(([key, value]) => (
              <div key={key} className="flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="font-medium">{value || <span className="text-muted-foreground">—</span>}</p>
                </div>
              </div>
            ))}

            {!hasAnyCustomField && !isAddingField && (
              <p className="text-xs text-muted-foreground">「追加」ボタンでフィールドを追加できます</p>
            )}

            {/* インライン追加フォーム */}
            {isAddingField && (
              <div className="rounded-lg border border-dashed border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/10 p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ラベル</Label>
                    <Input
                      placeholder="例: 担当エリア"
                      value={newFieldLabel}
                      autoFocus
                      onChange={(e) => {
                        setNewFieldLabel(e.target.value);
                        if (!newFieldKeyManual) {
                          const key = e.target.value.trim()
                            .replace(/[^a-zA-Z0-9\u3040-\u9FFF]+/g, '_')
                            .replace(/^_+|_+$/g, '') || '';
                          setNewFieldKey(key);
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddField(); } }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">キー</Label>
                    <Input
                      placeholder="自動生成"
                      value={newFieldKey}
                      className="font-mono text-xs"
                      onChange={(e) => { setNewFieldKey(e.target.value); setNewFieldKeyManual(true); }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">値</Label>
                  <Input
                    placeholder="内容を入力"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddField(); } }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddField}
                    disabled={!newFieldLabel.trim() || !newFieldKey.trim() || isSavingField}>
                    {isSavingField ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                    保存
                  </Button>
                  <Button size="sm" variant="ghost"
                    onClick={() => { setIsAddingField(false); setNewFieldLabel(''); setNewFieldKey(''); setNewFieldKeyManual(false); setNewFieldValue(''); }}>
                    <X className="h-3.5 w-3.5 mr-1" />キャンセル
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* メモ */}
        <Card>
          <CardHeader><CardTitle className="text-base">メモ・備考</CardTitle></CardHeader>
          <CardContent>
            {agent.notes
              ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{agent.notes}</p>
              : <p className="text-sm text-muted-foreground">メモはありません</p>}
          </CardContent>
        </Card>
      </div>

      {/* 編集ダイアログ */}
      {showEditDialog && (
        <AgentFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          agent={display}
          onSubmit={async (data) => {
            const result = await updateAgent(agentId, {
              code: data.code, name: data.name, company: data.company,
              email: data.email, phone: data.phone, address: data.address,
              commissionRate: data.commissionRate, status: data.status,
              customFields: data.customFields,
            });
            if (result.data) {
              getAgent(agentId).then(({ data: d }) => { if (d) setAgent(d); });
              toast.success('代理店情報を更新しました');
            } else {
              toast.error(result.error || '更新に失敗しました');
            }
          }}
        />
      )}

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>代理店を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>「{agent.company}」を削除します。この操作は取り消せません。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />削除中...</> : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

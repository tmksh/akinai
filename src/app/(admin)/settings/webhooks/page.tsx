'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Webhook,
  Plus,
  Trash2,
  RefreshCw,
  Send,
  Copy,
  Check,
  Eye,
  EyeOff,
  MoreHorizontal,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrganization } from '@/components/providers/organization-provider';
import {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  regenerateWebhookSecret,
  testWebhook,
  type Webhook as WebhookType,
} from '@/lib/actions/webhooks';
import { EVENT_CATEGORIES, WebhookEventType, getAllEventTypes, getEventLabel } from '@/lib/webhooks/events';
import { toast } from 'sonner';

export default function WebhooksSettingsPage() {
  const { organization, isLoading: orgLoading } = useOrganization();
  const [isPending, startTransition] = useTransition();
  
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // ダイアログ状態
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookType | null>(null);
  
  // フォーム状態
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as WebhookEventType[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // シークレット表示
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  // データ取得
  const fetchWebhooks = useCallback(async () => {
    if (!organization?.id) return;
    
    setIsLoading(true);
    const result = await getWebhooks(organization.id);
    if (result.data) {
      setWebhooks(result.data);
    }
    setIsLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // フォームバリデーション
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = '名前を入力してください';
    }
    if (!formData.url.trim()) {
      errors.url = 'URLを入力してください';
    } else if (!formData.url.startsWith('https://')) {
      errors.url = 'URLはhttps://で始まる必要があります';
    }
    if (formData.events.length === 0) {
      errors.events = '少なくとも1つのイベントを選択してください';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Webhook作成
  const handleCreate = async () => {
    if (!organization?.id || !validateForm()) return;
    
    startTransition(async () => {
      const result = await createWebhook(organization.id, {
        name: formData.name,
        url: formData.url,
        events: formData.events,
      });
      
      if (result.data) {
        toast.success('Webhookを作成しました');
        setShowCreateDialog(false);
        setFormData({ name: '', url: '', events: [] });
        fetchWebhooks();
      } else {
        toast.error(result.error || '作成に失敗しました');
      }
    });
  };

  // Webhook削除
  const handleDelete = async () => {
    if (!webhookToDelete) return;
    
    startTransition(async () => {
      const result = await deleteWebhook(webhookToDelete.id);
      
      if (result.success) {
        toast.success('Webhookを削除しました');
        setShowDeleteDialog(false);
        setWebhookToDelete(null);
        fetchWebhooks();
      } else {
        toast.error(result.error || '削除に失敗しました');
      }
    });
  };

  // 有効/無効切り替え
  const handleToggleActive = async (webhook: WebhookType) => {
    startTransition(async () => {
      const result = await updateWebhook(webhook.id, {
        is_active: !webhook.is_active,
      });
      
      if (result.success) {
        toast.success(webhook.is_active ? 'Webhookを無効化しました' : 'Webhookを有効化しました');
        fetchWebhooks();
      } else {
        toast.error(result.error || '更新に失敗しました');
      }
    });
  };

  // シークレット再生成
  const handleRegenerateSecret = async (webhook: WebhookType) => {
    startTransition(async () => {
      const result = await regenerateWebhookSecret(webhook.id);
      
      if (result.data) {
        toast.success('シークレットを再生成しました');
        fetchWebhooks();
      } else {
        toast.error(result.error || '再生成に失敗しました');
      }
    });
  };

  // テスト送信
  const handleTest = async (webhook: WebhookType) => {
    startTransition(async () => {
      const result = await testWebhook(webhook.id);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  // シークレットコピー
  const handleCopySecret = async (secret: string, webhookId: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopiedSecret(webhookId);
      setTimeout(() => setCopiedSecret(null), 2000);
      toast.success('シークレットをコピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  // イベント選択の切り替え
  const toggleEvent = (eventType: WebhookEventType) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventType)
        ? prev.events.filter(e => e !== eventType)
        : [...prev.events, eventType],
    }));
    if (formErrors.events) {
      setFormErrors(prev => ({ ...prev, events: '' }));
    }
  };

  // ローディング
  if (orgLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Webhook設定</h1>
          <p className="text-muted-foreground">イベント発生時に外部サービスへ通知を送信</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Webhookを追加
        </Button>
      </div>

      {/* 説明カード */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            Webhookとは
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Webhookを使用すると、注文の作成や商品の更新などのイベントが発生した際に、
            指定したURLへリアルタイムで通知を送信できます。
          </p>
          <p>
            外部のCRM、在庫管理システム、Slackなどと連携する際に便利です。
          </p>
        </CardContent>
      </Card>

      {/* Webhook一覧 */}
      <div className="space-y-4">
        {webhooks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Webhook className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">Webhookがまだ登録されていません</p>
              <p className="text-sm text-muted-foreground">
                「Webhookを追加」ボタンから新しいWebhookを作成してください
              </p>
            </CardContent>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${webhook.is_active ? 'bg-green-100' : 'bg-slate-100'}`}>
                      <Webhook className={`h-5 w-5 ${webhook.is_active ? 'text-green-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{webhook.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {webhook.url}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                      {webhook.is_active ? '有効' : '無効'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={isPending}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTest(webhook)}>
                          <Send className="mr-2 h-4 w-4" />
                          テスト送信
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(webhook)}>
                          {webhook.is_active ? (
                            <>
                              <AlertCircle className="mr-2 h-4 w-4" />
                              無効化
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              有効化
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRegenerateSecret(webhook)}>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          シークレット再生成
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setWebhookToDelete(webhook);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* シークレット */}
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground flex-shrink-0">シークレット:</span>
                  <code className="flex-1 font-mono text-sm">
                    {visibleSecrets.has(webhook.id) 
                      ? webhook.secret 
                      : '•'.repeat(40)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setVisibleSecrets(prev => {
                        const next = new Set(prev);
                        if (next.has(webhook.id)) {
                          next.delete(webhook.id);
                        } else {
                          next.add(webhook.id);
                        }
                        return next;
                      });
                    }}
                  >
                    {visibleSecrets.has(webhook.id) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleCopySecret(webhook.secret, webhook.id)}
                  >
                    {copiedSecret === webhook.id ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* イベント */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">購読イベント:</p>
                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map((event) => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {getEventLabel(event)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* 設定 */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3.5 w-3.5" />
                    リトライ: {webhook.retry_count}回
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    タイムアウト: {webhook.timeout_ms / 1000}秒
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ドキュメントリンク */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <p className="text-sm text-muted-foreground">
            Webhookの詳細な使い方やペイロード形式については、ドキュメントをご参照ください
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/docs/webhooks" target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              ドキュメント
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* 作成ダイアログ */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-primary" />
              新しいWebhookを作成
            </DialogTitle>
            <DialogDescription>
              イベント発生時に通知を送信するエンドポイントを設定します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 名前 */}
            <div className="space-y-2">
              <Label htmlFor="name">名前 <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                placeholder="例: 注文通知 Slack連携"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                }}
                className={formErrors.name ? 'border-destructive' : ''}
              />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">エンドポイントURL <span className="text-destructive">*</span></Label>
              <Input
                id="url"
                placeholder="https://example.com/webhook"
                value={formData.url}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, url: e.target.value }));
                  if (formErrors.url) setFormErrors(prev => ({ ...prev, url: '' }));
                }}
                className={formErrors.url ? 'border-destructive' : ''}
              />
              {formErrors.url && <p className="text-xs text-destructive">{formErrors.url}</p>}
              <p className="text-xs text-muted-foreground">
                HTTPSのURLを指定してください
              </p>
            </div>

            {/* イベント選択 */}
            <div className="space-y-2">
              <Label>購読するイベント <span className="text-destructive">*</span></Label>
              <div className="border rounded-lg p-4 space-y-4 max-h-60 overflow-y-auto">
                {Object.entries(EVENT_CATEGORIES).map(([categoryKey, category]) => (
                  <div key={categoryKey} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{category.label}</p>
                    <div className="space-y-2 pl-2">
                      {category.events.map((event) => (
                        <label 
                          key={event.type} 
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <Checkbox
                            checked={formData.events.includes(event.type)}
                            onCheckedChange={() => toggleEvent(event.type)}
                          />
                          <span className="text-sm">{event.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {formErrors.events && <p className="text-xs text-destructive">{formErrors.events}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              作成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Webhookを削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{webhookToDelete?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


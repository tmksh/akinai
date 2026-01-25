'use client';

import { useState, useEffect, useTransition } from 'react';
import { ArrowLeft, Key, Copy, RefreshCw, Trash2, Check, AlertTriangle, Loader2, Eye, EyeOff, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOrganization } from '@/components/providers/organization-provider';
import { generateNewApiKey, revokeApiKey, checkApiKeyExists } from '@/lib/actions/settings';
import { toast } from 'sonner';

export default function ApiSettingsPage() {
  const { organization } = useOrganization();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  
  const [apiKeyExists, setApiKeyExists] = useState(false);
  const [lastFour, setLastFour] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  // APIキーの存在確認
  useEffect(() => {
    async function checkKey() {
      if (!organization?.id) return;
      
      const result = await checkApiKeyExists(organization.id);
      setApiKeyExists(result.exists);
      setLastFour(result.lastFour);
      setIsLoading(false);
    }
    
    checkKey();
  }, [organization?.id]);

  // APIキーを生成
  const handleGenerate = async () => {
    if (!organization?.id) return;
    
    startTransition(async () => {
      const { data, error } = await generateNewApiKey(organization.id);
      
      if (data) {
        setNewApiKey(data.apiKey);
        setApiKeyExists(true);
        setLastFour(data.apiKey.slice(-4));
        setShowGenerateDialog(false);
        toast.success('APIキーを生成しました');
      } else {
        toast.error(error || 'APIキーの生成に失敗しました');
      }
    });
  };

  // APIキーを無効化
  const handleRevoke = async () => {
    if (!organization?.id) return;
    
    startTransition(async () => {
      const { success, error } = await revokeApiKey(organization.id);
      
      if (success) {
        setApiKeyExists(false);
        setLastFour(null);
        setNewApiKey(null);
        setShowRevokeDialog(false);
        toast.success('APIキーを無効化しました');
      } else {
        toast.error(error || 'APIキーの無効化に失敗しました');
      }
    });
  };

  // クリップボードにコピー
  const handleCopy = async () => {
    if (!newApiKey) return;
    
    try {
      await navigator.clipboard.writeText(newApiKey);
      setCopied(true);
      toast.success('クリップボードにコピーしました');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
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
        <div>
          <h1 className="text-2xl font-bold">API設定</h1>
          <p className="text-muted-foreground">外部連携用のAPIキーを管理</p>
        </div>
      </div>

      {/* 新しいAPIキーの表示（生成直後のみ） */}
      {newApiKey && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/30">
          <Key className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-400">
            APIキーが生成されました
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-sm text-green-700 dark:text-green-300 mb-3">
              このキーは一度だけ表示されます。安全な場所に保存してください。
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 rounded-md font-mono text-sm border">
                {showKey ? newApiKey : '•'.repeat(40) + newApiKey.slice(-4)}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* APIキー管理 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>APIキー</CardTitle>
          </div>
          <CardDescription>
            フロントエンドアプリケーションからAPIにアクセスするためのキー
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKeyExists ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">APIキーが設定されています</p>
                    <p className="text-sm text-muted-foreground">
                      末尾: ****{lastFour}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  有効
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowGenerateDialog(true)}
                  disabled={isPending}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  キーを再生成
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRevokeDialog(true)}
                  disabled={isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  キーを無効化
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">APIキーが設定されていません</p>
                    <p className="text-sm text-muted-foreground">
                      外部アプリケーションからAPIを利用するにはキーが必要です
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">未設定</Badge>
              </div>
              
              <Button
                className="btn-premium"
                onClick={() => setShowGenerateDialog(true)}
                disabled={isPending}
              >
                <Key className="mr-2 h-4 w-4" />
                APIキーを生成
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API使用方法 */}
      <Card>
        <CardHeader>
          <CardTitle>APIの使用方法</CardTitle>
          <CardDescription>
            外部アプリケーションからAPIを呼び出す方法
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">認証ヘッダー</h4>
            <code className="block p-3 bg-muted rounded-md text-sm font-mono">
              Authorization: Bearer sk_live_xxxxxxxxxxxx
            </code>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">商品一覧を取得</h4>
            <code className="block p-3 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap">
{`curl -X GET \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  https://your-domain.com/api/v1/products`}
            </code>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">注文を作成</h4>
            <code className="block p-3 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap">
{`curl -X POST \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"items": [...], "customer": {...}}' \\
  https://your-domain.com/api/v1/orders`}
            </code>
          </div>

          <div className="pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/docs/api" target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                APIドキュメントを見る
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 利用可能なエンドポイント */}
      <Card>
        <CardHeader>
          <CardTitle>利用可能なエンドポイント</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { method: 'GET', path: '/api/v1/products', description: '商品一覧を取得' },
              { method: 'GET', path: '/api/v1/products/:id', description: '商品詳細を取得' },
              { method: 'GET', path: '/api/v1/categories', description: 'カテゴリ一覧を取得' },
              { method: 'POST', path: '/api/v1/orders', description: '注文を作成' },
              { method: 'GET', path: '/api/v1/contents', description: 'コンテンツ一覧を取得' },
              { method: 'GET', path: '/api/v1/contents/:id', description: 'コンテンツ詳細を取得' },
              { method: 'POST', path: '/api/v1/cart/validate', description: 'カート内容を検証' },
            ].map((endpoint) => (
              <div
                key={endpoint.path}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
              >
                <Badge
                  variant={endpoint.method === 'GET' ? 'secondary' : 'default'}
                  className={endpoint.method === 'POST' ? 'bg-green-500' : ''}
                >
                  {endpoint.method}
                </Badge>
                <code className="text-sm font-mono">{endpoint.path}</code>
                <span className="text-sm text-muted-foreground ml-auto">
                  {endpoint.description}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 生成確認ダイアログ */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {apiKeyExists ? 'APIキーを再生成しますか？' : 'APIキーを生成しますか？'}
            </DialogTitle>
            <DialogDescription>
              {apiKeyExists
                ? '新しいキーを生成すると、古いキーは無効になります。現在APIを使用しているアプリケーションは動作しなくなります。'
                : 'APIキーを生成すると、外部アプリケーションからAPIにアクセスできるようになります。'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleGenerate} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {apiKeyExists ? '再生成する' : '生成する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 無効化確認ダイアログ */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>APIキーを無効化しますか？</DialogTitle>
            <DialogDescription>
              APIキーを無効化すると、このキーを使用しているすべてのアプリケーションがAPIにアクセスできなくなります。
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              無効化する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


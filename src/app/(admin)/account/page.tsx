'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Shield, 
  Key, 
  Bell, 
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function AccountSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notifications, setNotifications] = useState({
    email: true,
    orderUpdates: true,
    lowStock: true,
    newsletter: false,
    marketing: false,
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('新しいパスワードが一致しません');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast.error('パスワードは8文字以上で設定してください');
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('パスワードを変更しました');
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsLoading(false);
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('通知設定を更新しました');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold">アカウント設定</h1>
        <p className="text-muted-foreground">
          セキュリティと通知の設定を管理します
        </p>
      </div>

      {/* セキュリティ概要 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-500" />
                セキュリティ状況
              </CardTitle>
              <CardDescription>アカウントのセキュリティ設定の概要</CardDescription>
            </div>
            <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
              <CheckCircle className="h-3 w-3 mr-1" />
              良好
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950">
                <Lock className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium">パスワード</p>
                <p className="text-xs text-muted-foreground">30日前に更新</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950">
                <Smartphone className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium">2段階認証</p>
                <p className="text-xs text-muted-foreground">未設定</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950">
                <Mail className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium">メール認証</p>
                <p className="text-xs text-muted-foreground">認証済み</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* パスワード変更 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-orange-500" />
            パスワード変更
          </CardTitle>
          <CardDescription>
            定期的にパスワードを変更することをお勧めします
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">現在のパスワード</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="現在のパスワードを入力"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">新しいパスワード</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="8文字以上"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">パスワード確認</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="再度入力"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isLoading || !passwordForm.currentPassword || !passwordForm.newPassword}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    変更中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    パスワードを変更
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2段階認証 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-orange-500" />
                2段階認証
              </CardTitle>
              <CardDescription>
                ログイン時に追加の認証を要求します
              </CardDescription>
            </div>
            <Badge variant="secondary">準備中</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium">2段階認証が未設定です</p>
                <p className="text-xs text-muted-foreground">セキュリティ向上のため、設定をお勧めします</p>
              </div>
            </div>
            <Button variant="outline" disabled>
              設定する
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 通知設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-orange-500" />
            通知設定
          </CardTitle>
          <CardDescription>
            受け取りたい通知を選択してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">メール通知</p>
              <p className="text-sm text-muted-foreground">重要な更新をメールで受け取る</p>
            </div>
            <Switch
              checked={notifications.email}
              onCheckedChange={() => handleNotificationChange('email')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">注文更新</p>
              <p className="text-sm text-muted-foreground">新規注文やステータス変更を通知</p>
            </div>
            <Switch
              checked={notifications.orderUpdates}
              onCheckedChange={() => handleNotificationChange('orderUpdates')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">在庫アラート</p>
              <p className="text-sm text-muted-foreground">在庫が少なくなった時に通知</p>
            </div>
            <Switch
              checked={notifications.lowStock}
              onCheckedChange={() => handleNotificationChange('lowStock')}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">ニュースレター</p>
              <p className="text-sm text-muted-foreground">新機能やアップデート情報</p>
            </div>
            <Switch
              checked={notifications.newsletter}
              onCheckedChange={() => handleNotificationChange('newsletter')}
            />
          </div>
        </CardContent>
      </Card>

      {/* セッション管理 */}
      <Card>
        <CardHeader>
          <CardTitle>ログイン中のデバイス</CardTitle>
          <CardDescription>現在ログインしているデバイスを確認できます</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-950">
                <Smartphone className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium">現在のデバイス</p>
                <p className="text-xs text-muted-foreground">macOS • Chrome • 東京</p>
              </div>
            </div>
            <Badge variant="outline" className="text-emerald-600">アクティブ</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 危険ゾーン */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">危険な操作</CardTitle>
          <CardDescription>
            これらの操作は取り消すことができません
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">すべてのセッションからログアウト</p>
              <p className="text-sm text-muted-foreground">他のすべてのデバイスからログアウトします</p>
            </div>
            <Button variant="outline">ログアウト</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-destructive">アカウント削除</p>
              <p className="text-sm text-muted-foreground">アカウントとすべてのデータを完全に削除します</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">削除する</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>本当にアカウントを削除しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    この操作は取り消すことができません。アカウントとすべての関連データが完全に削除されます。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    削除する
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* クイックリンク */}
      <Card>
        <CardHeader>
          <CardTitle>関連設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link 
            href="/profile" 
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
          >
            <span className="font-medium">プロフィール設定</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link 
            href="/settings" 
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
          >
            <span className="font-medium">組織設定</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { ArrowLeft, Bell, Mail, Smartphone, Package, ShoppingCart, MessageSquare, Users, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  icon: React.ReactNode;
}

const defaultSettings: NotificationSetting[] = [
  {
    id: 'new_order',
    label: '新規注文',
    description: '新しい注文が入った時に通知',
    email: true,
    push: true,
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  {
    id: 'order_status',
    label: '注文ステータス更新',
    description: '注文のステータスが変更された時に通知',
    email: true,
    push: false,
    icon: <Package className="h-4 w-4" />,
  },
  {
    id: 'low_stock',
    label: '在庫アラート',
    description: '商品の在庫が少なくなった時に通知',
    email: true,
    push: true,
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    id: 'new_inquiry',
    label: '新規問い合わせ',
    description: '顧客からの問い合わせがあった時に通知',
    email: true,
    push: true,
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: 'member_joined',
    label: 'メンバー参加',
    description: '新しいメンバーが組織に参加した時に通知',
    email: false,
    push: false,
    icon: <Users className="h-4 w-4" />,
  },
];

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>(defaultSettings);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);

  const handleToggle = (id: string, type: 'email' | 'push') => {
    setSettings(prev =>
      prev.map(setting =>
        setting.id === id
          ? { ...setting, [type]: !setting[type] }
          : setting
      )
    );
    toast.success('通知設定を更新しました');
  };

  const handleMasterToggle = (type: 'email' | 'push', enabled: boolean) => {
    if (type === 'email') {
      setEmailEnabled(enabled);
    } else {
      setPushEnabled(enabled);
    }
    toast.success(`${type === 'email' ? 'メール' : 'プッシュ'}通知を${enabled ? '有効' : '無効'}にしました`);
  };

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
          <h1 className="text-2xl font-bold">通知設定</h1>
          <p className="text-muted-foreground">メール通知やアラートの設定</p>
        </div>
      </div>

      {/* 通知方法の設定 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>通知方法</CardTitle>
          </div>
          <CardDescription>
            通知を受け取る方法を設定します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="email-toggle" className="text-base font-medium">
                  メール通知
                </Label>
                <p className="text-sm text-muted-foreground">
                  重要な通知をメールで受け取る
                </p>
              </div>
            </div>
            <Switch
              id="email-toggle"
              checked={emailEnabled}
              onCheckedChange={(checked) => handleMasterToggle('email', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="push-toggle" className="text-base font-medium">
                  プッシュ通知
                </Label>
                <p className="text-sm text-muted-foreground">
                  ブラウザでプッシュ通知を受け取る
                </p>
              </div>
            </div>
            <Switch
              id="push-toggle"
              checked={pushEnabled}
              onCheckedChange={(checked) => handleMasterToggle('push', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 通知の種類 */}
      <Card>
        <CardHeader>
          <CardTitle>通知の種類</CardTitle>
          <CardDescription>
            通知を受け取るイベントを選択します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {settings.map((setting, index) => (
              <div key={setting.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted mt-0.5">
                      {setting.icon}
                    </div>
                    <div>
                      <p className="font-medium">{setting.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {setting.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`${setting.id}-email`} className="text-sm text-muted-foreground">
                        メール
                      </Label>
                      <Switch
                        id={`${setting.id}-email`}
                        checked={setting.email && emailEnabled}
                        onCheckedChange={() => handleToggle(setting.id, 'email')}
                        disabled={!emailEnabled}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`${setting.id}-push`} className="text-sm text-muted-foreground">
                        プッシュ
                      </Label>
                      <Switch
                        id={`${setting.id}-push`}
                        checked={setting.push && pushEnabled}
                        onCheckedChange={() => handleToggle(setting.id, 'push')}
                        disabled={!pushEnabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ダイジェスト設定 */}
      <Card>
        <CardHeader>
          <CardTitle>ダイジェストメール</CardTitle>
          <CardDescription>
            定期的なサマリーメールの設定
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">日次レポート</p>
              <p className="text-sm text-muted-foreground">
                毎日の売上・注文サマリーをメールで受け取る
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">週次レポート</p>
              <p className="text-sm text-muted-foreground">
                週間の売上・トレンドをメールで受け取る
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">月次レポート</p>
              <p className="text-sm text-muted-foreground">
                月間の売上・分析レポートをメールで受け取る
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

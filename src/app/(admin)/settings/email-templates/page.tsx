'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Bell, Save, Loader2, Eye, RotateCcw, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { EmailTemplateSettings } from '@/app/api/settings/email-templates/route';

const VARIABLES = [
  { key: '{shopName}', desc: 'ショップ名' },
  { key: '{orderNumber}', desc: '注文番号' },
  { key: '{customerName}', desc: '顧客名' },
  { key: '{total}', desc: '合計金額' },
  { key: '{agentCode}', desc: '代理店コード（代理店通知のみ）' },
  { key: '{commission}', desc: 'コミッション金額（代理店通知のみ）' },
];

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplateSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<'confirmation' | 'notification' | 'agent' | null>(null);

  useEffect(() => {
    fetch('/api/settings/email-templates')
      .then(r => r.json())
      .then(data => { setTemplates(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    if (!templates) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/email-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templates),
      });
      if (res.ok) {
        toast.success('メールテンプレートを保存しました');
      } else {
        toast.error('保存に失敗しました');
      }
    } catch {
      toast.error('エラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  const update = (
    type: keyof EmailTemplateSettings,
    field: string,
    value: string | boolean
  ) => {
    if (!templates) return;
    setTemplates({
      ...templates,
      [type]: { ...templates[type], [field]: value },
    });
  };

  if (isLoading || !templates) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">メールテンプレート</h1>
            <p className="text-muted-foreground text-sm">注文確認・通知メールの件名・本文を自由に編集できます</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          保存
        </Button>
      </div>

      {/* 変数一覧 */}
      <Card className="border-sky-200 bg-sky-50/50 dark:bg-sky-950/20">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-sky-700 dark:text-sky-300 mb-2">使用できる変数</p>
          <div className="flex flex-wrap gap-2">
            {VARIABLES.map(v => (
              <div key={v.key} className="flex items-center gap-1.5">
                <code className="text-xs bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-700 px-2 py-0.5 rounded font-mono text-sky-700 dark:text-sky-300">
                  {v.key}
                </code>
                <span className="text-xs text-muted-foreground">{v.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 注文確認メール（顧客向け） */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">注文確認メール（顧客向け）</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={templates.order_confirmation.enabled}
                onCheckedChange={v => update('order_confirmation', 'enabled', v)}
              />
              <Badge variant={templates.order_confirmation.enabled ? 'default' : 'secondary'}>
                {templates.order_confirmation.enabled ? '有効' : '無効'}
              </Badge>
            </div>
          </div>
          <CardDescription>決済完了・注文確定時にお客様へ自動送信されます</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">件名</Label>
            <Input
              className="mt-1.5"
              value={templates.order_confirmation.subject}
              onChange={e => update('order_confirmation', 'subject', e.target.value)}
              placeholder="【{shopName}】ご注文ありがとうございます..."
            />
          </div>
          <Separator />
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">ヘッダーテキスト</Label>
            <Input
              className="mt-1.5"
              value={templates.order_confirmation.headerText}
              onChange={e => update('order_confirmation', 'headerText', e.target.value)}
              placeholder="ご注文ありがとうございます"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">本文（冒頭）</Label>
            <Textarea
              className="mt-1.5 min-h-[80px] text-sm"
              value={templates.order_confirmation.bodyText}
              onChange={e => update('order_confirmation', 'bodyText', e.target.value)}
              placeholder="この度はご注文いただき..."
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">フッターテキスト</Label>
            <Textarea
              className="mt-1.5 min-h-[60px] text-sm"
              value={templates.order_confirmation.footerText}
              onChange={e => update('order_confirmation', 'footerText', e.target.value)}
              placeholder="ご不明な点がございましたら..."
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreview(preview === 'confirmation' ? null : 'confirmation')}
            >
              <Eye className="mr-2 h-3.5 w-3.5" />
              {preview === 'confirmation' ? 'プレビューを閉じる' : 'プレビュー'}
            </Button>
          </div>
          {preview === 'confirmation' && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-semibold text-xs text-muted-foreground">件名プレビュー</p>
              <p className="font-medium">
                {templates.order_confirmation.subject
                  .replace('{shopName}', 'サンプルショップ')
                  .replace('{orderNumber}', 'ORD-20260418-0001')}
              </p>
              <Separator />
              <p className="font-bold text-base">{templates.order_confirmation.headerText}</p>
              <p className="whitespace-pre-line text-muted-foreground">{templates.order_confirmation.bodyText}</p>
              <p className="text-xs text-muted-foreground italic">（注文明細・お届け先がここに表示されます）</p>
              <p className="whitespace-pre-line text-muted-foreground text-xs">{templates.order_confirmation.footerText}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 管理者通知メール */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">新規注文通知（管理者向け）</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={templates.order_notification.enabled}
                onCheckedChange={v => update('order_notification', 'enabled', v)}
              />
              <Badge variant={templates.order_notification.enabled ? 'default' : 'secondary'}>
                {templates.order_notification.enabled ? '有効' : '無効'}
              </Badge>
            </div>
          </div>
          <CardDescription>注文が入るたびに管理者へ通知メールを送信します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">件名</Label>
            <Input
              className="mt-1.5"
              value={templates.order_notification.subject}
              onChange={e => update('order_notification', 'subject', e.target.value)}
              placeholder="【新規注文】{orderNumber}..."
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">
              通知先メールアドレス
              <span className="text-muted-foreground font-normal ml-1">（空欄の場合は組織の連絡先メールを使用）</span>
            </Label>
            <Input
              className="mt-1.5"
              type="email"
              value={templates.order_notification.adminEmail}
              onChange={e => update('order_notification', 'adminEmail', e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreview(preview === 'notification' ? null : 'notification')}
            >
              <Eye className="mr-2 h-3.5 w-3.5" />
              {preview === 'notification' ? 'プレビューを閉じる' : 'プレビュー'}
            </Button>
          </div>
          {preview === 'notification' && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-semibold text-xs text-muted-foreground">件名プレビュー</p>
              <p className="font-medium">
                {templates.order_notification.subject
                  .replace('{orderNumber}', 'ORD-20260418-0001')
                  .replace('{customerName}', '山田 太郎')
                  .replace('{total}', '¥11,000')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 代理店向け注文通知 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">代理店向け注文通知</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={templates.agent_notification.enabled}
                onCheckedChange={v => update('agent_notification', 'enabled', v)}
              />
              <Badge variant={templates.agent_notification.enabled ? 'default' : 'secondary'}>
                {templates.agent_notification.enabled ? '有効' : '無効'}
              </Badge>
            </div>
          </div>
          <CardDescription>代理店コード経由の注文時に、その代理店へ自動通知します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">件名</Label>
            <Input
              className="mt-1.5"
              value={templates.agent_notification.subject}
              onChange={e => update('agent_notification', 'subject', e.target.value)}
              placeholder="【{shopName}】代理店経由の注文が入りました..."
            />
          </div>
          <div>
            <Label className="text-xs font-semibold text-muted-foreground">本文</Label>
            <Textarea
              className="mt-1.5 min-h-[100px] text-sm"
              value={templates.agent_notification.bodyText}
              onChange={e => update('agent_notification', 'bodyText', e.target.value)}
              placeholder="お世話になっております。&#10;あなたの代理店コード（{agentCode}）経由で..."
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreview(preview === 'agent' ? null : 'agent')}
            >
              <Eye className="mr-2 h-3.5 w-3.5" />
              {preview === 'agent' ? 'プレビューを閉じる' : 'プレビュー'}
            </Button>
          </div>
          {preview === 'agent' && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-semibold text-xs text-muted-foreground">件名プレビュー</p>
              <p className="font-medium">
                {templates.agent_notification.subject
                  .replace('{shopName}', 'サンプルショップ')
                  .replace('{orderNumber}', 'ORD-20260418-0001')}
              </p>
              <Separator />
              <p className="whitespace-pre-line text-muted-foreground">
                {templates.agent_notification.bodyText
                  .replace('{agentCode}', 'AGT-001')
                  .replace('{commission}', '¥1,100')
                  .replace('{orderNumber}', 'ORD-20260418-0001')
                  .replace('{customerName}', '山田 太郎')
                  .replace('{total}', '¥11,000')
                  .replace('{shopName}', 'サンプルショップ')}
              </p>
              <p className="text-xs text-muted-foreground italic">（注文内容・コミッション詳細がここに表示されます）</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* デフォルトに戻す */}      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={async () => {
            const res = await fetch('/api/settings/email-templates');
            const defaults = await res.json();
            setTemplates(defaults);
            toast.info('デフォルト設定を読み込みました');
          }}
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          デフォルトに戻す
        </Button>
      </div>
    </div>
  );
}

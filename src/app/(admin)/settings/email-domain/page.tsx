'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, XCircle, Clock, RefreshCw,
  Globe, Mail, Copy, Loader2, Trash2, AlertCircle, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/components/providers/organization-provider';
import {
  getEmailDomainStatus,
  registerEmailDomain,
  checkEmailDomainVerification,
  removeEmailDomain,
  type EmailDomainStatus,
} from '@/lib/actions/email-domain';
import { toast } from 'sonner';
import type { ResendDomain } from '@/lib/resend-domains';

const STATUS_CONFIG: Record<ResendDomain['status'], { label: string; icon: React.ElementType; color: string }> = {
  verified:           { label: '認証済み',     icon: CheckCircle2, color: 'text-green-600' },
  pending:            { label: '確認中',        icon: Clock,        color: 'text-yellow-600' },
  not_started:        { label: '未設定',        icon: XCircle,      color: 'text-slate-400' },
  failure:            { label: '認証失敗',      icon: XCircle,      color: 'text-red-600' },
  temporary_failure:  { label: '一時的なエラー', icon: AlertCircle,  color: 'text-orange-500' },
};

export default function EmailDomainSettingsPage() {
  const { organization } = useOrganization();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<EmailDomainStatus | null>(null);

  const [domain, setDomain] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;
    getEmailDomainStatus(organization.id).then(({ data }) => {
      setStatus(data);
      setIsLoading(false);
    });
  }, [organization?.id]);

  // ドメイン入力時に自動でfromアドレスをセット
  const handleDomainChange = (value: string) => {
    setDomain(value);
    if (value && !fromAddress) {
      setFromAddress(`noreply@${value}`);
    }
  };

  const handleRegister = () => {
    if (!organization?.id || !domain || !fromAddress) return;
    startTransition(async () => {
      const { data, error } = await registerEmailDomain(organization.id, domain.trim().toLowerCase(), fromAddress.trim().toLowerCase());
      if (error) { toast.error(error); return; }
      setStatus(data);
      setShowForm(false);
      toast.success('ドメインを登録しました。DNSレコードを設定してください。');
    });
  };

  const handleCheck = () => {
    if (!organization?.id) return;
    startTransition(async () => {
      const { verified, status: resendStatus, error } = await checkEmailDomainVerification(organization.id);
      if (error) { toast.error(error); return; }
      if (verified) {
        toast.success('ドメイン認証が完了しました！');
      } else {
        toast.info(`ステータス: ${resendStatus === 'pending' ? 'DNSが反映中です（最大48時間）' : '未確認'}`);
      }
      // ステータスを再取得
      const { data } = await getEmailDomainStatus(organization.id);
      setStatus(data);
    });
  };

  const handleRemove = () => {
    if (!organization?.id || !confirm('ドメイン設定を削除しますか？')) return;
    startTransition(async () => {
      const { error } = await removeEmailDomain(organization.id);
      if (error) { toast.error(error); return; }
      setStatus(null);
      toast.success('ドメイン設定を削除しました');
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('コピーしました');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasDomain = !!status?.domainId;
  const isVerified = status?.verified;
  const resendStatus = status?.resendStatus;
  const statusConfig = resendStatus ? STATUS_CONFIG[resendStatus] : null;
  const StatusIcon = statusConfig?.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">送信ドメインの認証</h1>
          <p className="text-muted-foreground">
            自社ドメインを認証することで、自社アドレスからメールを送信できます
          </p>
        </div>
      </div>

      {/* 仕組みの説明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sky-500" />
            認証の仕組み
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="font-bold text-sky-500 shrink-0">1.</span>このページでドメインと送信元アドレスを登録</li>
            <li className="flex gap-2"><span className="font-bold text-sky-500 shrink-0">2.</span>表示された2つのDNSレコード（CNAME）をドメインのDNS設定に追加</li>
            <li className="flex gap-2"><span className="font-bold text-sky-500 shrink-0">3.</span>「認証チェック」ボタンで確認（DNS反映に最大48時間かかる場合あり）</li>
            <li className="flex gap-2"><span className="font-bold text-sky-500 shrink-0">4.</span>認証完了後、メルマガなどが自社ドメインから送信されます</li>
          </ol>
        </CardContent>
      </Card>

      {/* 現在の状態 */}
      {hasDomain && status ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-sky-500" />
                登録中のドメイン
              </CardTitle>
              <div className="flex items-center gap-2">
                {statusConfig && StatusIcon && (
                  <span className={`flex items-center gap-1 text-sm font-medium ${statusConfig.color}`}>
                    <StatusIcon className="h-4 w-4" />
                    {statusConfig.label}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">ドメイン</p>
                <p className="font-medium">{status.domain}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">送信元アドレス</p>
                <p className="font-medium">{status.fromAddress}</p>
              </div>
            </div>

            {/* DNS レコード */}
            {status.records && status.records.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">DNSレコード（DNS管理画面に追加してください）</p>
                {status.records.map((record, i) => (
                  <div key={i} className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">{record.type}</Badge>
                        {record.status === 'verified' ? (
                          <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" />確認済み</span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-yellow-600"><Clock className="h-3 w-3" />未確認</span>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-2 text-xs">
                      <div className="flex items-center justify-between gap-2 bg-background rounded px-3 py-2 border">
                        <div className="min-w-0">
                          <span className="text-muted-foreground">名前: </span>
                          <span className="font-mono break-all">{record.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(record.name)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2 bg-background rounded px-3 py-2 border">
                        <div className="min-w-0">
                          <span className="text-muted-foreground">値: </span>
                          <span className="font-mono break-all">{record.value}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(record.value)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {!isVerified && (
                <Button onClick={handleCheck} disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  認証チェック
                </Button>
              )}
              {isVerified && (
                <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  認証完了 — このドメインから送信されます
                </div>
              )}
              <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={handleRemove} disabled={isPending}>
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ドメイン未登録 */
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-sky-500" />
              送信ドメインを登録
            </CardTitle>
            <CardDescription>
              自社ドメインを登録して、メールの送信元を自社アドレスに設定します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showForm ? (
              <Button onClick={() => setShowForm(true)}>
                <Globe className="mr-2 h-4 w-4" />
                ドメインを登録する
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>ドメイン名</Label>
                  <Input
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => handleDomainChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">サブドメインなしで入力（例: machimogu.jp）</p>
                </div>
                <div className="space-y-2">
                  <Label>送信元メールアドレス</Label>
                  <Input
                    placeholder="noreply@example.com"
                    value={fromAddress}
                    onChange={(e) => setFromAddress(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">メルマガなどのFrom欄に表示されるアドレス</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleRegister} disabled={isPending || !domain || !fromAddress}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    登録してDNSレコードを取得
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>キャンセル</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

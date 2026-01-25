'use client';

import { useState, useEffect, useTransition } from 'react';
import { ArrowLeft, Save, Building2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganization } from '@/components/providers/organization-provider';
import { getOrganization, updateOrganization } from '@/lib/actions/settings';
import { toast } from 'sonner';

export default function OrganizationSettingsPage() {
  const { organization } = useOrganization();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    frontend_url: '',
  });

  // 組織データを取得
  useEffect(() => {
    async function loadOrganization() {
      if (!organization?.id) return;
      
      const { data, error } = await getOrganization(organization.id);
      
      if (data) {
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          website: data.website || '',
          address: data.address || '',
          frontend_url: data.frontend_url || '',
        });
      }
      
      setIsLoading(false);
    }
    
    loadOrganization();
  }, [organization?.id]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organization?.id) {
      toast.error('組織が設定されていません');
      return;
    }

    startTransition(async () => {
      const { data, error } = await updateOrganization(organization.id, formData);
      
      if (data) {
        toast.success('組織情報を更新しました');
      } else {
        toast.error(error || '更新に失敗しました');
      }
    });
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
          <h1 className="text-2xl font-bold">組織設定</h1>
          <p className="text-muted-foreground">店舗・会社の基本情報を設定</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>基本情報</CardTitle>
            </div>
            <CardDescription>
              店舗や会社の基本的な情報を入力してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">組織名 *</Label>
                <Input
                  id="name"
                  placeholder="株式会社〇〇 / 〇〇ストア"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="info@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  placeholder="03-1234-5678"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">ウェブサイト</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">住所</Label>
              <Textarea
                id="address"
                placeholder="〒000-0000 東京都..."
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* フロントエンド連携 */}
        <Card>
          <CardHeader>
            <CardTitle>フロントエンド連携</CardTitle>
            <CardDescription>
              ショップサイトとの連携設定（プレビュー機能に使用）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="frontend_url">フロントエンドURL</Label>
              <Input
                id="frontend_url"
                type="url"
                placeholder="https://shop.example.com"
                value={formData.frontend_url}
                onChange={(e) => handleChange('frontend_url', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                コンテンツ編集時のリアルタイムプレビューに使用されます
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button type="submit" className="btn-premium" disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存
          </Button>
        </div>
      </form>
    </div>
  );
}

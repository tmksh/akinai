'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Building2,
  Save,
  Loader2,
  Calendar,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  phone: string;
  department: string;
  bio: string;
  role: string;
  joinedAt: string | null;
  lastLoginAt: string | null;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  owner:   { label: 'オーナー',       color: 'bg-red-100 text-red-700' },
  admin:   { label: '管理者',         color: 'bg-orange-100 text-orange-700' },
  manager: { label: 'マネージャー',   color: 'bg-amber-100 text-amber-700' },
  editor:  { label: '編集者',         color: 'bg-yellow-100 text-yellow-800' },
  viewer:  { label: '閲覧者',         color: 'bg-stone-100 text-stone-600' },
};

export default function ProfilePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', department: '', bio: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const meta = user.user_metadata ?? {};

        // users テーブルから name / avatar / current_organization_id を取得
        const { data: userData } = await supabase
          .from('users')
          .select('name, avatar, current_organization_id, last_login_at')
          .eq('id', user.id)
          .single();

        // organization_members からロールと参加日を取得
        let role = 'viewer';
        let joinedAt: string | null = null;
        if (userData?.current_organization_id) {
          const { data: member } = await supabase
            .from('organization_members')
            .select('role, joined_at')
            .eq('user_id', user.id)
            .eq('organization_id', userData.current_organization_id)
            .eq('is_active', true)
            .single();
          if (member) {
            role = member.role;
            joinedAt = member.joined_at;
          }
        }

        const p: ProfileData = {
          id: user.id,
          name: userData?.name ?? meta.name ?? user.email?.split('@')[0] ?? '',
          email: user.email ?? '',
          avatar: userData?.avatar ?? meta.avatar_url ?? null,
          phone: meta.phone ?? '',
          department: meta.department ?? '',
          bio: meta.bio ?? '',
          role,
          joinedAt,
          lastLoginAt: userData?.last_login_at ?? null,
        };

        setProfile(p);
        setFormData({ name: p.name, phone: p.phone, department: p.department, bio: p.bio });
      } catch (e) {
        console.error(e);
        toast.error('プロフィールの取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSaving(true);

    try {
      // user_metadata (phone, department, bio) を更新
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          phone: formData.phone,
          department: formData.department,
          bio: formData.bio,
        },
      });
      if (authError) throw authError;

      // users テーブルの name を更新
      const { error: dbError } = await supabase
        .from('users')
        .update({ name: formData.name, updated_at: new Date().toISOString() })
        .eq('id', profile.id);
      if (dbError) throw dbError;

      setProfile(prev => prev ? { ...prev, ...formData } : prev);
      toast.success('プロフィールを更新しました');
    } catch (err) {
      console.error(err);
      toast.error('保存に失敗しました。再度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const roleBadge = ROLE_LABELS[profile.role] ?? ROLE_LABELS.viewer;
  const initials = profile.name.slice(0, 2) || profile.email.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">プロフィール</h1>
        <p className="text-muted-foreground">あなたのアカウント情報を確認・編集できます</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* プロフィールカード */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar ?? ''} />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-500 text-white text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <h2 className="mt-4 text-lg font-semibold">{profile.name}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <span className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${roleBadge.color}`}>
                {roleBadge.label}
              </span>

              <Separator className="my-4" />

              <div className="w-full space-y-2 text-sm text-left">
                {profile.department && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    <span>{profile.department}</span>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate text-xs">{profile.email}</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="w-full space-y-1.5 text-xs text-muted-foreground text-left">
                {profile.joinedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>参加日: {new Date(profile.joinedAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                )}
                {profile.lastLoginAt && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>最終ログイン: {new Date(profile.lastLoginAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 編集フォーム */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>表示名や連絡先情報を編集できます</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    <User className="inline h-4 w-4 mr-1" />
                    表示名
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="表示名を入力"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    <Mail className="inline h-4 w-4 mr-1" />
                    メールアドレス
                  </Label>
                  <Input
                    value={profile.email}
                    disabled
                    className="opacity-60 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground">メールアドレスは変更できません</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="inline h-4 w-4 mr-1" />
                    電話番号
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="090-0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">
                    <Building2 className="inline h-4 w-4 mr-1" />
                    部署
                  </Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="例: 営業部"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">自己紹介</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="簡単な自己紹介を入力してください"
                  rows={4}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving} className="btn-premium">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      変更を保存
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Camera,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// モックユーザーデータ
const mockUser = {
  id: '1',
  name: '山田 太郎',
  email: 'yamada@example.com',
  phone: '090-1234-5678',
  avatar: '',
  role: 'admin',
  department: '営業部',
  bio: 'ECサイトの運営担当です。お気軽にご連絡ください。',
  joinedAt: '2024-01-15',
};

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: mockUser.name,
    email: mockUser.email,
    phone: mockUser.phone,
    department: mockUser.department,
    bio: mockUser.bio,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // 模擬的な保存処理
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('プロフィールを更新しました');
    setIsLoading(false);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return { label: '管理者', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' };
      case 'manager':
        return { label: 'マネージャー', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' };
      case 'editor':
        return { label: '編集者', color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' };
      default:
        return { label: '閲覧者', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
    }
  };

  const roleBadge = getRoleBadge(mockUser.role);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold">プロフィール</h1>
        <p className="text-muted-foreground">
          あなたのアカウント情報を確認・編集できます
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* プロフィールカード */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={mockUser.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-500 text-white text-2xl">
                    {mockUser.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </button>
              </div>
              <h2 className="mt-4 text-lg font-semibold">{mockUser.name}</h2>
              <p className="text-sm text-muted-foreground">{mockUser.email}</p>
              <span className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
              <Separator className="my-4" />
              <div className="w-full space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{mockUser.department}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{mockUser.phone}</span>
                </div>
              </div>
              <Separator className="my-4" />
              <p className="text-xs text-muted-foreground">
                参加日: {new Date(mockUser.joinedAt).toLocaleDateString('ja-JP')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 編集フォーム */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>
              表示名や連絡先情報を編集できます
            </CardDescription>
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
                    placeholder="山田 太郎"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="inline h-4 w-4 mr-1" />
                    メールアドレス
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@email.com"
                  />
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
                    placeholder="090-1234-5678"
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
                    placeholder="営業部"
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
                <Button type="submit" disabled={isLoading} className="btn-premium">
                  {isLoading ? (
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

      {/* アクティビティ */}
      <Card>
        <CardHeader>
          <CardTitle>最近のアクティビティ</CardTitle>
          <CardDescription>あなたの操作履歴</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { action: '商品「革財布 ブラック」を更新しました', time: '2時間前' },
              { action: '注文 #AK-2024-0015 のステータスを「発送済」に変更しました', time: '5時間前' },
              { action: '新しい記事「冬のおすすめアイテム」を公開しました', time: '1日前' },
              { action: 'プロフィール情報を更新しました', time: '3日前' },
            ].map((activity, index) => (
              <div key={index} className="flex items-start gap-3 text-sm">
                <div className="h-2 w-2 mt-2 rounded-full bg-orange-500" />
                <div className="flex-1">
                  <p>{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

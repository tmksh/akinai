'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Loader2, Mail, Lock } from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed:
    '認証に失敗しました。Googleの設定を確認するか、メール・パスワードでログインしてください。',
  no_organization:
    '所属する組織がありません。管理者に招待を依頼してください。',
};

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const successMessage = searchParams.get('message');

  // URLの ?error= と ?detail= を表示し、表示後にURLから削除
  useEffect(() => {
    const err = searchParams.get('error');
    const detail = searchParams.get('detail');
    if (err) {
      const message = detail
        ? decodeURIComponent(detail)
        : ERROR_MESSAGES[err] ?? '認証に失敗しました。';
      setError(message);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          setError('メールアドレスまたはパスワードが正しくありません');
        } else {
          setError(error.message);
        }
        return;
      }

      // フルページ遷移でクッキーを確実に送る
      window.location.href = '/dashboard';
    } catch {
      setError('ログイン中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        },
      });

      if (error) {
        setError('Googleログインに失敗しました');
        setIsGoogleLoading(false);
      }
    } catch {
      setError('Googleログイン中にエラーが発生しました');
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 via-amber-50 to-orange-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4">
      <Card className="relative z-10 w-full max-w-md shadow-xl border-0 bg-white dark:bg-slate-900">
        <CardContent className="pt-10 pb-8 px-8 relative z-10">
          {/* ロゴ */}
          <div className="flex flex-col items-center mb-8">
            <img
              src="/logo-shou.png?v=2"
              alt="AKINAI"
              className="h-24 w-24 object-contain drop-shadow-lg mb-2"
            />
            <h1 className="text-3xl font-bold text-orange-500 tracking-wide">
              アキナイ
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              EC管理システム
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {successMessage === 'signup_confirm_email' && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-400">
                  確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。
                </p>
              </div>
            )}
            {successMessage === 'signup_done' && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-400">
                  アカウントを作成しました。ログインしてください。
                </p>
              </div>
            )}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* メールアドレス */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-slate-700 dark:text-slate-300"
              >
                メールアドレス
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 pl-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-500/20"
                />
              </div>
            </div>

            {/* パスワード */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-slate-700 dark:text-slate-300"
                >
                  パスワード
                </Label>
                <button
                  type="button"
                  className="text-sm text-orange-500 hover:text-orange-600 hover:underline"
                >
                  パスワードを忘れた場合
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 pl-11 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:ring-orange-500/20"
                />
              </div>
            </div>

            {/* ログインボタン */}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-medium text-base shadow-lg shadow-orange-500/20 transition-all hover:shadow-xl hover:shadow-orange-500/30"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ログイン中...
                </>
              ) : (
                'ログイン'
              )}
            </Button>
          </form>

          {/* 区切り線 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-slate-900 px-4 text-slate-500">
                または
              </span>
            </div>
          </div>

          {/* Googleログイン */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Googleでログイン
          </Button>

          {/* フッターテキスト */}
          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            アカウントをお持ちでない場合は、
            <br />
            <Link href="/signup" className="text-orange-500 hover:underline font-medium">
              新規登録
            </Link>
            または管理者にお問い合わせください
          </p>
        </CardContent>
      </Card>

      {/* コピーライト */}
      <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
        © {new Date().getFullYear()} AKINAI CMS. All rights reserved.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-orange-50 via-amber-50 to-orange-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4">
          <Card className="w-full max-w-md shadow-xl border-0 bg-white dark:bg-slate-900">
            <CardContent className="pt-10 pb-8 px-8 flex flex-col items-center justify-center min-h-[320px]">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="mt-4 text-sm text-slate-500">読み込み中...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

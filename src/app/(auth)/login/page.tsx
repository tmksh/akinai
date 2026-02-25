'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed:
    '認証に失敗しました。Googleの設定を確認するか、メール・パスワードでログインしてください。',
  no_organization:
    '所属する組織がありません。管理者に招待を依頼してください。',
};

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const supabase = createClient();

  const successMessage = searchParams.get('message');

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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(
          error.message === 'Invalid login credentials'
            ? 'メールアドレスまたはパスワードが正しくありません'
            : error.message
        );
        return;
      }
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
    <div className="min-h-screen flex">

      {/* ══════════════════════════════
          左パネル：装飾サークル＋ロゴ
      ══════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-between py-12"
        style={{ background: '#f5f3ef' }}
      >
        {/* ── 装飾サークル ── */}

        {/* 右上：大きいクリーム */}
        <div
          className="pointer-events-none absolute -top-24 right-[-60px]"
          style={{
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fde68a, #fbbf24)',
            opacity: 0.85,
          }}
        />
        {/* 右上：その後ろ・オレンジ */}
        <div
          className="pointer-events-none absolute -top-10 right-[80px]"
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fb923c, #ea580c)',
            opacity: 0.75,
          }}
        />

        {/* 左中：大きいディープオレンジ */}
        <div
          className="pointer-events-none absolute top-[30%] -left-20"
          style={{
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c2410c, #9a3412)',
            opacity: 0.7,
          }}
        />

        {/* 右下：アンバー */}
        <div
          className="pointer-events-none absolute -bottom-16 right-[-40px]"
          style={{
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fed7aa, #fb923c)',
            opacity: 0.8,
          }}
        />

        {/* 左下：小さいキャメル */}
        <div
          className="pointer-events-none absolute bottom-10 left-12"
          style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fbbf24, #d97706)',
            opacity: 0.65,
          }}
        />

        {/* ── ロゴ（中央） ── */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
          <img
            src="/logo-shou.png?v=2"
            alt="AKINAI"
            className="h-24 w-24 object-contain drop-shadow-lg mb-2"
          />
          <div className="text-center">
            <p className="text-3xl font-black tracking-tight text-gray-800">アキナイ</p>
            <p className="text-sm font-medium text-gray-400 tracking-wider uppercase">
              EC Commerce
            </p>
          </div>
        </div>

        {/* ── フッターリンク ── */}
        <div className="relative z-10 flex gap-6 text-[12px] text-gray-400">
          <a href="#" className="hover:text-gray-600 transition-colors">利用規約</a>
          <a href="#" className="hover:text-gray-600 transition-colors">プライバシー</a>
          <a href="#" className="hover:text-gray-600 transition-colors">お問い合わせ</a>
        </div>
      </div>

      {/* ══════════════════════════════
          右パネル：ミニマルフォーム
      ══════════════════════════════ */}
      <div className="flex w-full flex-col justify-center bg-white px-8 py-12 lg:w-1/2 lg:px-16 xl:px-24">

        {/* モバイル用ロゴ */}
        <div className="mb-10 flex items-center gap-2 lg:hidden">
          <img src="/logo-shou.png?v=2" alt="AKINAI" className="h-8 w-8 object-contain" />
          <span className="text-lg font-black text-gray-900">アキナイ</span>
        </div>

        <div className="w-full max-w-[360px] mx-auto">

          {/* タイトル */}
          <h1 className="text-[2rem] font-black tracking-tight text-gray-900 mb-8">
            ログイン
          </h1>

          {/* アラート */}
          {successMessage === 'signup_confirm_email' && (
            <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <p className="text-sm text-emerald-700">確認メールを送信しました。リンクをクリックして有効化してください。</p>
            </div>
          )}
          {successMessage === 'signup_done' && (
            <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <p className="text-sm text-emerald-700">アカウントを作成しました。ログインしてください。</p>
            </div>
          )}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* フォーム */}
          <form onSubmit={handleLogin} className="space-y-6">

            {/* メール：アンダーラインスタイル */}
            <div>
              <label htmlFor="email" className="block text-[13px] font-semibold text-gray-500 mb-2">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full border-0 border-b-2 border-gray-200 bg-transparent pb-2 pt-1 text-[15px] text-gray-900 placeholder:text-gray-300 outline-none transition-colors focus:border-orange-400"
              />
            </div>

            {/* パスワード：アンダーラインスタイル */}
            <div>
              <label htmlFor="password" className="block text-[13px] font-semibold text-gray-500 mb-2">
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full border-0 border-b-2 border-gray-200 bg-transparent pb-2 pt-1 pr-8 text-[15px] text-gray-900 placeholder:text-gray-300 outline-none transition-colors focus:border-orange-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>

            {/* ログインボタン：ピル型 */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-full py-3 text-[15px] font-bold text-white transition-all active:scale-[.98] disabled:opacity-60"
              style={{
                background: isLoading
                  ? '#fdba74'
                  : 'linear-gradient(90deg, #fb923c 0%, #f97316 100%)',
                boxShadow: '0 4px 20px rgba(249,115,22,.35)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />ログイン中...
                </span>
              ) : 'ログイン'}
            </button>
          </form>

          {/* パスワード忘れ */}
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-[13px] text-gray-400 hover:text-orange-500 transition-colors"
            >
              パスワードを忘れた場合
            </button>
          </div>

          {/* 区切り */}
          <div className="relative my-7 flex items-center">
            <div className="flex-1 border-t border-gray-100" />
            <span className="mx-4 text-[11px] font-medium text-gray-300 uppercase tracking-wider">または</span>
            <div className="flex-1 border-t border-gray-100" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-gray-200 bg-white py-3 text-[14px] font-semibold text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md active:scale-[.98] disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Googleでログイン
          </button>

          {/* 新規登録 */}
          <p className="mt-8 text-center text-[13px] text-gray-400">
            アカウントをお持ちでない方は{' '}
            <Link href="/signup" className="font-bold text-orange-500 hover:text-orange-600 hover:underline">
              新規登録
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

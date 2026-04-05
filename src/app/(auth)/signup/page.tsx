'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ensureDefaultOrganization } from '@/lib/actions/onboarding';
import { confirmUserAndSignIn } from '@/lib/actions/auth';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const PLAN_LABELS: Record<string, { name: string; price: string; color: string }> = {
  light:    { name: 'ライトプラン',       price: '¥3,000 / 月',  color: '#38bdf8' },
  standard: { name: 'スタンダードプラン', price: '¥9,800 / 月',  color: '#2563eb' },
};

function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const supabase = createClient();

  const planKey = searchParams.get('plan') ?? '';
  const planInfo = PLAN_LABELS[planKey] ?? null;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }
    if (password !== passwordConfirm) {
      setError('パスワードとパスワード（確認）が一致しません');
      return;
    }

    setIsLoading(true);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: (name || email).trim() || email },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
          setError('このメールアドレスは既に登録されています。ログインしてください。');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (signUpData.user?.identities?.length === 0) {
        setError('このメールアドレスは既に登録されています。ログインしてください。');
        return;
      }

      if (signUpData.user) {
        // メール確認を自動スキップしてすぐにサインイン可能にする
        await confirmUserAndSignIn(signUpData.user.id, email.trim(), password);
        await ensureDefaultOrganization();
        window.location.href = '/dashboard';
        return;
      }

      // フォールバック（通常ここには来ない）
      window.location.href = '/login?message=signup_confirm_email';
    } catch {
      setError('登録中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const message = searchParams.get('message');

  return (
    <div className="min-h-screen flex">

      {/* ══════════════════════════════
          左パネル：装飾サークル＋ロゴ
      ══════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-between py-12"
        style={{ background: '#e8f0f8' }}
      >
        {/* 右上：スカイブルー大 */}
        <div
          className="pointer-events-none absolute -top-24 right-[-60px]"
          style={{
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #bae6fd, #38bdf8)',
            opacity: 0.85,
          }}
        />
        {/* 右上：その後ろ・ブルー */}
        <div
          className="pointer-events-none absolute -top-10 right-[80px]"
          style={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #60a5fa, #2563eb)',
            opacity: 0.65,
          }}
        />
        {/* 左中：ディープブルー */}
        <div
          className="pointer-events-none absolute top-[30%] -left-20"
          style={{
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1d4ed8, #1e3a8a)',
            opacity: 0.6,
          }}
        />
        {/* 右下：ライトシアン */}
        <div
          className="pointer-events-none absolute -bottom-16 right-[-40px]"
          style={{
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #a5f3fc, #22d3ee)',
            opacity: 0.75,
          }}
        />
        {/* 左下：スモールブルー */}
        <div
          className="pointer-events-none absolute bottom-10 left-12"
          style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
            opacity: 0.6,
          }}
        />

        {/* ロゴ（中央） */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
          <div className="text-center">
            <p
              className="text-5xl font-black tracking-tight mb-1"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 40%, #67e8f9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.04em',
              }}
            >
              AKINAI
            </p>
            <p className="text-sm font-medium text-blue-300 tracking-wider uppercase">
              EC Commerce
            </p>
          </div>
        </div>

        {/* フッターリンク */}
        <div className="relative z-10 flex gap-6 text-[12px] text-blue-300">
          <Link href="/terms" className="hover:text-blue-500 transition-colors">利用規約</Link>
          <Link href="/privacy" className="hover:text-blue-500 transition-colors">プライバシー</Link>
          <Link href="/contact" className="hover:text-blue-500 transition-colors">お問い合わせ</Link>
        </div>
      </div>

      {/* ══════════════════════════════
          右パネル：フォーム
      ══════════════════════════════ */}
      <div className="flex w-full flex-col justify-center px-8 py-12 lg:w-1/2 lg:px-16 xl:px-24" style={{ background: '#f0f6fe' }}>

        {/* モバイル用ロゴ */}
        <div className="mb-10 flex items-center gap-2 lg:hidden">
          <span
            className="text-xl font-black"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 40%, #67e8f9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.03em',
            }}
          >
            AKINAI
          </span>
        </div>

        <div className="w-full max-w-[360px] mx-auto">

          {/* タイトル */}
          <h1 className="text-[2rem] font-black tracking-tight text-gray-900 mb-2">
            新規登録
          </h1>

          {/* 選択プラン表示（準備中） */}
          {planInfo && (
            <div className="mb-6 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold"
                style={{ background: '#f8faff', border: '1.5px solid #bae6fd', borderBottom: 'none', borderRadius: '0.75rem 0.75rem 0 0', color: '#4a6fa5' }}>
                <svg className="w-4 h-4 flex-shrink-0 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span>{planInfo.name}（{planInfo.price}）を選択中</span>
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#fef9c3', color: '#a16207' }}>準備中</span>
              </div>
              <div className="px-3 py-2 text-xs leading-relaxed" style={{ background: '#fffbeb', border: '1.5px solid #bae6fd', borderTop: '1px solid #fde68a', borderRadius: '0 0 0.75rem 0.75rem', color: '#92400e' }}>
                現在、プランのご契約機能を準備中です。アカウント作成後、担当よりご連絡いたします。
              </div>
            </div>
          )}

          {/* アラート */}
          {message === 'signup_done' && (
            <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <p className="text-sm text-emerald-700">アカウントを作成しました。ログインしてください。</p>
            </div>
          )}
          {error && (
            <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-6">

            {/* お名前 */}
            <div>
              <label htmlFor="name" className="block text-[13px] font-semibold text-gray-500 mb-2">
                お名前
              </label>
              <input
                id="name"
                type="text"
                placeholder="山田 太郎"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="w-full border-0 border-b-2 border-sky-200 bg-transparent pb-2 pt-1 text-[15px] text-gray-900 placeholder:text-gray-300 outline-none transition-colors focus:border-sky-500"
              />
            </div>

            {/* メールアドレス */}
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
                className="w-full border-0 border-b-2 border-sky-200 bg-transparent pb-2 pt-1 text-[15px] text-gray-900 placeholder:text-gray-300 outline-none transition-colors focus:border-sky-500"
              />
            </div>

            {/* パスワード */}
            <div>
              <label htmlFor="password" className="block text-[13px] font-semibold text-gray-500 mb-2">
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="6文字以上"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="w-full border-0 border-b-2 border-sky-200 bg-transparent pb-2 pt-1 pr-8 text-[15px] text-gray-900 placeholder:text-gray-300 outline-none transition-colors focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* パスワード（確認） */}
            <div>
              <label htmlFor="passwordConfirm" className="block text-[13px] font-semibold text-gray-500 mb-2">
                パスワード（確認）
              </label>
              <div className="relative">
                <input
                  id="passwordConfirm"
                  type={showPasswordConfirm ? 'text' : 'password'}
                  placeholder="もう一度入力"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="w-full border-0 border-b-2 border-sky-200 bg-transparent pb-2 pt-1 pr-8 text-[15px] text-gray-900 placeholder:text-gray-300 outline-none transition-colors focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-0 top-1 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* 登録ボタン */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full rounded-full py-3 text-[15px] font-bold text-white transition-all active:scale-[.98] disabled:opacity-60"
              style={{
                background: isLoading
                  ? '#7dd3fc'
                  : 'linear-gradient(90deg, #38bdf8 0%, #0ea5e9 100%)',
                boxShadow: '0 4px 20px rgba(14,165,233,.4)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />登録中...
                </span>
              ) : 'アカウントを作成'}
            </button>
          </form>

          {/* ログインへ */}
          <p className="mt-8 text-center text-[13px] text-gray-400">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="font-bold text-sky-500 hover:text-sky-600 hover:underline">
              ログイン
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#e8f0f8' }}>
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}

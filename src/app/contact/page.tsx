'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

function ContactForm() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');
  const defaultCategory = planParam === 'enterprise' ? 'enterprise' : '';

  const [form, setForm] = useState({ company: '', name: '', email: '', phone: '', category: defaultCategory, message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    setSending(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 40%, #f8faff 100%)' }}>
      {/* ナビ */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b" style={{ background: 'rgba(255,255,255,0.85)', borderColor: '#bae6fd' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-black text-xl tracking-tight" style={{
            background: 'linear-gradient(90deg, #0ea5e9, #2563eb)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            AKINAI
          </Link>
          <Link href="/" className="text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:bg-sky-50" style={{ color: '#2563eb' }}>
            ← トップページへ
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-20">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-3" style={{ color: '#0ea5e9' }}>Contact</p>
          <h1 className="text-4xl font-black tracking-tight mb-4" style={{ color: '#1e3a5f' }}>お問い合わせ</h1>
          <p className="text-base" style={{ color: '#4a6fa5' }}>
            ご質問・ご相談・デモのご依頼など、お気軽にお問い合わせください。<br />
            通常 1〜2 営業日以内にご連絡いたします。
          </p>
        </div>

        {/* エンタープライズバナー */}
        {planParam === 'enterprise' && (
          <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold"
            style={{ background: '#eff6ff', border: '1.5px solid #2563eb', color: '#1d4ed8' }}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            エンタープライズプランへのお問い合わせとして承ります
          </div>
        )}

        {submitted ? (
          <div className="rounded-2xl p-10 text-center shadow-lg" style={{ background: '#ffffff', border: '1px solid #bae6fd' }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black mb-3" style={{ color: '#1e3a5f' }}>送信完了しました</h2>
            <p className="text-sm mb-8" style={{ color: '#4a6fa5' }}>
              お問い合わせいただきありがとうございます。<br />
              担当者よりご連絡いたします（1〜2 営業日以内）。
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}
            >
              トップページへ戻る
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl p-8 shadow-lg space-y-5" style={{ background: '#ffffff', border: '1px solid #bae6fd' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1e3a5f' }}>
                  会社名 <span style={{ color: '#0ea5e9' }}>*</span>
                </label>
                <input
                  type="text" required
                  value={form.company}
                  onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  placeholder="株式会社サンプル"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', color: '#1e3a5f' }}
                  onFocus={e => (e.target.style.borderColor = '#0ea5e9')}
                  onBlur={e => (e.target.style.borderColor = '#bae6fd')}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1e3a5f' }}>
                  お名前 <span style={{ color: '#0ea5e9' }}>*</span>
                </label>
                <input
                  type="text" required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="山田 太郎"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', color: '#1e3a5f' }}
                  onFocus={e => (e.target.style.borderColor = '#0ea5e9')}
                  onBlur={e => (e.target.style.borderColor = '#bae6fd')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1e3a5f' }}>
                  メールアドレス <span style={{ color: '#0ea5e9' }}>*</span>
                </label>
                <input
                  type="email" required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="example@company.co.jp"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', color: '#1e3a5f' }}
                  onFocus={e => (e.target.style.borderColor = '#0ea5e9')}
                  onBlur={e => (e.target.style.borderColor = '#bae6fd')}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1e3a5f' }}>
                  電話番号
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="03-1234-5678"
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', color: '#1e3a5f' }}
                  onFocus={e => (e.target.style.borderColor = '#0ea5e9')}
                  onBlur={e => (e.target.style.borderColor = '#bae6fd')}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1e3a5f' }}>
                お問い合わせ種別 <span style={{ color: '#0ea5e9' }}>*</span>
              </label>
              <select
                required
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', color: form.category ? '#1e3a5f' : '#94a3b8' }}
                onFocus={e => (e.target.style.borderColor = '#0ea5e9')}
                onBlur={e => (e.target.style.borderColor = '#bae6fd')}
              >
                <option value="" disabled>選択してください</option>
                <option value="demo">デモ・トライアルのご依頼</option>
                <option value="plan">料金・プランについて</option>
                <option value="feature">機能・仕様について</option>
                <option value="enterprise">エンタープライズプランについて</option>
                <option value="other">その他</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#1e3a5f' }}>
                お問い合わせ内容 <span style={{ color: '#0ea5e9' }}>*</span>
              </label>
              <textarea
                required rows={5}
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder="ご質問・ご要望をご記入ください"
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all resize-none"
                style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', color: '#1e3a5f' }}
                onFocus={e => (e.target.style.borderColor = '#0ea5e9')}
                onBlur={e => (e.target.style.borderColor = '#bae6fd')}
              />
            </div>

            <p className="text-xs" style={{ color: '#7dd3fc' }}>
              送信いただいた個人情報は、お問い合わせ対応の目的のみに使用します。
              詳細は<Link href="/privacy" className="underline hover:text-sky-500 transition-colors">プライバシーポリシー</Link>をご確認ください。
            </p>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)' }}
            >
              {sending ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  送信中...
                </>
              ) : '送信する'}
            </button>
          </form>
        )}
      </main>

      {/* フッター */}
      <footer className="py-8 border-t mt-16" style={{ borderColor: '#bae6fd' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ color: '#4a6fa5' }}>
          <div className="flex gap-4">
            <Link href="/contact" className="hover:text-sky-400 transition-colors">お問い合わせ</Link>
            <Link href="/privacy" className="hover:text-sky-400 transition-colors">プライバシーポリシー</Link>
            <Link href="/terms" className="hover:text-sky-400 transition-colors">利用規約</Link>
          </div>
          <p>&copy; 2026 AKINAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f9ff' }}>
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    }>
      <ContactForm />
    </Suspense>
  );
}

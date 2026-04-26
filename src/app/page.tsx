'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Menu, X } from 'lucide-react';

// ログイン画面カラーパレット（全LP統一）
// bg-base: #e8f0f8 / bg-light: #f0f6fe / bg-white: #ffffff
// blue-dark: #1e3a8a, #1d4ed8, #2563eb
// blue-mid: #60a5fa, #38bdf8, #0ea5e9, #0284c7
// blue-light: #bae6fd, #7dd3fc, #a5f3fc
// cyan: #22d3ee, #67e8f9
// text-dark: #1e3a5f (= close to #1e3a8a)
// text-mid: #4a6fa5
// text-light: #94a3b8

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── ナビバー ──
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'backdrop-blur-xl shadow-sm border-b' : 'bg-transparent'
    }`}
      style={scrolled ? { background: 'rgba(240,246,254,0.95)', borderColor: '#bae6fd' } : {}}>
      <div className="max-w-6xl mx-auto px-6 h-20 py-3 flex items-center justify-between">
        <img src="/logo-akinai.png" alt="AKINAI" className="h-14 md:h-16 w-auto" />

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm transition-colors hover:text-sky-500" style={{ color: '#4a6fa5' }}>機能</a>
          <a href="#screenshots" className="text-sm transition-colors hover:text-sky-500" style={{ color: '#4a6fa5' }}>画面</a>
          <a href="#pricing" className="text-sm transition-colors hover:text-sky-500" style={{ color: '#4a6fa5' }}>料金</a>
          <Link href="/login" className="text-sm font-medium transition-colors hover:text-sky-500" style={{ color: '#2563eb' }}>ログイン</Link>
          <Link href="/signup"
            className="text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)', color: '#fff', boxShadow: '0 2px 12px rgba(37,99,235,0.3)' }}>
            無料トライアルを始める
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" style={{ color: '#2563eb' }} /> : <Menu className="h-5 w-5" style={{ color: '#2563eb' }} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t px-6 py-5 space-y-4" style={{ background: '#f0f6fe', borderColor: '#bae6fd' }}>
          <a href="#features" className="block text-sm" style={{ color: '#1e3a5f' }} onClick={() => setMobileOpen(false)}>機能</a>
          <a href="#screenshots" className="block text-sm" style={{ color: '#1e3a5f' }} onClick={() => setMobileOpen(false)}>画面</a>
          <a href="#pricing" className="block text-sm" style={{ color: '#1e3a5f' }} onClick={() => setMobileOpen(false)}>料金</a>
          <div className="flex gap-3 pt-2">
            <Link href="/login" className="text-sm font-medium" style={{ color: '#2563eb' }}>ログイン</Link>
            <Link href="/signup"
              className="text-sm font-semibold px-5 py-2 rounded-full text-white"
              style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)' }}>無料トライアルを始める</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── ヒーローセクション ──
function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative overflow-hidden" style={{ minHeight: '96vh' }}>

      {/* 背景写真（人物込みの1枚） */}
      <div className="absolute inset-0 z-0">
        <style>{`
          .fv-bg-img { object-position: center 12%; }
          @media (max-width: 1279px) { .fv-bg-img { object-position: 60% 12%; } }
          @media (max-width: 1023px) { .fv-bg-img { object-position: 65% 12%; } }
          @media (max-width: 767px)  { .fv-bg-img { object-position: 70% 12%; } }
          @media (max-width: 480px)  { .fv-bg-img { object-position: 72% 12%; } }
        `}</style>
        <Image
          src="/fv-hero.jpg"
          alt=""
          fill
          className="object-cover fv-bg-img"
          priority
          unoptimized
        />
        {/* 左側テキストエリアを読みやすく */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(105deg, rgba(240,248,255,0.80) 0%, rgba(230,244,255,0.60) 35%, rgba(210,235,255,0.15) 60%, transparent 80%)'
        }} />
      </div>

      {/* テキストコンテンツ（左寄せ・参照画像レイアウト） */}
      <div className="relative z-20 flex items-center min-h-screen" style={{ paddingTop: 64, paddingLeft: 'clamp(60px, 12vw, 220px)', paddingRight: 32 }}>
        <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ maxWidth: 520 }}>

          {/* 装飾テキスト（参照の「1st step.」に相当） */}
          <div className="relative mb-2 select-none pointer-events-none">
            <span
              className="absolute font-black italic leading-none"
              style={{
                fontSize: 'clamp(3rem, 8vw, 7rem)',
                color: 'rgba(29,78,216,0.07)',
                top: '-0.2em',
                left: '-0.05em',
                whiteSpace: 'nowrap',
                fontFamily: 'Georgia, serif',
              }}
            >
              AKINAI
            </span>
          </div>

          {/* メインキャッチコピー（参照の「一緒に一歩、踏み出そう。」に相当） */}
          <h1
            className="font-black leading-[1.1] tracking-tight mb-6 relative z-10"
            style={{ color: '#1e3a5f', fontSize: 'clamp(1.8rem, 3.2vw, 3.0rem)' }}
          >
            B2B ECを、<br />
            <span style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              whiteSpace: 'nowrap',
            }}>
              もっとかんたんに。
            </span>
          </h1>

          {/* ボディテキスト */}
          <p className="leading-loose mb-6 text-sm" style={{ color: '#334155' }}>
            B2B ECに必要なすべてを、ひとつの管理画面に。
          </p>

          {/* ダッシュボードプレビュー */}
          <div
            className="mb-8 rounded-xl overflow-hidden"
            style={{
              boxShadow: '0 8px 32px rgba(37,99,235,0.18), 0 2px 8px rgba(37,99,235,0.1)',
              border: '1.5px solid rgba(186,230,253,0.8)',
              maxWidth: 420,
            }}
          >
            <Image
              src="/screenshot-dashboard.png"
              alt="ダッシュボード"
              width={1024}
              height={554}
              className="w-full object-cover object-top"
              unoptimized
            />
          </div>

          {/* CTA ボタン（参照の丸ボタンスタイル） */}
          <Link
            href="/signup"
            className="inline-flex items-center gap-3 font-bold rounded-full transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)',
              color: '#fff',
              boxShadow: '0 4px 24px rgba(29,78,216,0.35)',
              padding: '14px 36px',
              fontSize: '0.95rem',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            1ヶ月無料トライアルで開設する
          </Link>
        </div>
      </div>

      {/* 波形ボトム */}
      <div className="absolute bottom-0 left-0 w-full leading-none" style={{ zIndex: 30, lineHeight: 0, marginBottom: -1 }}>
        <svg viewBox="0 0 1440 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"
          style={{ display: 'block', width: '100%', height: 100 }}>
          <path d="M0,60 C240,110 480,20 720,70 C960,115 1200,30 1440,65 L1440,100 L0,100 Z" fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}

// ── ソーシャルプルーフ ──
function LogoBar() {
  const stats = [
    { value: '¥2.4M', label: '月間売上実績' },
    { value: '1,200+', label: '利用企業数' },
    { value: '148件', label: '月間平均受注' },
    { value: '99.9%', label: '稼働率' },
  ];
  return (
    <section className="py-12" style={{ background: '#f0f6fe', marginTop: 0 }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <div key={i}>
              <p className="text-3xl font-black" style={{ color: '#1d4ed8' }}>{s.value}</p>
              <p className="text-sm mt-1" style={{ color: '#4a6fa5' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 機能セクション ──
function FeaturesSection() {
  const { ref, visible } = useInView();

  const features = [
    {
      num: '01',
      label: '商品管理',
      desc: '複数SKU・画像・カスタム属性まで一元管理。CSVインポートで大量データも即反映。',
      img: '/feat-illust-01.png',
    },
    {
      num: '02',
      label: '受注管理',
      desc: '掛売り・ロット割引・請求書発行。ステータス管理からメール通知まで自動化。',
      img: '/feat-illust-02.png',
    },
    {
      num: '03',
      label: 'コンテンツ管理',
      desc: 'ニュース・特集・お知らせをリッチエディタで作成・公開。ショップとシームレスに連携。',
      img: '/feat-illust-03.png',
    },
  ];

  return (
    <section id="features" className="py-24 md:py-32 relative overflow-hidden" style={{ background: '#ffffff' }}>
      <div ref={ref} className="max-w-6xl mx-auto px-6">
        <div className={`mb-16 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-4" style={{ color: '#0ea5e9' }}>Features</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight" style={{ color: '#1e3a5f' }}>
            B2B ECに必要な機能を、すべて搭載
          </h2>
        </div>

        <div className={`grid md:grid-cols-3 gap-10 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {features.map((f, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {/* イラスト */}
              <div className="relative w-full" style={{ height: 200 }}>
                <Image
                  src={f.img}
                  alt={f.label}
                  fill
                  className="object-contain object-center"
                  unoptimized
                />
              </div>

              {/* 区切り線 */}
              <div className="w-12 h-px my-5" style={{ background: 'linear-gradient(90deg, transparent, #93c5fd, transparent)' }} />

              {/* テキスト */}
              <h3 className="text-lg font-black mb-2" style={{ color: '#1e3a5f' }}>{f.label}</h3>
              <p className="text-sm leading-relaxed" style={{ color: '#4b6080' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <div className={`mt-16 pt-12 border-t transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ borderColor: '#bae6fd' }}>
          <p className="text-sm mb-6 text-center" style={{ color: '#4a6fa5' }}>その他の機能</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {['顧客管理', '見積管理', 'ダッシュボード', 'ショップ構築', '代理店管理', '権限管理', 'テーマ設定', 'API / Webhook', 'CSV出力', 'PDF見積', 'メール通知', 'パフォーマンス追跡'].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm py-2 px-3 rounded-xl"
                style={{ background: '#f0f6fe', color: '#1e3a5f' }}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#38bdf8' }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── スクリーンショットセクション ──
function ScreenshotsSection() {
  const { ref, visible } = useInView();
  const [lightbox, setLightbox] = useState<{ img: string; label: string } | null>(null);

  // ログイン画面と同じブルー系パレットで統一
  const screens = [
    {
      num: '01',
      label: 'ダッシュボード',
      title: 'KPIをひと目で把握',
      desc: '売上・注文・顧客数をリアルタイムで確認。月別トレンドチャートやパフォーマンス指標を美しいカードで表示。毎朝開くだけで状況が分かります。',
      img: '/screenshot-dashboard.png',
      bg: '#ffffff',
      accent: '#2563eb',
      numColor: '#bae6fd',
      orb1: '#38bdf8',
      orb2: '#60a5fa',
      reverse: false,
    },
    {
      num: '02',
      label: '商品管理',
      title: '在庫・SKU・カテゴリを一元管理',
      desc: '複数バリエーション・カスタム属性・在庫数をひとつの画面で管理。CSVインポートで大量データも即反映。商品追加がこれほどスムーズに。',
      img: '/screenshot-products.png',
      bg: '#f8fbff',
      accent: '#0284c7',
      numColor: '#7dd3fc',
      orb1: '#22d3ee',
      orb2: '#38bdf8',
      reverse: true,
    },
    {
      num: '03',
      label: '受注管理',
      title: 'B2B取引に完全対応',
      desc: '掛売り・ロット割引・請求書発行まで対応。ステータス管理からメール通知まで自動化し、受注業務の手間を大幅削減します。',
      img: '/screenshot-orders.png',
      bg: '#ffffff',
      accent: '#1d4ed8',
      numColor: '#93c5fd',
      orb1: '#60a5fa',
      orb2: '#a5f3fc',
      reverse: false,
    },
    {
      num: '04',
      label: 'コンテンツ管理',
      title: 'ECとCMSを同一画面で',
      desc: 'ニュース・特集・ギャラリー・Q&Aをリッチエディタで作成・公開。カスタムフィールドで自由に拡張でき、ショップとシームレスに連携。',
      img: '/screenshot-contents.png',
      bg: '#f8fbff',
      accent: '#0891b2',
      numColor: '#67e8f9',
      orb1: '#38bdf8',
      orb2: '#2563eb',
      reverse: true,
    },
    {
      num: '05',
      label: '代理店管理',
      title: '代理店ネットワークを一元管理',
      desc: '代理店の登録・コード発行・手数料設定・売上レポートを自動生成。代理店経由の売上もリアルタイムで把握できます。',
      img: '/screenshot-agencies.png',
      bg: '#ffffff',
      accent: '#1d4ed8',
      numColor: '#93c5fd',
      orb1: '#818cf8',
      orb2: '#38bdf8',
      reverse: false,
    },
  ];

  return (
    <section id="screenshots" className="relative overflow-hidden" style={{ background: '#ffffff' }}>
      <div ref={ref} className="max-w-6xl mx-auto px-6 pt-24 pb-8">
        {/* ヘッダー */}
        <div className={`text-center mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs tracking-[0.3em] uppercase font-bold mb-3" style={{ color: '#0284c7' }}>
            ✦ SCREENSHOTS
          </p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ color: '#1e3a5f' }}>
            アプリ機能！
          </h2>
          <p className="max-w-lg mx-auto" style={{ color: '#4a6fa5' }}>
            毎日使う管理画面だから、使い心地と見た目にこだわりました。
          </p>
        </div>
      </div>

      {/* 交互レイアウト */}
      <div className="space-y-0">
        {screens.map((s, i) => (
          <div
            key={i}
            className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <div
              className="relative py-16 md:py-20 overflow-hidden"
              style={{ background: s.bg }}
            >
              {/* 装飾サークル（薄く） */}
              <div className="absolute pointer-events-none rounded-full blur-[80px] opacity-10"
                style={{
                  width: 320, height: 320,
                  background: `radial-gradient(circle, ${s.orb1}, transparent 70%)`,
                  top: '-80px',
                  ...(s.reverse ? { left: '-60px' } : { right: '-60px' }),
                }} />
              <div className="absolute pointer-events-none rounded-full blur-[80px] opacity-10"
                style={{
                  width: 220, height: 220,
                  background: `radial-gradient(circle, ${s.orb2}, transparent 70%)`,
                  bottom: '-60px',
                  ...(s.reverse ? { right: '10%' } : { left: '10%' }),
                }} />

              {/* 番号デコ（背景） */}
              <div
                className="absolute pointer-events-none select-none font-black"
                style={{
                  fontSize: 'clamp(120px, 20vw, 240px)',
                  color: 'rgba(37,99,235,0.05)',
                  lineHeight: 1,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  ...(s.reverse ? { right: '5%' } : { left: '5%' }),
                }}
              >
                {s.num}
              </div>

              <div className={`relative z-10 max-w-6xl mx-auto px-6 flex flex-col ${s.reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10 md:gap-16`}>

                {/* テキスト側 */}
                <div className="flex-1 min-w-0">
                  <div
                    className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3"
                    style={{ background: `${s.accent}18`, color: s.accent, border: `1px solid ${s.accent}40` }}
                  >
                    {s.label}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black mb-4 leading-snug" style={{ color: '#1e3a5f' }}>
                    {s.title}
                  </h3>
                  {/* 区切り線 */}
                  <div className="w-12 h-1 rounded-full mb-4" style={{ background: `linear-gradient(90deg, ${s.accent}, ${s.orb1})` }} />
                  <p className="leading-relaxed text-base" style={{ color: '#4a6fa5' }}>
                    {s.desc}
                  </p>
                </div>

                {/* スクリーンショット側 */}
                <div className="flex-1 min-w-0 w-full">
                  <div
                    className="relative rounded-2xl overflow-hidden cursor-zoom-in"
                    style={{
                      boxShadow: `0 24px 64px rgba(37,99,235,0.15), 0 4px 16px rgba(37,99,235,0.08)`,
                      border: `2px solid rgba(186,230,253,0.8)`,
                      transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease, border-color 0.25s ease',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = 'scale(1.03) translateY(-4px)';
                      el.style.boxShadow = '0 32px 60px rgba(37,99,235,0.25), 0 8px 20px rgba(37,99,235,0.12)';
                      el.style.borderColor = 'rgba(96,165,250,0.9)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.transform = 'scale(1) translateY(0)';
                      el.style.boxShadow = '0 24px 64px rgba(37,99,235,0.15), 0 4px 16px rgba(37,99,235,0.08)';
                      el.style.borderColor = 'rgba(186,230,253,0.8)';
                    }}
                    onClick={() => setLightbox({ img: s.img, label: s.label })}
                  >
                    <Image
                      src={s.img}
                      alt={s.label}
                      width={1024} height={554}
                      className="w-full object-cover object-top"
                      priority={i === 0}
                      unoptimized
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 下部パディング */}
      <div className="pb-8" />

      {/* ライトボックスモーダル */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          style={{ background: 'rgba(10,20,40,0.85)', backdropFilter: 'blur(12px)', animation: 'lb-in 0.3s cubic-bezier(0.34,1.4,0.64,1)' }}
          onClick={() => setLightbox(null)}
        >
          <style>{`
            @keyframes lb-in {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes lb-img-in {
              from { opacity: 0; transform: scale(0.88); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <div
            className="relative w-full max-w-5xl"
            style={{ animation: 'lb-img-in 0.3s cubic-bezier(0.34,1.4,0.64,1)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* 閉じるボタン */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              閉じる
            </button>
            {/* 画像 */}
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.6)', border: '2px solid rgba(186,230,253,0.3)' }}>
              <Image
                src={lightbox.img}
                alt={lightbox.label}
                width={1280} height={693}
                className="w-full h-auto"
                unoptimized
              />
            </div>
            {/* ラベル */}
            <p className="mt-3 text-center text-white/60 text-sm font-medium">{lightbox.label}</p>
          </div>
        </div>
      )}
    </section>
  );
}

// ── B2Bセクション ──
function B2BSection() {
  const { ref, visible } = useInView();
  const points = [
    { title: '見積 → 受注の一気通貫', desc: 'オンライン見積からそのまま受注変換。PDF出力も即座に。' },
    { title: '代理店ネットワーク管理', desc: 'コード発行・手数料設定・実績レポートを自動生成。' },
    { title: '権限・組織管理', desc: 'ロール設定でメンバーごとに閲覧・操作権限を細かく制御。' },
  ];
  return (
    <section className="py-24 md:py-32 relative overflow-hidden" style={{ background: '#ffffff' }}>
      <div ref={ref} className="max-w-5xl mx-auto px-6">
        <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* ラベル */}
          <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-5 text-center" style={{ color: '#0ea5e9' }}>For B2B</p>

          {/* 見出し + リード文 中央 */}
          <div className="text-center mb-16 pb-10" style={{ borderBottom: '1px solid #e8f0f8' }}>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-6" style={{ color: '#1e3a5f' }}>
              BtoB ECに、本気で向き合う
            </h2>
            <p className="text-base leading-relaxed mx-auto" style={{ color: '#6b7280', maxWidth: 480 }}>
              法人取引特有の商習慣に深く対応。掛売り・見積・代理店管理など、BtoCプラットフォームでは難しい領域をカバーします。
            </p>
          </div>

          {/* 3カラム テキストリスト */}
          <div className="grid md:grid-cols-3 gap-0">
            {points.map((p, i) => (
              <div key={i} className="py-8 md:px-8 flex flex-col gap-3"
                style={{ borderLeft: i > 0 ? '1px solid #e8f0f8' : 'none' }}>
                <span className="text-4xl font-black leading-none" style={{ color: '#dbeafe', WebkitTextStroke: '1.5px #93c5fd' }}>
                  0{i + 1}
                </span>
                <p className="text-xl font-black leading-snug" style={{ color: '#1e3a5f' }}>{p.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 料金セクション ──
function PricingSection() {
  const { ref, visible } = useInView();

  // AKINAI ブルー系カラー統一
  // 左右: くすんだスカイブルー (#4a9cb8 / #5ba3bc 系) ヘッダー帯 + 白カード本体
  // 中央: 同系ヘッダー帯 + 白カード本体 + オススメ円形バッジ
  const plans = [
    {
      name: 'ライト',
      slug: 'light',
      price: '¥3,300',
      priceNote: '/ 月（税込）',
      desc: '小規模ショップやはじめての方に',
      features: [
        { text: '商品50件まで', active: true },
        { text: '月間100注文まで', active: true },
        { text: '1ユーザー', active: true },
        { text: 'ECショップ機能', active: true },
        { text: 'メールサポート', active: true },
        { text: '見積管理', active: false },
        { text: 'API / Webhook', active: false },
      ],
      cta: '1ヶ月無料で始める',
      recommended: false,
      headerBg: 'linear-gradient(135deg, #60a5fa 0%, #38bdf8 100%)',
    },
    {
      name: 'スタンダード',
      slug: 'standard',
      price: '¥11,000',
      priceNote: '/ 月（税込）',
      desc: '成長するビジネスに最適',
      features: [
        { text: '商品無制限', active: true },
        { text: '注文無制限', active: true },
        { text: '5ユーザー', active: true },
        { text: 'ECショップ機能', active: true },
        { text: '優先サポート', active: true },
        { text: '見積管理', active: true },
        { text: 'API / Webhook', active: true },
      ],
      cta: '1ヶ月無料で始める',
      recommended: true,
      headerBg: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',
    },
    {
      name: 'エンタープライズ',
      slug: 'enterprise',
      price: 'お問合せ',
      priceNote: '',
      desc: '大規模組織・カスタム要件に',
      features: [
        { text: 'すべてのStd機能', active: true },
        { text: 'ユーザー無制限', active: true },
        { text: 'SLA保証', active: true },
        { text: 'カスタム開発', active: true },
        { text: '専任サポート', active: true },
        { text: 'オンボーディング支援', active: true },
        { text: '高度なユーザー管理', active: true },
      ],
      cta: 'お問い合わせ',
      recommended: false,
      headerBg: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
    },
  ];

  return (
    <section id="pricing" className="py-24 md:py-32 relative overflow-hidden" style={{ background: '#ffffff' }}>
      {/* 装飾サークル */}
      <div className="absolute pointer-events-none rounded-full blur-[100px] opacity-25"
        style={{ width: 500, height: 500, background: 'radial-gradient(circle, #bae6fd, transparent 70%)', top: '-120px', right: '-100px' }} />
      <div className="absolute pointer-events-none rounded-full blur-[80px] opacity-15"
        style={{ width: 350, height: 350, background: 'radial-gradient(circle, #60a5fa, transparent 70%)', bottom: '-80px', left: '-80px' }} />

      <div ref={ref} className="relative z-10 max-w-5xl mx-auto px-6">
        {/* ヘッダー */}
        <div className={`text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-2" style={{ color: '#0ea5e9' }}>Pricing</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3" style={{ color: '#1e3a5f' }}>
            料金プラン
          </h2>
          <p style={{ color: '#4a6fa5' }}>初期費用・隠れたコストは一切ありません</p>
        </div>

        <div className={`grid md:grid-cols-3 gap-6 items-start transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} pt-10`}>
          {plans.map((plan, i) => (
            <div
              key={i}
              className="relative flex flex-col rounded-xl overflow-visible"
              style={{
                boxShadow: plan.recommended
                  ? '0 8px 40px rgba(37,99,235,0.2), 0 2px 8px rgba(37,99,235,0.1)'
                  : '0 4px 16px rgba(37,99,235,0.08), 0 1px 4px rgba(37,99,235,0.05)',
                transitionDelay: `${i * 100}ms`,
              }}
            >
              {/* オススメ円形バッジ */}
              {plan.recommended && (
                <div
                  className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 rounded-full flex items-center justify-center text-[10px] font-black text-white whitespace-nowrap px-3 py-1"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',
                    boxShadow: '0 4px 16px rgba(37,99,235,0.45)',
                  }}
                >
                  おすすめ
                </div>
              )}

              {/* カラーヘッダー帯 — プランごとに濃淡を変える */}
              <div
                className="px-6 pt-8 pb-5 rounded-t-xl"
                style={{ background: plan.headerBg }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>{plan.name}</p>
                  {plan.slug !== 'enterprise' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}>
                      準備中
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-white leading-none">{plan.price}</span>
                  {plan.priceNote && (
                    <span className="text-xs mb-1 ml-1" style={{ color: 'rgba(255,255,255,0.65)' }}>{plan.priceNote}</span>
                  )}
                </div>
              </div>

              {/* カード本体 */}
              <div className="px-6 pt-5 pb-6 flex flex-col flex-1 rounded-b-xl" style={{ background: '#f0f6fe' }}>
                <p className="text-xs mb-4" style={{ color: '#4a6fa5' }}>{plan.desc}</p>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <span className="text-xs flex-shrink-0" style={{ color: f.active ? '#38bdf8' : '#bae6fd' }}>■</span>
                      <span style={{ color: f.active ? '#1e3a5f' : '#94a3b8' }}>{f.text}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.slug === 'enterprise' ? '/contact?plan=enterprise' : `/signup?plan=${plan.slug}`}
                  className="block w-full text-center py-2.5 rounded-lg text-sm font-bold transition-all hover:opacity-90 active:scale-[.98]"
                  style={{
                    background: plan.recommended
                      ? 'linear-gradient(135deg, #2563eb, #38bdf8)'
                      : 'linear-gradient(135deg, #60a5fa, #38bdf8)',
                    color: '#fff',
                    boxShadow: plan.recommended ? '0 2px 12px rgba(37,99,235,0.4)' : '0 2px 8px rgba(56,189,248,0.25)',
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

// ── FAQセクション ──
function FAQSection() {
  const { ref, visible } = useInView();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const faqs = [
    { q: '無料プランはいつまで使えますか？', a: '期間制限なくご利用いただけます。商品50件・月間100注文の範囲内であれば、ずっと無料です。' },
    { q: '導入まで最短どれくらいかかりますか？', a: 'アカウント作成後、即日ご利用いただけます。初期設定のサポートもご用意しています。' },
    { q: 'B2B（企業間取引）に対応していますか？', a: '掛売り・ロット割引・請求書発行・見積管理など、B2B特有の商習慣に完全対応しています。' },
    { q: 'APIやWebhookは使えますか？', a: 'ProプランからAPI・Webhookをご利用いただけます。外部システムとの連携も柔軟に対応可能です。' },
    { q: 'サポート体制を教えてください。', a: 'メール・チャットサポートを提供しています。Enterpriseプランでは専任サポート担当者をご用意します。' },
  ];

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: '#ffffff' }}>
      {/* 薄い装飾サークル */}
      <div className="absolute pointer-events-none rounded-full blur-[80px] opacity-20"
        style={{ width: 400, height: 400, background: 'radial-gradient(circle, #bae6fd, transparent 70%)', top: '-100px', right: '-80px' }} />
      <div className="absolute pointer-events-none rounded-full blur-[60px] opacity-15"
        style={{ width: 280, height: 280, background: 'radial-gradient(circle, #7dd3fc, transparent 70%)', bottom: '-60px', left: '-60px' }} />

      <div ref={ref} className="relative z-10 max-w-3xl mx-auto px-6">
        {/* ヘッダー */}
        <div className={`text-center mb-12 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center gap-3 justify-center mb-4">
            <div className="flex flex-col gap-1">
              <div className="h-0.5 w-16 rounded-full" style={{ background: '#38bdf8' }} />
              <div className="h-0.5 w-8 rounded-full ml-auto" style={{ background: '#bae6fd' }} />
            </div>
            <h2 className="text-4xl font-black italic" style={{
              background: 'linear-gradient(135deg, #0ea5e9, #38bdf8, #67e8f9)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Q &amp; A</h2>
            <div className="flex flex-col gap-1">
              <div className="h-0.5 w-16 rounded-full" style={{ background: '#38bdf8' }} />
              <div className="h-0.5 w-8 rounded-full" style={{ background: '#bae6fd' }} />
            </div>
          </div>
        </div>

        {/* FAQ アコーディオン */}
        <div className={`space-y-0 transition-all duration-700 delay-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="border-b" style={{ borderColor: '#bae6fd' }}>
                <button
                  className="w-full flex items-center gap-3 py-5 text-left"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)' }}>Q</div>
                  <p className="flex-1 font-bold text-base" style={{ color: '#1e3a5f' }}>{faq.q}</p>
                  <svg
                    className="flex-shrink-0 transition-transform duration-300"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: '#38bdf8' }}
                    width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{ maxHeight: isOpen ? '200px' : '0px', opacity: isOpen ? 1 : 0 }}
                >
                  <div className="flex items-start gap-3 pb-5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0 mt-0.5"
                      style={{ background: 'linear-gradient(135deg, #38bdf8, #67e8f9)' }}>A</div>
                    <p className="text-sm leading-relaxed" style={{ color: '#4a6fa5' }}>{faq.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── その他の機能セクション ──
// ── CTAセクション ──
function CTASection() {
  const { ref, visible } = useInView();
  return (
    <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 30%, #38bdf8 70%, #22d3ee 100%)' }}>
      {/* 波形上部 */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none" style={{ height: 60 }}>
        <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
          <path d="M0,0 C360,60 720,0 1080,40 C1260,58 1380,20 1440,30 L1440,0 Z" fill="white" />
        </svg>
      </div>
      {/* 波形下部 */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none" style={{ height: 60 }}>
        <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%' }}>
          <path d="M0,60 C360,0 720,60 1080,20 C1260,2 1380,40 1440,30 L1440,60 Z" fill="#e8f0f8" />
        </svg>
      </div>

      <div ref={ref} className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <div className={`flex flex-col md:flex-row items-center justify-center gap-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

          {/* テキスト＋ボタン */}
          <div className="text-center flex-1">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight drop-shadow-sm">
              あなたの「商い」を、<br />もっと自由に。
            </h2>
            <p className="text-white/75 mb-8 text-sm">登録は無料、クレジットカードも不要です。まずはお気軽にお試しください。</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-black text-sm transition-all hover:opacity-90 active:scale-[.98]"
                style={{ background: '#fff', color: '#1d4ed8', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                1ヶ月無料トライアルを始める <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── フッター ──
function Footer() {
  return (
    <footer className="py-12" style={{ background: '#e8f0f8' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 mb-8">
          <div className="flex items-center gap-3 shrink-0">
            <img src="/logo-akinai.png" alt="AKINAI" className="h-10 w-auto" />
            <span className="text-xs font-medium" style={{ color: '#4a6fa5' }}>B2B向け EC / CMS</span>
          </div>
          <nav className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm" style={{ color: '#4a6fa5' }}>
            <a href="#" className="hover:text-sky-500 transition-colors">AKINAIについて</a>
            <a href="#features" className="hover:text-sky-500 transition-colors">機能</a>
            <a href="#pricing" className="hover:text-sky-500 transition-colors">料金・プラン</a>
            <a href="#screenshots" className="hover:text-sky-500 transition-colors">画面イメージ</a>
            <a href="/contact" className="hover:text-sky-500 transition-colors">お問い合わせ</a>
            <a href="/company" className="hover:text-sky-500 transition-colors">運営会社</a>
          </nav>
        </div>

        <div className="border-t mb-6" style={{ borderColor: '#bae6fd' }} />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ color: '#7dd3fc' }}>
          <div className="flex gap-4">
            <a href="/contact" className="hover:text-sky-400 transition-colors" style={{ color: '#4a6fa5' }}>お問い合わせ</a>
            <a href="/privacy" className="hover:text-sky-400 transition-colors" style={{ color: '#4a6fa5' }}>プライバシーポリシー</a>
            <a href="/terms" className="hover:text-sky-400 transition-colors" style={{ color: '#4a6fa5' }}>利用規約</a>
          </div>
          <p style={{ color: '#4a6fa5' }}>&copy; 2026 AKINAI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// ── メインページ ──
export default function LandingPage() {
  return (
    <main className="overflow-hidden">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ScreenshotsSection />
      <B2BSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  );
}

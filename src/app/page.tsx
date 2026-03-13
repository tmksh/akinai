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
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-xl font-black tracking-tight" style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #67e8f9 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>AKINAI</span>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm transition-colors hover:text-sky-500" style={{ color: '#4a6fa5' }}>機能</a>
          <a href="#screenshots" className="text-sm transition-colors hover:text-sky-500" style={{ color: '#4a6fa5' }}>画面</a>
          <a href="#pricing" className="text-sm transition-colors hover:text-sky-500" style={{ color: '#4a6fa5' }}>料金</a>
          <Link href="/login" className="text-sm font-medium transition-colors hover:text-sky-500" style={{ color: '#2563eb' }}>ログイン</Link>
          <Link href="/signup"
            className="text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)', color: '#fff', boxShadow: '0 2px 12px rgba(37,99,235,0.3)' }}>
            無料で始める
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
              style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)' }}>無料で始める</Link>
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
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20"
      style={{ background: 'linear-gradient(180deg, #e8f4fb 0%, #dbeafe 50%, #eef6fc 100%)' }}>

      {/* 背景デコレーション */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] left-[10%] w-[500px] h-[500px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, #bae6fd 0%, transparent 65%)' }} />
        <div className="absolute bottom-[5%] right-[10%] w-[400px] h-[400px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #93c5fd 0%, transparent 65%)' }} />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #7dd3fc 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-4 w-full">
        <div className="flex flex-col lg:flex-row items-center" style={{ gap: 0 }}>

          {/* 左: テキスト + CTA */}
          <div className={`space-y-6 transition-all duration-1000 flex-shrink-0 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ width: '42%', paddingLeft: 8 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border"
              style={{ background: 'rgba(255,255,255,0.85)', borderColor: '#7dd3fc', color: '#0284c7' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              B2B EC CMS — オープンベータ公開中
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[3.2rem] font-black tracking-tight leading-tight" style={{ color: '#1e3a5f' }}>
              B2B ECを、<br />
              <span style={{
                background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 50%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                もっとかんたんに。
              </span>
            </h1>

            <p className="text-base md:text-lg leading-relaxed" style={{ color: '#4b5563' }}>
              商品管理・受注・顧客・見積・コンテンツ・ショップ。<br />
              B2B ECに必要なすべてを、美しい管理画面に。
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/signup"
                className="font-bold px-8 py-4 rounded-full text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)', color: '#fff', boxShadow: '0 4px 20px rgba(29,78,216,0.35)' }}>
                無料で始める <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#screenshots"
                className="font-semibold px-8 py-4 rounded-full text-sm flex items-center justify-center gap-2 border transition-all hover:bg-white/70"
                style={{ borderColor: '#bae6fd', color: '#0369a1', background: 'rgba(255,255,255,0.6)' }}>
                画面を見る
              </a>
            </div>

            <div className="flex items-center gap-5 text-xs pt-1" style={{ color: '#6b7280' }}>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />クレカ不要</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />即日利用可</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />日本語対応</span>
            </div>
          </div>

          {/* 右: PC + スクショ + 人物 */}
          <div className={`hidden lg:block transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}
            style={{ flex: '0 0 58%', position: 'relative', height: 640 }}>

            {/* PC: クロップ済み、幅580px → 高さ368px */}
            <div style={{ position: 'absolute', left: 0, bottom: 120 }}>
              <div style={{ position: 'relative', width: 580 }}>
                <Image
                  src="/hero-laptop-crop.png"
                  alt="ノートPC"
                  width={901}
                  height={572}
                  style={{ width: 580, height: 'auto', display: 'block', filter: 'drop-shadow(0 10px 32px rgba(30,58,95,0.15))' }}
                  priority
                />
                {/* スクショ: top=6.12% left=16.54% w=66.93% h=68.18% */}
                <div style={{
                  position: 'absolute',
                  top: '6.12%', left: '16.54%',
                  width: '66.93%', height: '68.18%',
                  overflow: 'hidden',
                  zIndex: 2,
                }}>
                  <Image
                    src="/screenshot-dashboard.png"
                    alt="ダッシュボード"
                    width={1024}
                    height={554}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                  />
                </div>
              </div>
            </div>

            {/* 人物: PCの右端(left≈540)に密着、高さ560px */}
            <div style={{ position: 'absolute', left: 460, bottom: 120, zIndex: 10 }}>
              <Image
                src="/hero-person-crop.png"
                alt="ビジネスパーソン"
                width={279}
                height={667}
                style={{ height: 560, width: 'auto', display: 'block', filter: 'drop-shadow(0 6px 16px rgba(30,58,95,0.1))' }}
                priority
              />
            </div>

          </div>

        </div>
      </div>

      {/* 波形ボトム */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none" style={{ zIndex: 5 }}>
        <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"
          style={{ display: 'block', width: '100%', height: 80 }}>
          <path d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1380,20 1440,40 L1440,80 L0,80 Z"
            fill="white" />
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
    <section className="py-12 border-y" style={{ background: '#f0f6fe', borderColor: '#bae6fd' }}>
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
      label: '商品管理',
      tag: '在庫・バリエーション・カスタム属性',
      desc: '複数SKU・画像・カスタム属性まで一元管理。CSVインポートで大量データも即反映。',
      img: 'https://loremflickr.com/600/800/product,warehouse,inventory?lock=1',
      accent: 'rgba(37,99,235,0.55)',
      href: '/products',
    },
    {
      label: '受注管理',
      tag: '掛売り・ロット割引・請求書',
      desc: '掛売り・ロット割引・請求書発行。ステータス管理からメール通知まで自動化。',
      img: 'https://loremflickr.com/600/800/business,office,meeting?lock=2',
      accent: 'rgba(2,132,199,0.55)',
      href: '/orders',
    },
    {
      label: 'コンテンツ管理',
      tag: 'ニュース・特集・お知らせ',
      desc: 'ニュース・特集・お知らせをリッチエディタで作成・公開。ショップとシームレスに連携。',
      img: 'https://loremflickr.com/600/800/laptop,digital,content?lock=3',
      accent: 'rgba(14,165,233,0.55)',
      href: '/contents',
    },
  ];

  return (
    <section id="features" className="py-24 md:py-32 relative overflow-hidden" style={{ background: '#ffffff' }}>
      <div ref={ref} className="max-w-6xl mx-auto px-6">
        <div className={`mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-4" style={{ color: '#0ea5e9' }}>Features</p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight max-w-2xl" style={{ color: '#1e3a5f' }}>
            B2B ECに必要な機能を、<br />すべて搭載
          </h2>
        </div>

        <div className={`grid md:grid-cols-3 gap-5 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {features.map((f, i) => (
            <Link
              key={i}
              href={f.href}
              className="group relative rounded-3xl overflow-hidden cursor-pointer block"
              style={{ aspectRatio: '3/4', transitionDelay: `${i * 80}ms` }}
            >
              <Image src={f.img} alt={f.label} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.75) 100%)' }} />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                style={{ background: f.accent }} />
              <div className="absolute inset-0 flex flex-col justify-between p-6">
                <div>
                  <h3 className="text-xl font-black text-white mb-2">{f.label}</h3>
                  <span className="inline-block text-[11px] font-medium text-white/80 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                    {f.tag}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-white/85 leading-relaxed mb-4">{f.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/70">詳しく見る</span>
                    <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <ArrowRight className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
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
                  {/* 番号 */}
                  <div
                    className="text-5xl md:text-7xl font-black mb-4 leading-none"
                    style={{ color: s.accent, opacity: 0.35 }}
                  >
                    {s.num}
                  </div>
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
                    className="relative rounded-2xl overflow-hidden"
                    style={{
                      boxShadow: `0 24px 64px rgba(37,99,235,0.15), 0 4px 16px rgba(37,99,235,0.08)`,
                      border: `2px solid rgba(186,230,253,0.8)`,
                    }}
                  >
                    <Image
                      src={s.img}
                      alt={s.label}
                      width={1024} height={554}
                      className="w-full object-cover object-top"
                      priority={i === 0}
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
    </section>
  );
}

// ── B2Bセクション ──
function B2BSection() {
  const { ref, visible } = useInView();
  return (
    <section className="py-24 md:py-32 relative overflow-hidden" style={{ background: '#e8f0f8' }}>
      <div ref={ref} className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="rounded-2xl overflow-hidden shadow-xl" style={{ border: '1px solid #bae6fd' }}>
              <Image src="https://picsum.photos/seed/b2b-quote/800/600" alt="見積管理" width={800} height={600} className="w-full object-cover" />
            </div>
          </div>
          <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <p className="text-xs tracking-[0.3em] uppercase font-semibold mb-4" style={{ color: '#0ea5e9' }}>For B2B</p>
            <h2 className="text-4xl font-black tracking-tight mb-6 leading-tight" style={{ color: '#1e3a5f' }}>
              BtoB ECに、<br />本気で向き合う
            </h2>
            <p className="leading-relaxed mb-8" style={{ color: '#4a6fa5' }}>
              法人取引特有の商習慣に深く対応。掛売り・見積・代理店管理など、BtoCプラットフォームでは難しい領域をカバーします。
            </p>
            <div className="space-y-4">
              {[
                { title: '見積 → 受注の一気通貫', desc: 'オンライン見積からそのまま受注変換。PDF出力も即座に。' },
                { title: '代理店ネットワーク管理', desc: 'コード発行・手数料設定・実績レポートを自動生成。' },
                { title: '権限・組織管理', desc: 'ロール設定でメンバーごとに閲覧・操作権限を細かく制御。' },
              ].map((p, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: '#bae6fd' }} />
                  <div>
                    <p className="text-sm font-bold mb-1" style={{ color: '#1e3a5f' }}>{p.title}</p>
                    <p className="text-sm" style={{ color: '#4a6fa5' }}>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
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
      name: 'フリー',
      price: '無料',
      priceNote: '',
      desc: '小規模ショップやお試しに',
      features: [
        { text: '商品50件まで', active: true },
        { text: '月間100注文まで', active: true },
        { text: '1ユーザー', active: true },
        { text: 'ECショップ機能', active: true },
        { text: 'メールサポート', active: true },
        { text: '見積管理', active: false },
        { text: 'API / Webhook', active: false },
      ],
      cta: '無料で始める',
      recommended: false,
      headerBg: 'linear-gradient(135deg, #60a5fa 0%, #38bdf8 100%)',
    },
    {
      name: 'スタンダード',
      price: '¥9,800',
      priceNote: '/ 月（税抜）',
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
      cta: 'スタンダードで始める',
      recommended: true,
      headerBg: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',
    },
    {
      name: 'エンタープライズ',
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
    <section id="pricing" className="py-24 md:py-32 relative overflow-hidden" style={{ background: '#e8f0f8' }}>
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
                  className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 w-12 h-12 rounded-full flex items-center justify-center text-[10px] font-black text-white leading-tight text-center"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #38bdf8 100%)',
                    boxShadow: '0 4px 16px rgba(37,99,235,0.45)',
                  }}
                >
                  オス<br />スメ
                </div>
              )}

              {/* カラーヘッダー帯 — プランごとに濃淡を変える */}
              <div
                className="px-6 pt-8 pb-5 rounded-t-xl"
                style={{ background: plan.headerBg }}
              >
                <p className="text-sm font-bold mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>{plan.name}</p>
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
                  href="/signup"
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
  const faqs = [
    { q: '無料プランはいつまで使えますか？', a: '期間制限なくご利用いただけます。商品50件・月間100注文の範囲内であれば、ずっと無料です。' },
    { q: '導入まで最短どれくらいかかりますか？', a: 'アカウント作成後、即日ご利用いただけます。初期設定のサポートもご用意しています。' },
    { q: 'B2B（企業間取引）に対応していますか？', a: '掛売り・ロット割引・請求書発行・見積管理など、B2B特有の商習慣に完全対応しています。' },
    { q: 'APIやWebhookは使えますか？', a: 'ProプランからAPI・Webhookをご利用いただけます。外部システムとの連携も柔軟に対応可能です。' },
    { q: 'サポート体制を教えてください。', a: 'メール・チャットサポートを提供しています。Enterpriseプランでは専任サポート担当者をご用意します。' },
  ];

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: '#f0f6fe' }}>
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

        {/* FAQ リスト */}
        <div className={`space-y-0 transition-all duration-700 delay-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          {faqs.map((faq, i) => (
            <div key={i} className="border-b py-6" style={{ borderColor: '#bae6fd' }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #38bdf8)' }}>Q</div>
                <p className="font-bold text-base" style={{ color: '#1e3a5f' }}>{faq.q}</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #38bdf8, #67e8f9)' }}>A</div>
                <p className="text-sm leading-relaxed" style={{ color: '#4a6fa5' }}>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── その他の機能セクション ──
function OtherFeaturesSection() {
  const { ref, visible } = useInView();
  const items = [
    { icon: '📦', label: '商品管理', sub: '在庫・SKU・カテゴリ' },
    { icon: '🛒', label: '受注管理', sub: '掛売り・請求書発行' },
    { icon: '📝', label: 'コンテンツ', sub: 'ニュース・特集' },
    { icon: '💬', label: '見積管理', sub: 'B2B見積・承認フロー' },
    { icon: '🏪', label: 'ECショップ', sub: 'フロント公開機能' },
    { icon: '🤝', label: '代理店管理', sub: 'コミッション・売上' },
    { icon: '🔗', label: 'API連携', sub: 'Webhook・外部連携' },
  ];

  return (
    <section className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #e8f4fb 0%, #dbeafe 100%)' }}>
      {/* 背景のドット模様 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #93c5fd 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

      <div ref={ref} className="relative z-10 max-w-5xl mx-auto px-6">
        <div className={`text-center mb-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl font-black mb-2" style={{ color: '#1e3a5f' }}>
            その他の機能
          </h2>
          <p className="text-sm" style={{ color: '#4a6fa5' }}>
            AKINAIは多機能！使いたい機能だけを選択してご利用できます！
          </p>
        </div>

        <div className={`flex flex-wrap justify-center gap-4 mb-8 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {items.map((item, i) => (
            <div key={i}
              className="flex flex-col items-center gap-2 bg-white rounded-xl px-5 py-4 text-center"
              style={{
                boxShadow: '0 2px 12px rgba(56,189,248,0.1)',
                border: '1px solid rgba(186,230,253,0.6)',
                minWidth: 110,
              }}>
              <span className="text-3xl">{item.icon}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: '#1e3a5f' }}>{item.label}</p>
                <p className="text-[10px]" style={{ color: '#4a6fa5' }}>{item.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <p className={`text-center font-bold text-sm transition-all duration-700 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
          style={{ color: '#1e3a5f' }}>
          の全てに対応しています！
        </p>
      </div>
    </section>
  );
}

// ── CTAセクション ──
function CTASection() {
  const { ref, visible } = useInView();
  return (
    <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 30%, #38bdf8 70%, #22d3ee 100%)' }}>
      {/* 波形上部 */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none" style={{ height: 60 }}>
        <svg viewBox="0 0 1440 60" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,0 L1440,0 L1440,20 Q1320,60 1200,35 Q1080,10 960,40 Q840,65 720,35 Q600,5 480,40 Q360,65 240,35 Q120,5 0,40 Z" fill="#dbeafe" />
        </svg>
      </div>
      {/* 波形下部 */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none" style={{ height: 60 }}>
        <svg viewBox="0 0 1440 60" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0,60 L1440,60 L1440,20 Q1320,-15 1200,20 Q1080,50 960,20 Q840,-10 720,20 Q600,50 480,20 Q360,-10 240,20 Q120,50 0,20 Z" fill="#e8f0f8" />
        </svg>
      </div>

      <div ref={ref} className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className={`flex flex-col md:flex-row items-center justify-center gap-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* 左 装飾サークル */}
          <div className="hidden md:flex items-center justify-center flex-shrink-0" style={{ width: 100 }}>
            <div className="w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)' }} />
          </div>

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
                無料で始める <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-black text-sm transition-all hover:bg-white/20 border border-white/40 text-white backdrop-blur-sm">
                AKINAIについて詳しく見る <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* 右 装飾サークル */}
          <div className="hidden md:flex items-center justify-center flex-shrink-0" style={{ width: 100 }}>
            <div className="w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)' }} />
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
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-black" style={{
              background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>AKINAI</span>
            <span className="text-xs font-medium" style={{ color: '#4a6fa5' }}>B2B向け EC / CMS</span>
          </div>
          <nav className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm" style={{ color: '#4a6fa5' }}>
            <a href="#" className="hover:text-sky-500 transition-colors">AKINAIについて</a>
            <a href="#features" className="hover:text-sky-500 transition-colors">機能</a>
            <a href="#pricing" className="hover:text-sky-500 transition-colors">料金・プラン</a>
            <a href="#screenshots" className="hover:text-sky-500 transition-colors">画面イメージ</a>
            <a href="#" className="hover:text-sky-500 transition-colors">お問い合わせ</a>
          </nav>
        </div>

        <div className="border-t mb-6" style={{ borderColor: '#bae6fd' }} />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs" style={{ color: '#7dd3fc' }}>
          <div className="flex gap-4">
            <a href="#" className="hover:text-sky-400 transition-colors" style={{ color: '#4a6fa5' }}>お問い合わせ</a>
            <a href="#" className="hover:text-sky-400 transition-colors" style={{ color: '#4a6fa5' }}>プライバシーポリシー</a>
            <a href="#" className="hover:text-sky-400 transition-colors" style={{ color: '#4a6fa5' }}>利用規約</a>
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
      <OtherFeaturesSection />
      <CTASection />
      <Footer />
    </main>
  );
}

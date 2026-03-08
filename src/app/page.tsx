'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle2, Menu, X } from 'lucide-react';

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
      scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100' : 'bg-transparent'
    }`}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-xl font-black tracking-tight" style={{
          background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #67e8f9 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>AKINAI</span>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">機能</a>
          <a href="#screenshots" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">画面</a>
          <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">料金</a>
          <Link href="/login" className="text-sm text-gray-600 hover:text-sky-600 transition-colors font-medium">ログイン</Link>
          <Link href="/signup" className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-700 transition-all">
            無料で始める
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-5 space-y-4">
          <a href="#features" className="block text-sm text-gray-700" onClick={() => setMobileOpen(false)}>機能</a>
          <a href="#screenshots" className="block text-sm text-gray-700" onClick={() => setMobileOpen(false)}>画面</a>
          <a href="#pricing" className="block text-sm text-gray-700" onClick={() => setMobileOpen(false)}>料金</a>
          <div className="flex gap-3 pt-2">
            <Link href="/login" className="text-sm text-gray-700 font-medium">ログイン</Link>
            <Link href="/signup" className="bg-gray-900 text-white text-sm font-semibold px-5 py-2 rounded-full">無料で始める</Link>
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
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16"
      style={{
        background: 'linear-gradient(140deg, #3ba5b5 0%, #5cbdcc 20%, #6ec8d8 40%, #85d4e0 60%, #a0deea 80%, #bae6f0 100%)',
      }}>

      {/* ガラスオーブ + ストリーク */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* 大きなオーブ: 左上 */}
        <div className="absolute -top-[5%] left-[5%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle at 45% 45%, rgba(255,255,255,0.7) 0%, rgba(200,240,250,0.4) 25%, rgba(100,200,220,0.15) 50%, transparent 70%)' }} />
        {/* 中央のオーブ */}
        <div className="absolute top-[35%] left-[25%] w-[380px] h-[380px] rounded-full"
          style={{ background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.55) 0%, rgba(190,235,245,0.3) 30%, rgba(100,200,220,0.1) 55%, transparent 70%)' }} />
        {/* 右中のオーブ */}
        <div className="absolute top-[15%] right-[10%] w-[280px] h-[280px] rounded-full"
          style={{ background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.5) 0%, rgba(186,230,248,0.3) 30%, transparent 65%)' }} />
        {/* 小さなオーブ: 右下 */}
        <div className="absolute bottom-[20%] right-[30%] w-[180px] h-[180px] rounded-full"
          style={{ background: 'radial-gradient(circle at 38% 38%, rgba(255,255,255,0.6) 0%, rgba(200,240,250,0.25) 35%, transparent 65%)' }} />
        {/* 極小オーブ: 左下 */}
        <div className="absolute bottom-[30%] left-[15%] w-[100px] h-[100px] rounded-full"
          style={{ background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.5) 0%, rgba(180,230,240,0.2) 40%, transparent 70%)' }} />

        {/* ライトストリーク（白い斜め線） */}
        <div className="absolute top-[3%] left-[18%] w-[4px] h-[220px] rounded-full rotate-[30deg]"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0.6) 70%, transparent)' }} />
        <div className="absolute top-[6%] left-[24%] w-[3px] h-[160px] rounded-full rotate-[32deg]"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.5) 70%, transparent)' }} />
        <div className="absolute top-[10%] right-[18%] w-[3px] h-[200px] rounded-full rotate-[25deg]"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.55) 30%, rgba(255,255,255,0.55) 70%, transparent)' }} />
        <div className="absolute top-[18%] right-[38%] w-[2px] h-[280px] rounded-full rotate-[28deg]"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0.4) 70%, transparent)' }} />
        <div className="absolute bottom-[25%] left-[35%] w-[3px] h-[150px] rounded-full rotate-[35deg]"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.45) 30%, rgba(255,255,255,0.45) 70%, transparent)' }} />
        <div className="absolute bottom-[15%] right-[22%] w-[4px] h-[200px] rounded-full rotate-[22deg]"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.5) 70%, transparent)' }} />

        {/* ソフトな上部明るさ */}
        <div className="absolute top-0 left-0 w-full h-[40%]"
          style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 w-full">
        <div className="flex flex-col items-center text-center">
          {/* テキスト */}
          <div className={`space-y-8 max-w-2xl transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 border border-white/30 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-medium text-white">B2B EC CMS — オープンベータ公開中</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1.1]">
              ECも、CMSも、<br />
              <span className="text-white/90">これひとつ。</span>
            </h1>

            <p className="text-lg text-white/80 leading-relaxed max-w-lg mx-auto">
              商品管理・受注・顧客・見積・コンテンツ・ショップ。<br />
              B2B ECに必要なすべてを、美しい管理画面に。
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="bg-white text-sky-700 font-bold px-8 py-4 rounded-full text-sm flex items-center justify-center gap-2 hover:bg-white/90 transition-all shadow-xl shadow-black/10">
                無料で始める <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#screenshots" className="text-white font-medium px-8 py-4 rounded-full text-sm flex items-center justify-center gap-2 border border-white/40 hover:bg-white/10 transition-all backdrop-blur-sm">
                画面を見る
              </a>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/70 justify-center">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-white/80" />クレカ不要</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-white/80" />即日利用可</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-white/80" />日本語対応</span>
            </div>
          </div>
        </div>
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
    <section className="py-12 border-y border-blue-100/50" style={{ background: 'linear-gradient(90deg, rgba(240,247,255,0.8), rgba(245,240,255,0.6), rgba(240,247,255,0.8))' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <div key={i}>
              <p className="text-3xl font-black text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
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
      title: '在庫・バリエーション・カテゴリをひとつの画面で',
      desc: '複数SKU・画像・カスタム属性まで一元管理。CSVインポートで大量データも即反映。',
      img: 'https://loremflickr.com/600/800/product,warehouse,inventory?lock=1',
      accent: 'rgba(14,165,233,0.6)',
    },
    {
      label: '受注管理',
      tag: '掛売り・ロット割引・請求書',
      title: 'B2B取引特有の商習慣に完全対応',
      desc: '掛売り・ロット割引・請求書発行。ステータス管理からメール通知まで自動化。',
      img: 'https://loremflickr.com/600/800/business,office,meeting?lock=2',
      accent: 'rgba(99,102,241,0.6)',
    },
    {
      label: 'コンテンツ管理',
      tag: 'ニュース・特集・お知らせ',
      title: 'ECとCMSを同一画面で管理',
      desc: 'ニュース・特集・お知らせをリッチエディタで作成・公開。ショップとシームレスに連携。',
      img: 'https://loremflickr.com/600/800/laptop,digital,content?lock=3',
      accent: 'rgba(20,184,166,0.6)',
    },
  ];

  return (
    <section id="features" className="py-24 md:py-32 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 60%, #f3f0ff 100%)' }}>
      <div ref={ref} className="max-w-6xl mx-auto px-6">
        <div className={`mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs tracking-[0.3em] uppercase text-sky-500 font-semibold mb-4">Features</p>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight max-w-2xl">
            B2B ECに必要な機能を、<br />すべて搭載
          </h2>
        </div>

        {/* 写真カードグリッド */}
        <div className={`grid md:grid-cols-3 gap-5 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {features.map((f, i) => (
            <Link
              key={i}
              href="/signup"
              className="group relative rounded-3xl overflow-hidden cursor-pointer block"
              style={{
                aspectRatio: '3/4',
                transitionDelay: `${i * 80}ms`,
              }}
            >
              {/* 写真 */}
              <Image
                src={f.img}
                alt={f.label}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* グラデーションオーバーレイ */}
              <div className="absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.75) 100%)`,
                }} />

              {/* アクセントカラーオーバーレイ */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-500"
                style={{ background: f.accent }} />

              {/* コンテンツ */}
              <div className="absolute inset-0 flex flex-col justify-between p-6">
                {/* 上部：タイトル＋タグ */}
                <div>
                  <h3 className="text-xl font-black text-white mb-2">{f.label}</h3>
                  <span className="inline-block text-[11px] font-medium text-white/80 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                    {f.tag}
                  </span>
                </div>

                {/* 下部：説明＋矢印 */}
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

        {/* 機能リスト */}
        <div className={`mt-16 pt-12 border-t border-gray-100 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-sm text-gray-400 mb-6 text-center">その他の機能</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {['顧客管理', '見積管理', 'ダッシュボード', 'ショップ構築', '代理店管理', '権限管理', 'テーマ設定', 'API / Webhook', 'CSV出力', 'PDF見積', 'メール通知', 'パフォーマンス追跡'].map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600 py-2 px-3 rounded-xl bg-gray-50">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
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
  const [active, setActive] = useState(0);

  const screens = [
    { label: 'ダッシュボード', img: 'https://picsum.photos/seed/screen-dashboard/1200/750' },
    { label: '商品管理', img: 'https://picsum.photos/seed/screen-products/1200/750' },
    { label: '受注一覧', img: 'https://picsum.photos/seed/screen-orders/1200/750' },
    { label: 'コンテンツ', img: 'https://picsum.photos/seed/screen-contents/1200/750' },
  ];

  return (
    <section id="screenshots" className="py-24 md:py-32 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #f0eeff 0%, #eef5ff 40%, #e8f4ff 100%)' }}>
      <div ref={ref} className="max-w-6xl mx-auto px-6">
        <div className={`text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs tracking-[0.3em] uppercase text-sky-500 font-semibold mb-4">Screenshots</p>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            美しい管理画面
          </h2>
          <p className="mt-4 text-gray-500 max-w-xl mx-auto">
            毎日使う管理画面だから、使い心地と見た目にこだわりました。
          </p>
        </div>

        {/* タブ */}
        <div className={`flex justify-center gap-2 mb-8 transition-all duration-700 delay-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>
          {screens.map((s, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                active === i ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-white'
              }`}>
              {s.label}
            </button>
          ))}
        </div>

        {/* スクリーン */}
        <div className={`transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-sky-100/60 border border-gray-200/60">
            <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-gray-100 rounded-full px-14 py-1.5 text-xs text-gray-400">akinai.app</div>
              </div>
            </div>
            <Image
              key={active}
              src={screens[active].img}
              alt={screens[active].label}
              width={1200} height={750}
              className="w-full object-cover transition-opacity duration-300"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── B2Bセクション ──
function B2BSection() {
  const { ref, visible } = useInView();
  return (
    <section className="py-24 md:py-32 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #f3f0ff 0%, #ffffff 50%, #f0f7ff 100%)' }}>
      <div ref={ref} className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-100">
              <Image src="https://picsum.photos/seed/b2b-quote/800/600" alt="見積管理" width={800} height={600} className="w-full object-cover" />
            </div>
          </div>
          <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <p className="text-xs tracking-[0.3em] uppercase text-sky-500 font-semibold mb-4">For B2B</p>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-6 leading-tight">
              BtoB ECに、<br />本気で向き合う
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              法人取引特有の商習慣に深く対応。掛売り・見積・代理店管理など、BtoCプラットフォームでは難しい領域をカバーします。
            </p>
            <div className="space-y-4">
              {[
                { title: '見積 → 受注の一気通貫', desc: 'オンライン見積からそのまま受注変換。PDF出力も即座に。' },
                { title: '代理店ネットワーク管理', desc: 'コード発行・手数料設定・実績レポートを自動生成。' },
                { title: '権限・組織管理', desc: 'ロール設定でメンバーごとに閲覧・操作権限を細かく制御。' },
              ].map((p, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-1.5 rounded-full bg-sky-200 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-sm font-bold text-gray-800 mb-1">{p.title}</p>
                    <p className="text-sm text-gray-500">{p.desc}</p>
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
  const plans = [
    {
      name: 'Free',
      price: '¥0',
      period: '/ 月',
      desc: '小規模ショップやお試しに',
      features: ['商品50件まで', '月間100注文まで', '1ユーザー', 'ECショップ機能', 'メールサポート'],
      cta: '無料で始める',
      highlight: false,
    },
    {
      name: 'Pro',
      price: '¥9,800',
      period: '/ 月',
      desc: '成長するビジネスに',
      features: ['商品無制限', '注文無制限', '5ユーザー', '見積管理', '代理店管理', 'API / Webhook', '優先サポート'],
      cta: 'Proで始める',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: 'お問合せ',
      period: '',
      desc: '大規模組織・カスタム要件に',
      features: ['すべてのPro機能', 'ユーザー無制限', 'SLA保証', 'カスタム開発', '専任サポート'],
      cta: 'お問い合わせ',
      highlight: false,
    },
  ];
  return (
    <section id="pricing" className="py-24 md:py-32 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #e8f4ff 0%, #f0eeff 50%, #e8f4ff 100%)' }}>
      <div ref={ref} className="max-w-5xl mx-auto px-6">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs tracking-[0.3em] uppercase text-sky-500 font-semibold mb-4">Pricing</p>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">シンプルな料金体系</h2>
          <p className="mt-4 text-gray-500">初期費用・隠れたコストは一切ありません</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <div key={i}
              className={`relative rounded-2xl p-7 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${
                plan.highlight
                  ? 'bg-gray-900 text-white shadow-2xl shadow-gray-900/20 scale-[1.03]'
                  : 'bg-white border border-gray-100'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-400 text-white text-[10px] font-bold px-3 py-1 rounded-full">人気</div>
              )}
              <div className="mb-7">
                <div className={`text-sm font-semibold mb-2 ${plan.highlight ? 'text-gray-400' : 'text-gray-500'}`}>{plan.name}</div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black">{plan.price}</span>
                  <span className={`text-sm mb-1 ${plan.highlight ? 'text-gray-400' : 'text-gray-400'}`}>{plan.period}</span>
                </div>
                <p className={`text-xs mt-2 ${plan.highlight ? 'text-gray-400' : 'text-gray-400'}`}>{plan.desc}</p>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2.5 text-sm">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${plan.highlight ? 'bg-sky-400' : 'bg-sky-300'}`} />
                    <span className={plan.highlight ? 'text-gray-300' : 'text-gray-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup"
                className={`block w-full text-center py-3 rounded-xl text-sm font-bold transition-all ${
                  plan.highlight ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-700'
                }`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTAセクション ──
function CTASection() {
  const { ref, visible } = useInView();
  return (
    <section className="py-24 md:py-32 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #eef6ff 0%, #f5f0ff 50%, #f0f7ff 100%)' }}>
      <div ref={ref} className={`max-w-3xl mx-auto px-6 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-6">
          あなたの「商い」を、<br />
          <span style={{
            background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>もっと自由に。</span>
        </h2>
        <p className="text-gray-500 mb-10 leading-relaxed">
          登録は無料、クレジットカードも不要です。まずはお気軽にお試しください。
        </p>
        <Link href="/signup"
          className="bg-gray-900 text-white font-bold px-10 py-4 rounded-full text-base inline-flex items-center gap-2 hover:bg-gray-700 transition-all shadow-xl shadow-gray-900/20">
          無料でアカウント作成 <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}

// ── フッター ──
function Footer() {
  return (
    <footer className="border-t border-blue-100/50 py-16" style={{ background: 'linear-gradient(180deg, #f0f7ff 0%, #f8f6ff 100%)' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <span className="text-xl font-black" style={{
              background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>AKINAI</span>
            <p className="text-sm mt-3 text-gray-500 leading-relaxed">B2B向け編集型EC対応 汎用CMS</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-4">プロダクト</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#features" className="hover:text-gray-900 transition-colors">機能一覧</a></li>
              <li><a href="#pricing" className="hover:text-gray-900 transition-colors">料金</a></li>
              <li><a href="#screenshots" className="hover:text-gray-900 transition-colors">画面イメージ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-4">サポート</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-gray-900 transition-colors">ヘルプセンター</a></li>
              <li><a href="#" className="hover:text-gray-900 transition-colors">お問い合わせ</a></li>
              <li><a href="#" className="hover:text-gray-900 transition-colors">開発者向けAPI</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-4">法的情報</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="#" className="hover:text-gray-900 transition-colors">利用規約</a></li>
              <li><a href="#" className="hover:text-gray-900 transition-colors">プライバシーポリシー</a></li>
              <li><a href="#" className="hover:text-gray-900 transition-colors">特定商取引法</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-8 text-center text-xs text-gray-400">
          &copy; 2026 AKINAI. All rights reserved.
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
      <LogoBar />
      <FeaturesSection />
      <ScreenshotsSection />
      <B2BSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}

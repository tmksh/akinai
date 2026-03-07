'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  ShoppingCart,
  Users,
  Package,
  FileText,
  Palette,
  Shield,
  Zap,
  ArrowRight,
  ChevronRight,
  Globe,
  TrendingUp,
  Bot,
  Layers,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';

// ── アニメーション用フック ──
function useInView(threshold = 0.15) {
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
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <span
          className="text-2xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #fb923c 40%, #fbbf24 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          AKINAI
        </span>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">機能</a>
          <a href="#screenshots" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">画面イメージ</a>
          <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">料金</a>
          <Link
            href="/login"
            className="text-sm text-gray-700 font-medium hover:text-sky-600 transition-colors"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="btn-premium rounded-full px-6 py-2.5 text-sm font-bold text-white"
          >
            無料で始める
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 px-6 py-4 space-y-3">
          <a href="#features" className="block text-sm text-gray-700 py-2" onClick={() => setMobileOpen(false)}>機能</a>
          <a href="#screenshots" className="block text-sm text-gray-700 py-2" onClick={() => setMobileOpen(false)}>画面イメージ</a>
          <a href="#pricing" className="block text-sm text-gray-700 py-2" onClick={() => setMobileOpen(false)}>料金</a>
          <div className="flex gap-3 pt-2">
            <Link href="/login" className="text-sm text-gray-700 font-medium py-2">ログイン</Link>
            <Link href="/signup" className="btn-premium rounded-full px-5 py-2 text-sm font-bold text-white">無料で始める</Link>
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
    <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: '#faf9f7' }}>
      {/* 装飾サークル */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #fbbf24, transparent 70%)' }} />
      <div className="pointer-events-none absolute top-[20%] -left-24 w-[400px] h-[400px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #fb923c, transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-20 right-[20%] w-[350px] h-[350px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* テキスト */}
          <div className={`space-y-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 bg-sky-50 border border-sky-200/60 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-xs font-medium text-sky-700">B2B EC CMS - オープンベータ公開中</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 leading-[1.15]">
              <span>ECも、CMSも、</span>
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #fb923c 40%, #fbbf24 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                これひとつ。
              </span>
            </h1>

            <p className="text-lg text-gray-500 leading-relaxed max-w-lg">
              商品管理・受注・顧客・見積・コンテンツ・ショップ。
              B2B ECに必要なすべてを、美しいひとつの管理画面に。
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="btn-premium rounded-full px-8 py-4 text-base font-bold text-white text-center flex items-center justify-center gap-2"
              >
                無料で始める <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#screenshots"
                className="rounded-full px-8 py-4 text-base font-medium text-gray-700 text-center border border-gray-200 hover:border-gray-300 hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                画面を見る <ChevronRight className="h-5 w-5" />
              </a>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-400 pt-2">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-sky-400" />クレカ不要</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-sky-400" />即日利用可</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-sky-400" />日本語対応</span>
            </div>
          </div>

          {/* ダッシュボード モックアップ */}
          <div className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── ダッシュボード モックアップ（CSSイラスト）──
function DashboardMockup() {
  return (
    <div className="relative">
      {/* グロー */}
      <div className="absolute -inset-4 rounded-3xl opacity-30"
        style={{ background: 'radial-gradient(ellipse at center, rgba(14,165,233,0.3), transparent 70%)' }} />

      <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200/60" style={{ aspectRatio: '4/3' }}>
        {/* タイトルバー */}
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-sky-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-gray-100 rounded-md px-12 py-1 text-[10px] text-gray-400">akinai.app/dashboard</div>
          </div>
        </div>

        <div className="flex h-[calc(100%-40px)]">
          {/* サイドバー */}
          <div className="w-[52px] bg-gradient-to-b from-gray-50 to-gray-100/50 border-r border-gray-100 py-3 flex flex-col items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-400 to-sky-500 mb-2" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`w-5 h-5 rounded-md ${i === 0 ? 'bg-sky-100' : 'bg-gray-100'}`} />
            ))}
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 p-4 space-y-3 bg-gradient-to-br from-gray-50/50 to-white overflow-hidden">
            {/* KPIカード */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '売上', value: '¥2.4M', color: 'from-sky-400 to-sky-400', change: '+12%' },
                { label: '受注', value: '148', color: 'from-blue-400 to-cyan-400', change: '+8%' },
                { label: '顧客', value: '1,247', color: 'from-emerald-400 to-green-400', change: '+5%' },
                { label: '商品', value: '386', color: 'from-purple-400 to-pink-400', change: '+3%' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-2.5 border border-gray-100 shadow-sm">
                  <div className="text-[8px] text-gray-400 mb-1">{item.label}</div>
                  <div className="text-sm font-bold text-gray-800">{item.value}</div>
                  <div className="text-[8px] text-emerald-500 font-medium">{item.change}</div>
                </div>
              ))}
            </div>

            {/* チャートエリア */}
            <div className="grid grid-cols-3 gap-2 flex-1">
              <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                <div className="text-[9px] text-gray-500 font-medium mb-2">月次売上推移</div>
                <div className="flex items-end gap-1 h-16">
                  {[40, 55, 45, 65, 50, 72, 60, 80, 68, 85, 75, 92].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm" style={{
                      height: `${h}%`,
                      background: i === 11
                        ? 'linear-gradient(to top, #f97316, #fbbf24)'
                        : 'linear-gradient(to top, #fed7aa, #fdba74)',
                    }} />
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                <div className="text-[9px] text-gray-500 font-medium mb-2">達成率</div>
                <div className="flex items-center justify-center h-16">
                  <div className="relative w-14 h-14">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="url(#donut-gradient)" strokeWidth="4"
                        strokeDasharray="88" strokeDashoffset="18" strokeLinecap="round" />
                      <defs>
                        <linearGradient id="donut-gradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#fbbf24" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-800">80%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* テーブル */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <div className="text-[9px] text-gray-500 font-medium mb-2">最近の受注</div>
              <div className="space-y-1.5">
                {[
                  { id: '#1248', customer: '東京商事', amount: '¥128,000', status: '処理中' },
                  { id: '#1247', customer: '大阪物産', amount: '¥256,000', status: '完了' },
                  { id: '#1246', customer: '名古屋工業', amount: '¥84,000', status: '新規' },
                ].map((order, i) => (
                  <div key={i} className="flex items-center justify-between text-[8px] py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-500 font-mono">{order.id}</span>
                    <span className="text-gray-700">{order.customer}</span>
                    <span className="text-gray-800 font-medium">{order.amount}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-medium ${
                      order.status === '完了' ? 'bg-emerald-50 text-emerald-600' :
                      order.status === '処理中' ? 'bg-sky-50 text-sky-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>{order.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 機能セクション ──
function FeaturesSection() {
  const { ref, visible } = useInView();

  const features = [
    { icon: Package, title: '商品管理', desc: '在庫・バリエーション・カテゴリを一元管理。画像も複数枚ドラッグ&ドロップで登録。' },
    { icon: ShoppingCart, title: '受注管理', desc: 'ステータス管理、メール通知、CSV出力。BtoBの掛売りにも対応。' },
    { icon: Users, title: '顧客管理', desc: '法人・個人を統合管理。取引履歴や与信情報もひと目で把握。' },
    { icon: FileText, title: '見積管理', desc: 'オンラインで見積を作成・送付。PDF出力やステータス管理も。' },
    { icon: Globe, title: 'ショップ構築', desc: 'テーマカスタマイズ対応のECショップを自動生成。レスポンシブ対応。' },
    { icon: Layers, title: 'コンテンツ管理', desc: 'ニュース・特集記事・お知らせをリッチエディタで作成・公開。' },
    { icon: Bot, title: '代理店管理', desc: '代理店コード発行、手数料設定、売上レポートの自動生成。' },
    { icon: BarChart3, title: 'ダッシュボード', desc: 'KPI・売上推移・達成率をリアルタイムで可視化。ウィジェットは自由配置。' },
    { icon: Palette, title: 'テーマ設定', desc: 'ショップの配色・フォント・セクション順を管理画面からノーコードで変更。' },
    { icon: Shield, title: '権限管理', desc: 'ロールベースのアクセス制御。メンバー招待や組織管理も。' },
    { icon: TrendingUp, title: 'パフォーマンス', desc: '売上目標の設定と達成率の追跡。グレード評価で組織の健康状態を把握。' },
    { icon: Zap, title: 'Webhook / API', desc: '外部サービスとの連携に対応。Webhook設定やAPIキー管理も管理画面から。' },
  ];

  return (
    <section id="features" className="py-24 md:py-32 bg-white">
      <div ref={ref} className="max-w-7xl mx-auto px-6">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs tracking-[0.3em] uppercase text-sky-500 font-semibold mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            B2B ECに必要な機能を、すべて搭載
          </h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            複数のSaaSを組み合わせる必要はありません。AKINAIひとつで、商品登録からショップ公開、受注・顧客管理まで完結します。
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className={`group p-6 rounded-2xl border border-gray-100 hover:border-sky-200 bg-white hover:bg-sky-50/30 transition-all duration-500 ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ transitionDelay: `${i * 50}ms` }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-sky-50 flex items-center justify-center mb-4 group-hover:from-sky-200 group-hover:to-sky-100 transition-colors">
                  <Icon className="h-5 w-5 text-sky-500" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── スクリーンショットセクション ──
function ScreenshotsSection() {
  const { ref, visible } = useInView();
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: 'ダッシュボード', content: <DashboardScreenMock /> },
    { label: '商品管理', content: <ProductsScreenMock /> },
    { label: 'ショップ', content: <ShopScreenMock /> },
    { label: '受注一覧', content: <OrdersScreenMock /> },
  ];

  return (
    <section id="screenshots" className="py-24 md:py-32" style={{ background: 'linear-gradient(180deg, #faf9f7 0%, #f5f3f0 100%)' }}>
      <div ref={ref} className="max-w-7xl mx-auto px-6">
        <div className={`text-center mb-12 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs tracking-[0.3em] uppercase text-sky-500 font-semibold mb-3">Screenshots</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            洗練された管理画面
          </h2>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            ガラスモーフィズムを採用した美しいUI。毎日使う管理画面だからこそ、使い心地にこだわりました。
          </p>
        </div>

        {/* タブ */}
        <div className={`flex justify-center gap-2 mb-10 transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === i
                  ? 'bg-gradient-to-r from-sky-500 to-sky-500 text-white shadow-lg shadow-sky-200'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* スクリーン */}
        <div className={`transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="relative">
            <div className="absolute -inset-6 rounded-3xl opacity-20"
              style={{ background: 'radial-gradient(ellipse at center, rgba(14,165,233,0.4), transparent 70%)' }} />
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200/60">
              {/* ブラウザバー */}
              <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-sky-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-gray-100 rounded-md px-16 py-1.5 text-xs text-gray-400">akinai.app</div>
                </div>
              </div>
              <div className="p-0">
                {tabs[activeTab].content}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── ダッシュボード スクリーンモック ──
function DashboardScreenMock() {
  return (
    <div className="flex" style={{ height: 480 }}>
      {/* サイドバー */}
      <MockSidebar active={0} />

      {/* メイン */}
      <div className="flex-1 p-6 space-y-5 bg-gradient-to-br from-gray-50/80 to-white overflow-hidden">
        <div>
          <div className="text-lg font-bold text-gray-900">ダッシュボード</div>
          <div className="text-xs text-gray-400">ショップの概要をひと目で確認</div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: '月間売上', value: '¥2,480,000', change: '+12.5%', icon: '💰' },
            { label: '月間受注', value: '148件', change: '+8.2%', icon: '📦' },
            { label: '総顧客数', value: '1,247', change: '+5.1%', icon: '👥' },
            { label: '登録商品', value: '386', change: '+3件', icon: '🏷️' },
          ].map((item, i) => (
            <div key={i} className="bg-white/60 backdrop-blur rounded-2xl p-4 border border-white/60 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">{item.label}</span>
                <span className="text-base">{item.icon}</span>
              </div>
              <div className="text-xl font-bold text-gray-800">{item.value}</div>
              <div className="text-xs text-emerald-500 font-semibold mt-1">{item.change}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 bg-white/60 backdrop-blur rounded-2xl border border-white/60 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-700 mb-4">売上推移</div>
            <div className="flex items-end gap-1.5 h-28">
              {[35, 50, 42, 60, 48, 68, 55, 75, 62, 82, 70, 90].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md transition-all" style={{
                  height: `${h}%`,
                  background: i === 11
                    ? 'linear-gradient(to top, #ea580c, #f97316, #fbbf24)'
                    : 'linear-gradient(to top, #fed7aa, #fdba74)',
                  opacity: i === 11 ? 1 : 0.7,
                }} />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[9px] text-gray-300">
              <span>1月</span><span>6月</span><span>12月</span>
            </div>
          </div>
          <div className="col-span-2 bg-white/60 backdrop-blur rounded-2xl border border-white/60 shadow-sm p-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">目標達成率</div>
            <div className="flex items-center justify-center py-2">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="url(#screen-donut)" strokeWidth="3"
                    strokeDasharray="94.2" strokeDashoffset="18.8" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="screen-donut" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ea580c" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-gray-800">80%</span>
                  <span className="text-[9px] text-gray-400">達成</span>
                </div>
              </div>
            </div>
            <div className="text-center text-[10px] text-sky-500 font-semibold mt-1">グレード: A</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 商品管理 スクリーンモック ──
function ProductsScreenMock() {
  return (
    <div className="flex" style={{ height: 480 }}>
      <MockSidebar active={2} />
      <div className="flex-1 p-6 space-y-5 bg-gradient-to-br from-gray-50/80 to-white overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">商品管理</div>
            <div className="text-xs text-gray-400">386件の商品</div>
          </div>
          <div className="flex gap-2">
            <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-xs text-gray-500">検索...</div>
            <div className="bg-gradient-to-r from-sky-500 to-sky-500 rounded-lg px-4 py-1.5 text-xs text-white font-semibold">+ 新規追加</div>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur rounded-2xl border border-white/60 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[10px] font-semibold text-gray-400 px-4 py-3 uppercase tracking-wider">商品名</th>
                <th className="text-left text-[10px] font-semibold text-gray-400 px-4 py-3 uppercase tracking-wider">カテゴリ</th>
                <th className="text-right text-[10px] font-semibold text-gray-400 px-4 py-3 uppercase tracking-wider">価格</th>
                <th className="text-right text-[10px] font-semibold text-gray-400 px-4 py-3 uppercase tracking-wider">在庫</th>
                <th className="text-center text-[10px] font-semibold text-gray-400 px-4 py-3 uppercase tracking-wider">状態</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'プレミアムレザーバッグ', cat: 'バッグ', price: '¥45,000', stock: 24, status: '公開中' },
                { name: 'オーガニックコットンT', cat: 'アパレル', price: '¥8,800', stock: 156, status: '公開中' },
                { name: 'ステンレスタンブラー', cat: '雑貨', price: '¥3,200', stock: 89, status: '公開中' },
                { name: 'ウール混カーディガン', cat: 'アパレル', price: '¥22,000', stock: 3, status: '残少' },
                { name: 'アロマキャンドルセット', cat: '雑貨', price: '¥5,500', stock: 42, status: '公開中' },
                { name: 'リネンストール', cat: 'アクセサリー', price: '¥12,000', stock: 0, status: '在庫切' },
                { name: 'レザーカードケース', cat: '小物', price: '¥15,000', stock: 67, status: '公開中' },
              ].map((p, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-sky-50/30 transition-colors">
                  <td className="px-4 py-3 text-xs font-medium text-gray-800 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 shrink-0" />
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.cat}</td>
                  <td className="px-4 py-3 text-xs text-gray-800 font-medium text-right">{p.price}</td>
                  <td className="px-4 py-3 text-xs text-right">
                    <span className={p.stock === 0 ? 'text-red-500' : p.stock < 5 ? 'text-sky-500' : 'text-gray-600'}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      p.status === '公開中' ? 'bg-emerald-50 text-emerald-600' :
                      p.status === '残少' ? 'bg-sky-50 text-sky-600' :
                      'bg-red-50 text-red-500'
                    }`}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── ショップ スクリーンモック ──
function ShopScreenMock() {
  return (
    <div style={{ height: 480 }} className="overflow-hidden bg-white">
      {/* ショップヘッダー */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
        <span className="text-lg font-bold text-gray-800" style={{ fontFamily: 'serif' }}>AKINAI Store</span>
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <span>Products</span>
          <span>About</span>
          <span>News</span>
          <span>Contact</span>
          <div className="w-5 h-5 rounded-full bg-gray-100" />
        </div>
      </div>

      {/* ヒーロー */}
      <div className="relative h-36 bg-gradient-to-br from-sky-50 via-sky-50 to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-[10px] tracking-[0.4em] uppercase text-gray-400 mb-1">New Collection</p>
          <h2 className="text-2xl font-light text-gray-800" style={{ fontFamily: 'serif' }}>日々と共にあるすべてのものに</h2>
          <div className="mt-3 inline-block border border-gray-800 px-4 py-1 text-[10px] text-gray-800 hover:bg-gray-800 hover:text-white transition-colors">
            View Collection →
          </div>
        </div>
      </div>

      {/* 商品グリッド */}
      <div className="px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-800">注目製品</h3>
          <span className="text-[10px] text-gray-400">すべて見る →</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { name: 'レザートートバッグ', price: '¥45,000', color: 'from-sky-100 to-sky-200' },
            { name: 'コットンシャツ', price: '¥12,800', color: 'from-blue-50 to-blue-100' },
            { name: 'リネンパンツ', price: '¥18,500', color: 'from-stone-100 to-stone-200' },
            { name: 'ウールストール', price: '¥22,000', color: 'from-rose-50 to-rose-100' },
          ].map((product, i) => (
            <div key={i} className="group cursor-pointer">
              <div className={`aspect-square rounded-lg bg-gradient-to-br ${product.color} mb-2 group-hover:shadow-md transition-shadow`} />
              <div className="text-xs text-gray-700">{product.name}</div>
              <div className="text-xs text-gray-400">{product.price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ビジネスバー */}
      <div className="mx-8 bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white">法人・大口のお客様へ</div>
          <div className="text-[10px] text-gray-400">ロット購入で特別価格をご提供</div>
        </div>
        <div className="bg-white/20 backdrop-blur rounded-full px-4 py-1.5 text-[10px] text-white font-medium">
          お見積り依頼 →
        </div>
      </div>
    </div>
  );
}

// ── 受注一覧 スクリーンモック ──
function OrdersScreenMock() {
  return (
    <div className="flex" style={{ height: 480 }}>
      <MockSidebar active={3} />
      <div className="flex-1 p-6 space-y-5 bg-gradient-to-br from-gray-50/80 to-white overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">受注管理</div>
            <div className="text-xs text-gray-400">全148件</div>
          </div>
          <div className="flex gap-2">
            {['すべて', '新規', '処理中', '発送済', '完了'].map((f, i) => (
              <div key={i} className={`px-3 py-1 rounded-full text-[10px] font-medium ${
                i === 0 ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{f}</div>
            ))}
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur rounded-2xl border border-white/60 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[10px] font-semibold text-gray-400 px-4 py-3">注文番号</th>
                <th className="text-left text-[10px] font-semibold text-gray-400 px-4 py-3">顧客名</th>
                <th className="text-left text-[10px] font-semibold text-gray-400 px-4 py-3">日付</th>
                <th className="text-right text-[10px] font-semibold text-gray-400 px-4 py-3">金額</th>
                <th className="text-center text-[10px] font-semibold text-gray-400 px-4 py-3">ステータス</th>
                <th className="text-center text-[10px] font-semibold text-gray-400 px-4 py-3">決済</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: '#ORD-1248', name: '東京商事株式会社', date: '2026/03/07', amount: '¥128,000', status: '処理中', payment: '請求書' },
                { id: '#ORD-1247', name: '大阪物産株式会社', date: '2026/03/06', amount: '¥256,400', status: '発送済', payment: 'カード' },
                { id: '#ORD-1246', name: '名古屋工業株式会社', date: '2026/03/06', amount: '¥84,000', status: '新規', payment: '請求書' },
                { id: '#ORD-1245', name: '福岡デザイン事務所', date: '2026/03/05', amount: '¥42,800', status: '完了', payment: 'カード' },
                { id: '#ORD-1244', name: '札幌トレーディング', date: '2026/03/05', amount: '¥198,000', status: '完了', payment: '銀行振込' },
                { id: '#ORD-1243', name: '横浜ファクトリー', date: '2026/03/04', amount: '¥67,200', status: '発送済', payment: 'カード' },
                { id: '#ORD-1242', name: '京都クラフト合同会社', date: '2026/03/04', amount: '¥312,000', status: '処理中', payment: '請求書' },
                { id: '#ORD-1241', name: '仙台ロジスティクス', date: '2026/03/03', amount: '¥95,600', status: '完了', payment: '銀行振込' },
              ].map((o, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-sky-50/30 transition-colors">
                  <td className="px-4 py-2.5 text-xs font-mono text-sky-600">{o.id}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-800">{o.name}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{o.date}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-800 text-right">{o.amount}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      o.status === '完了' ? 'bg-emerald-50 text-emerald-600' :
                      o.status === '発送済' ? 'bg-blue-50 text-blue-600' :
                      o.status === '処理中' ? 'bg-sky-50 text-sky-600' :
                      'bg-purple-50 text-purple-600'
                    }`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-[10px] text-gray-500">{o.payment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── サイドバー モック共通 ──
function MockSidebar({ active }: { active: number }) {
  const items = [
    { label: 'ダッシュボード', icon: '📊' },
    { label: 'コンテンツ', icon: '📝' },
    { label: '商品管理', icon: '🏷️' },
    { label: '受注管理', icon: '📦' },
    { label: '顧客管理', icon: '👥' },
    { label: '見積管理', icon: '📋' },
    { label: '代理店', icon: '🤝' },
    { label: '設定', icon: '⚙️' },
  ];

  return (
    <div className="w-48 bg-gradient-to-b from-gray-50/80 to-white border-r border-gray-100 py-4 px-3 shrink-0">
      <div className="flex items-center gap-2 px-2 mb-6">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-sky-500" />
        <span className="text-sm font-bold" style={{
          background: 'linear-gradient(135deg, #f97316, #fbbf24)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>AKINAI</span>
      </div>
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors ${
            active === i ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'
          }`}>
            <span className="text-sm">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── B2Bセクション ──
function B2BSection() {
  const { ref, visible } = useInView();

  const points = [
    { title: '法人向けEC', desc: '卸売価格、ロット割引、掛売りなどBtoB特有の商習慣に対応。', icon: '🏢' },
    { title: '見積 → 受注の一気通貫', desc: 'オンライン見積からそのまま受注に変換。ペーパーレスで効率化。', icon: '📄' },
    { title: '代理店ネットワーク', desc: '代理店コード発行・手数料管理・実績レポートまでを一元化。', icon: '🤝' },
    { title: '権限・組織管理', desc: 'メンバー招待、ロールベースの権限設定で安全に複数人運用。', icon: '🔐' },
  ];

  return (
    <section className="py-24 md:py-32 bg-gray-900 text-white overflow-hidden">
      <div ref={ref} className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <p className="text-xs tracking-[0.3em] uppercase text-sky-400 font-semibold mb-3">For B2B</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6">
              BtoB ECに
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-sky-400">
                本気で向き合う
              </span>
            </h2>
            <p className="text-gray-400 mb-10 leading-relaxed">
              AKINAIは、法人取引特有の商習慣を深く理解して設計されたEC CMSです。
              掛売り・見積・代理店管理など、BtoCプラットフォームでは対応しきれない領域をカバーします。
            </p>

            <div className="space-y-6">
              {points.map((point, i) => (
                <div key={i} className="flex gap-4" style={{ transitionDelay: `${i * 100}ms` }}>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg shrink-0">
                    {point.icon}
                  </div>
                  <div>
                    <div className="text-sm font-bold mb-1">{point.title}</div>
                    <div className="text-xs text-gray-400 leading-relaxed">{point.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 見積モックアップ */}
          <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 text-gray-900 relative">
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-sky-500 to-sky-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                PDF出力対応
              </div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-lg font-bold">見積書</div>
                  <div className="text-xs text-gray-400">QT-2026-0342</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400">発行日</div>
                  <div className="text-xs font-medium">2026年3月7日</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] text-gray-400 mb-1">宛先</div>
                  <div className="font-semibold">東京商事株式会社</div>
                  <div className="text-gray-500">購買部 田中様</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] text-gray-400 mb-1">有効期限</div>
                  <div className="font-semibold">2026年4月6日</div>
                  <div className="text-sky-500 font-medium">残り30日</div>
                </div>
              </div>

              <table className="w-full text-xs mb-4">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-gray-400 font-medium">品名</th>
                    <th className="text-right py-2 text-gray-400 font-medium">数量</th>
                    <th className="text-right py-2 text-gray-400 font-medium">単価</th>
                    <th className="text-right py-2 text-gray-400 font-medium">小計</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'プレミアムレザーバッグ', qty: 20, price: 45000 },
                    { name: 'レザーカードケース', qty: 50, price: 15000 },
                    { name: 'ステンレスタンブラー', qty: 100, price: 3200 },
                  ].map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2.5">{item.name}</td>
                      <td className="py-2.5 text-right">{item.qty}</td>
                      <td className="py-2.5 text-right">¥{item.price.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-medium">¥{(item.qty * item.price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="text-right space-y-1">
                  <div className="text-xs text-gray-400">小計: ¥1,970,000</div>
                  <div className="text-xs text-gray-400">消費税(10%): ¥197,000</div>
                  <div className="text-lg font-black text-sky-600">合計: ¥2,167,000</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <div className="flex-1 bg-gradient-to-r from-sky-500 to-sky-500 text-white text-center py-2 rounded-lg text-xs font-bold">
                  受注に変換
                </div>
                <div className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600">
                  PDFダウンロード
                </div>
              </div>
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
      features: ['すべてのPro機能', 'ユーザー無制限', 'SLA保証', 'カスタム開発', '専任サポート', 'オンプレ対応'],
      cta: 'お問い合わせ',
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 md:py-32 bg-white">
      <div ref={ref} className="max-w-5xl mx-auto px-6">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-xs tracking-[0.3em] uppercase text-sky-500 font-semibold mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            シンプルな料金体系
          </h2>
          <p className="mt-4 text-gray-500">初期費用・隠れたコストは一切ありません</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative rounded-2xl p-7 transition-all duration-700 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              } ${
                plan.highlight
                  ? 'bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-2xl shadow-sky-200 scale-[1.03]'
                  : 'bg-gray-50 border border-gray-100'
              }`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-sky-400 text-gray-900 text-[10px] font-bold px-3 py-1 rounded-full">
                  人気
                </div>
              )}
              <div className="mb-6">
                <div className={`text-sm font-bold mb-2 ${plan.highlight ? 'text-sky-100' : 'text-gray-500'}`}>{plan.name}</div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black">{plan.price}</span>
                  <span className={`text-sm mb-1 ${plan.highlight ? 'text-sky-200' : 'text-gray-400'}`}>{plan.period}</span>
                </div>
                <div className={`text-xs mt-2 ${plan.highlight ? 'text-sky-100' : 'text-gray-400'}`}>{plan.desc}</div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.highlight ? 'text-sky-300' : 'text-sky-400'}`} />
                    <span className={plan.highlight ? 'text-white/90' : 'text-gray-600'}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`block w-full text-center py-3 rounded-xl text-sm font-bold transition-all ${
                  plan.highlight
                    ? 'bg-white text-sky-600 hover:bg-sky-50 shadow-lg'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
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
    <section className="py-24 md:py-32 relative overflow-hidden" style={{ background: '#faf9f7' }}>
      <div className="pointer-events-none absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #fbbf24, transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-[300px] h-[300px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #fb923c, transparent 70%)' }} />

      <div ref={ref} className={`relative z-10 max-w-3xl mx-auto px-6 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-6">
          あなたの「商い」を、
          <br />
          <span
            style={{
              background: 'linear-gradient(135deg, #f97316 0%, #fb923c 40%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            もっと自由に。
          </span>
        </h2>
        <p className="text-gray-500 mb-10 max-w-lg mx-auto leading-relaxed">
          登録は無料、クレジットカードも不要です。
          まずはお気軽にお試しください。
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="btn-premium rounded-full px-10 py-4 text-base font-bold text-white flex items-center justify-center gap-2"
          >
            無料でアカウント作成 <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── フッター ──
function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <span
              className="text-2xl font-black"
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #fb923c 40%, #fbbf24 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AKINAI
            </span>
            <p className="text-sm mt-3 text-gray-500 leading-relaxed">
              B2B向け編集型EC対応 汎用CMS
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">プロダクト</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">機能一覧</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">料金</a></li>
              <li><a href="#screenshots" className="hover:text-white transition-colors">画面イメージ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">サポート</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">ヘルプセンター</a></li>
              <li><a href="#" className="hover:text-white transition-colors">お問い合わせ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">開発者向けAPI</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">法的情報</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">利用規約</a></li>
              <li><a href="#" className="hover:text-white transition-colors">プライバシーポリシー</a></li>
              <li><a href="#" className="hover:text-white transition-colors">特定商取引法に基づく表記</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-8 text-center text-xs text-gray-600">
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
      <FeaturesSection />
      <ScreenshotsSection />
      <B2BSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  );
}

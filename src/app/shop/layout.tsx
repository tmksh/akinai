'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Instagram } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ShopThemeProvider, useShopTheme } from '@/components/providers/shop-theme-provider';
import { ShopThemeSettings, DEFAULT_SHOP_THEME } from '@/types';

// カート状態をシンプルに管理
const useCart = () => {
  return { itemCount: 0 };
};

function StoreHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { theme } = useShopTheme();

  const navLinks = [
    { href: '/shop/products', label: 'すべての製品' },
    { href: '/shop/products?category=gift', label: 'ギフトボックス' },
    { href: '/shop/news', label: 'ニュース' },
    { href: '/shop/about', label: '店舗' },
  ];

  return (
    <header 
      className="sticky top-0 z-50 border-b"
      style={{ 
        backgroundColor: 'var(--shop-color-background, #ffffff)',
        borderColor: 'var(--shop-color-border, #e2e8f0)',
      }}
    >
      {/* トップバナー */}
      {theme.header.bannerEnabled && (
        <div 
          className="text-center py-2"
          style={{ 
            background: `linear-gradient(to right, var(--shop-banner-bg, #f5efe8), var(--shop-color-surface, #faf8f5))`,
          }}
        >
          <Link 
            href="/shop/news/1" 
            className="text-xs transition-colors hover:opacity-80"
            style={{ color: 'var(--shop-banner-text, #475569)' }}
          >
            {theme.header.bannerText}
          </Link>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* ロゴ */}
          <Link href="/shop" className="flex items-center">
            <span 
              className="text-lg md:text-xl font-medium tracking-wider"
              style={{ 
                color: 'var(--shop-color-text, #1e293b)',
                fontFamily: 'var(--shop-font-heading)',
              }}
            >
              {theme.header.logoText}
            </span>
          </Link>

          {/* デスクトップナビゲーション */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm transition-colors hover:opacity-70"
                style={{ 
                  color: 'var(--shop-color-text-muted, #64748b)',
                  fontFamily: 'var(--shop-font-body)',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 右側アクション */}
          <div className="flex items-center gap-6">
            <Link
              href="/shop/account"
              className="hidden md:block text-sm transition-colors hover:opacity-70"
              style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
            >
              ログイン
            </Link>
            
            <Link 
              href="/shop/cart" 
              className="text-sm transition-colors hover:opacity-70 flex items-center gap-1"
              style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
            >
              カート ({itemCount})
            </Link>

            {/* モバイルメニューボタン */}
            <button
              className="md:hidden p-1"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ color: 'var(--shop-color-text, #1e293b)' }}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* モバイルメニュー */}
      <div 
        className={cn(
          "md:hidden fixed inset-0 top-[89px] z-40 transition-transform duration-300",
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ backgroundColor: 'var(--shop-color-background, #ffffff)' }}
      >
        <nav className="flex flex-col p-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-4 text-base border-b"
              style={{ 
                color: 'var(--shop-color-text, #1e293b)',
                borderColor: 'var(--shop-color-border, #e2e8f0)',
              }}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/shop/account"
            className="py-4 text-base border-b"
            style={{ 
              color: 'var(--shop-color-text, #1e293b)',
              borderColor: 'var(--shop-color-border, #e2e8f0)',
            }}
            onClick={() => setIsMenuOpen(false)}
          >
            ログイン
          </Link>
        </nav>
      </div>
    </header>
  );
}

function StoreFooter() {
  const { theme } = useShopTheme();

  return (
    <footer 
      className="border-t"
      style={{ 
        backgroundColor: 'var(--shop-color-surface, #faf8f5)',
        borderColor: 'var(--shop-color-border, #e2e8f0)',
      }}
    >
      {/* メインフッター */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* ヘルプ・サポート */}
          <div>
            <h4 
              className="text-sm font-medium mb-4"
              style={{ color: 'var(--shop-color-text, #1e293b)' }}
            >
              ヘルプ・サポート
            </h4>
            <ul className="space-y-3 text-sm" style={{ color: 'var(--shop-color-text-muted, #64748b)' }}>
              <li><Link href="/shop/about" className="hover:opacity-70 transition-colors">商いストアについて</Link></li>
              <li><Link href="/shop/faq" className="hover:opacity-70 transition-colors">よくある質問</Link></li>
              <li><Link href="/shop/contact" className="hover:opacity-70 transition-colors">お問い合わせ</Link></li>
              <li><Link href="/shop/legal" className="hover:opacity-70 transition-colors">特定商取引法に基づく表記</Link></li>
              <li><Link href="/shop/terms" className="hover:opacity-70 transition-colors">利用規約</Link></li>
              <li><Link href="/shop/privacy" className="hover:opacity-70 transition-colors">プライバシーポリシー</Link></li>
            </ul>
          </div>

          {/* ソーシャルメディア */}
          {theme.footer.showSocialLinks && (
            <div>
              <h4 
                className="text-sm font-medium mb-4"
                style={{ color: 'var(--shop-color-text, #1e293b)' }}
              >
                ソーシャルメディア
              </h4>
              <ul className="space-y-3 text-sm" style={{ color: 'var(--shop-color-text-muted, #64748b)' }}>
                <li>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-colors flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:opacity-70 transition-colors">LINE</a>
                </li>
              </ul>
            </div>
          )}

          {/* LINE連携 */}
          <div>
            <h4 
              className="text-sm font-medium mb-4"
              style={{ color: 'var(--shop-color-text, #1e293b)' }}
            >
              LINE連携で10%オフクーポン
            </h4>
            <a
              href="#"
              className="inline-block border px-6 py-2 text-sm transition-colors hover:opacity-70"
              style={{ 
                borderColor: 'var(--shop-color-border, #e2e8f0)',
                color: 'var(--shop-color-text-muted, #64748b)',
              }}
            >
              LINEを連携する
            </a>
          </div>

          {/* ニュースレター */}
          {theme.footer.showNewsletter && (
            <div>
              <h4 
                className="text-sm font-medium mb-4"
                style={{ color: 'var(--shop-color-text, #1e293b)' }}
              >
                ニュースレター
              </h4>
              <p 
                className="text-sm mb-4 leading-relaxed"
                style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
              >
                メール購読の登録を行うと、商いストアからのお知らせやメール会員限定の情報などをお受け取りいただけます。
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="メールアドレス"
                  className="text-sm"
                  style={{ 
                    backgroundColor: 'var(--shop-color-background, #ffffff)',
                    borderColor: 'var(--shop-color-border, #e2e8f0)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* コピーライト */}
      <div 
        className="border-t"
        style={{ borderColor: 'var(--shop-color-border, #e2e8f0)' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p 
            className="text-xs text-center"
            style={{ color: 'var(--shop-color-text-muted, #64748b)' }}
          >
            {theme.footer.copyrightText}
          </p>
        </div>
      </div>
    </footer>
  );
}

function ShopLayoutContent({ children }: { children: React.ReactNode }) {
  const { theme } = useShopTheme();
  
  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ 
        backgroundColor: 'var(--shop-color-background, #ffffff)',
        fontFamily: 'var(--shop-font-body)',
      }}
    >
      <StoreHeader />
      <main className="flex-1">
        {children}
      </main>
      <StoreFooter />
    </div>
  );
}

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<ShopThemeSettings>(DEFAULT_SHOP_THEME);

  // テーマ設定を取得（ローカルストレージまたはAPIから）
  useEffect(() => {
    // TODO: 実際のAPIから取得する場合はここを修正
    // 現在はデフォルトテーマを使用
    const savedTheme = localStorage.getItem('shop-theme');
    if (savedTheme) {
      try {
        setTheme(JSON.parse(savedTheme));
      } catch {
        // パースエラーの場合はデフォルトを使用
      }
    }
  }, []);

  return (
    <ShopThemeProvider initialTheme={theme}>
      <ShopLayoutContent>{children}</ShopLayoutContent>
    </ShopThemeProvider>
  );
}

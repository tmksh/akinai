'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { 
  ShoppingCart, 
  Menu, 
  X, 
  MapPin,
  Phone,
  Mail,
  Instagram,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// カート状態をシンプルに管理
const useCart = () => {
  return { itemCount: 0 };
};

function StoreHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { itemCount } = useCart();

  const navLinks = [
    { href: '/shop/products', label: 'すべての製品' },
    { href: '/shop/products?category=gift', label: 'ギフトボックス' },
    { href: '/shop/news', label: 'ニュース' },
    { href: '/shop/about', label: '店舗' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
      {/* トップバナー */}
      <div className="bg-gradient-to-r from-[#f5efe8] to-[#faf8f5] text-center py-2">
        <Link href="/shop/news/1" className="text-xs text-slate-600 hover:text-slate-800 transition-colors">
          ご注文金額¥5,000以上で送料無料
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* ロゴ */}
          <Link href="/shop" className="flex items-center">
            <span className="text-lg md:text-xl font-medium tracking-wider text-slate-800">
              AKINAI
            </span>
          </Link>

          {/* デスクトップナビゲーション */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* 右側アクション */}
          <div className="flex items-center gap-6">
            <Link
              href="/shop/account"
              className="hidden md:block text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              ログイン
            </Link>
            
            <Link 
              href="/shop/cart" 
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              カート ({itemCount})
            </Link>

            {/* モバイルメニューボタン */}
            <button
              className="md:hidden p-1"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* モバイルメニュー */}
      <div className={cn(
        "md:hidden fixed inset-0 top-[89px] bg-white z-40 transition-transform duration-300",
        isMenuOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <nav className="flex flex-col p-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-4 text-base text-slate-700 border-b border-slate-100"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/shop/account"
            className="py-4 text-base text-slate-700 border-b border-slate-100"
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
  return (
    <footer className="bg-[#faf8f5] border-t border-slate-100">
      {/* メインフッター */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* ヘルプ・サポート */}
          <div>
            <h4 className="text-sm font-medium text-slate-800 mb-4">ヘルプ・サポート</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><Link href="/shop/about" className="hover:text-slate-800 transition-colors">商いストアについて</Link></li>
              <li><Link href="/shop/faq" className="hover:text-slate-800 transition-colors">よくある質問</Link></li>
              <li><Link href="/shop/contact" className="hover:text-slate-800 transition-colors">お問い合わせ</Link></li>
              <li><Link href="/shop/legal" className="hover:text-slate-800 transition-colors">特定商取引法に基づく表記</Link></li>
              <li><Link href="/shop/terms" className="hover:text-slate-800 transition-colors">利用規約</Link></li>
              <li><Link href="/shop/privacy" className="hover:text-slate-800 transition-colors">プライバシーポリシー</Link></li>
            </ul>
          </div>

          {/* ソーシャルメディア */}
          <div>
            <h4 className="text-sm font-medium text-slate-800 mb-4">ソーシャルメディア</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800 transition-colors flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-slate-800 transition-colors">LINE</a>
              </li>
            </ul>
          </div>

          {/* LINE連携 */}
          <div>
            <h4 className="text-sm font-medium text-slate-800 mb-4">LINE連携で10%オフクーポン</h4>
            <a
              href="#"
              className="inline-block border border-slate-300 hover:border-slate-800 px-6 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              LINEを連携する
            </a>
          </div>

          {/* ニュースレター */}
          <div>
            <h4 className="text-sm font-medium text-slate-800 mb-4">ニュースレター</h4>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              メール購読の登録を行うと、商いストアからのお知らせやメール会員限定の情報などをお受け取りいただけます。
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="メールアドレス"
                className="text-sm bg-white border-slate-200 focus:border-slate-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* コピーライト */}
      <div className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <p className="text-xs text-slate-400 text-center">
            © AKINAI All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <StoreHeader />
      <main className="flex-1">
        {children}
      </main>
      <StoreFooter />
    </div>
  );
}

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ShopThemeSettings, DEFAULT_SHOP_THEME } from '@/types';

interface ShopThemeContextType {
  theme: ShopThemeSettings;
  isLoading: boolean;
}

const ShopThemeContext = createContext<ShopThemeContextType>({
  theme: DEFAULT_SHOP_THEME,
  isLoading: true,
});

export function useShopTheme() {
  return useContext(ShopThemeContext);
}

// CSS変数をセットする関数
function applyThemeCssVariables(theme: ShopThemeSettings) {
  const root = document.documentElement;
  
  // カラー変数
  root.style.setProperty('--shop-color-primary', theme.colors.primary);
  root.style.setProperty('--shop-color-secondary', theme.colors.secondary);
  root.style.setProperty('--shop-color-background', theme.colors.background);
  root.style.setProperty('--shop-color-surface', theme.colors.surface);
  root.style.setProperty('--shop-color-text', theme.colors.text);
  root.style.setProperty('--shop-color-text-muted', theme.colors.textMuted);
  root.style.setProperty('--shop-color-accent', theme.colors.accent);
  root.style.setProperty('--shop-color-border', theme.colors.border);
  
  // フォント変数
  const fontMap: Record<string, string> = {
    'noto-sans': '"Noto Sans JP", sans-serif',
    'noto-serif': '"Noto Serif JP", serif',
    'zen-kaku': '"Zen Kaku Gothic New", sans-serif',
    'zen-maru': '"Zen Maru Gothic", sans-serif',
    'shippori-mincho': '"Shippori Mincho", serif',
  };
  
  root.style.setProperty('--shop-font-heading', fontMap[theme.fonts.heading] || fontMap['noto-sans']);
  root.style.setProperty('--shop-font-body', fontMap[theme.fonts.body] || fontMap['noto-sans']);
  
  // フォントサイズ
  const fontSizeScale: Record<string, string> = {
    small: '0.9',
    medium: '1',
    large: '1.1',
  };
  root.style.setProperty('--shop-font-size-scale', fontSizeScale[theme.fonts.size] || '1');
  
  // ヘッダーバナー
  root.style.setProperty('--shop-banner-bg', theme.header.bannerBackgroundColor);
  root.style.setProperty('--shop-banner-text', theme.header.bannerTextColor);
}

interface ShopThemeProviderProps {
  children: ReactNode;
  initialTheme?: ShopThemeSettings;
}

export function ShopThemeProvider({ children, initialTheme }: ShopThemeProviderProps) {
  const [theme, setTheme] = useState<ShopThemeSettings>(initialTheme || DEFAULT_SHOP_THEME);
  const [isLoading, setIsLoading] = useState(!initialTheme);

  useEffect(() => {
    // CSS変数を適用
    applyThemeCssVariables(theme);
  }, [theme]);

  useEffect(() => {
    if (initialTheme) {
      setTheme(initialTheme);
      setIsLoading(false);
    }
  }, [initialTheme]);

  return (
    <ShopThemeContext.Provider value={{ theme, isLoading }}>
      {children}
    </ShopThemeContext.Provider>
  );
}


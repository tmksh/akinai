'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Palette, Sun, Moon, Monitor, Check } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const fontSizes = [
  { value: 'small', label: '小', description: 'コンパクトな表示' },
  { value: 'medium', label: '中', description: '標準サイズ' },
  { value: 'large', label: '大', description: '大きめの文字' },
];

const densities = [
  { value: 'compact', label: 'コンパクト', description: '情報を多く表示' },
  { value: 'comfortable', label: '標準', description: 'バランスの取れた表示' },
  { value: 'spacious', label: 'ゆったり', description: '余白を多めに' },
];

export default function ThemeSettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [fontSize, setFontSize] = useState('medium');
  const [density, setDensity] = useState('comfortable');

  // ハイドレーションエラーを防ぐ
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    const labels: Record<string, string> = {
      light: 'ライトモード',
      dark: 'ダークモード',
      system: 'システム設定',
    };
    toast.success(`テーマを${labels[newTheme]}に変更しました`);
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">管理画面テーマ</h1>
          <p className="text-muted-foreground">管理画面のカラーテーマを変更</p>
        </div>
      </div>

      {/* カラーモード */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle>カラーモード</CardTitle>
          </div>
          <CardDescription>
            管理画面の配色を選択します
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!mounted ? (
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => handleThemeChange('light')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  theme === 'light'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                )}
              >
                <div className="p-3 rounded-full bg-amber-100">
                  <Sun className="h-6 w-6 text-amber-600" />
                </div>
                <span className="font-medium">ライト</span>
                {theme === 'light' && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>

              <button
                onClick={() => handleThemeChange('dark')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  theme === 'dark'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                )}
              >
                <div className="p-3 rounded-full bg-slate-800">
                  <Moon className="h-6 w-6 text-slate-200" />
                </div>
                <span className="font-medium">ダーク</span>
                {theme === 'dark' && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>

              <button
                onClick={() => handleThemeChange('system')}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  theme === 'system'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                )}
              >
                <div className="p-3 rounded-full bg-gradient-to-br from-amber-100 to-slate-800">
                  <Monitor className="h-6 w-6 text-slate-600" />
                </div>
                <span className="font-medium">システム</span>
                {theme === 'system' && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* フォントサイズ */}
      <Card>
        <CardHeader>
          <CardTitle>フォントサイズ</CardTitle>
          <CardDescription>
            管理画面の文字サイズを調整します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={fontSize}
            onValueChange={(value) => {
              setFontSize(value);
              toast.success('フォントサイズを変更しました');
            }}
            className="grid grid-cols-3 gap-4"
          >
            {fontSizes.map((size) => (
              <div key={size.value}>
                <RadioGroupItem
                  value={size.value}
                  id={`font-${size.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`font-${size.value}`}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all',
                    fontSize === size.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  )}
                >
                  <span className={cn(
                    'font-medium',
                    size.value === 'small' && 'text-sm',
                    size.value === 'medium' && 'text-base',
                    size.value === 'large' && 'text-lg'
                  )}>
                    {size.label}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {size.description}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 表示密度 */}
      <Card>
        <CardHeader>
          <CardTitle>表示密度</CardTitle>
          <CardDescription>
            コンテンツの間隔を調整します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={density}
            onValueChange={(value) => {
              setDensity(value);
              toast.success('表示密度を変更しました');
            }}
            className="grid grid-cols-3 gap-4"
          >
            {densities.map((d) => (
              <div key={d.value}>
                <RadioGroupItem
                  value={d.value}
                  id={`density-${d.value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`density-${d.value}`}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-lg border-2 p-4 cursor-pointer transition-all',
                    density === d.value
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  )}
                >
                  <div className="flex gap-0.5 mb-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          'bg-muted-foreground/30 rounded',
                          d.value === 'compact' && 'w-2 h-3',
                          d.value === 'comfortable' && 'w-3 h-4',
                          d.value === 'spacious' && 'w-4 h-5'
                        )}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{d.label}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {d.description}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* プレビュー */}
      <Card>
        <CardHeader>
          <CardTitle>プレビュー</CardTitle>
          <CardDescription>
            現在の設定でのUI表示例
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center gap-4">
              <Button>プライマリボタン</Button>
              <Button variant="secondary">セカンダリ</Button>
              <Button variant="outline">アウトライン</Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-primary font-medium">リンクテキスト</span>
              <span className="text-muted-foreground">サブテキスト</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="w-2/3 h-full bg-primary rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

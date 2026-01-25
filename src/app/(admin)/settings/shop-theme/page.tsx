'use client';

import { useState, useEffect, useTransition } from 'react';
import { ArrowLeft, Save, Loader2, RotateCcw, Eye, GripVertical, Palette, Type, Layout, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization } from '@/components/providers/organization-provider';
import { getShopTheme, updateShopTheme, resetShopTheme } from '@/lib/actions/settings';
import { toast } from 'sonner';
import { 
  ShopThemeSettings, 
  ShopSection, 
  DEFAULT_SHOP_THEME,
  FontFamily,
  FontSize,
} from '@/types';

// フォントオプション
const fontOptions: { value: FontFamily; label: string; preview: string }[] = [
  { value: 'noto-sans', label: 'Noto Sans JP', preview: 'ゴシック体' },
  { value: 'noto-serif', label: 'Noto Serif JP', preview: '明朝体' },
  { value: 'zen-kaku', label: 'Zen Kaku Gothic', preview: 'ゴシック体' },
  { value: 'zen-maru', label: 'Zen Maru Gothic', preview: '丸ゴシック' },
  { value: 'shippori-mincho', label: 'しっぽり明朝', preview: '明朝体' },
];

// フォントサイズオプション
const fontSizeOptions: { value: FontSize; label: string }[] = [
  { value: 'small', label: '小さめ' },
  { value: 'medium', label: '標準' },
  { value: 'large', label: '大きめ' },
];

// カラープリセット
const colorPresets = [
  { 
    name: 'ナチュラル',
    colors: {
      primary: '#f59e0b',
      secondary: '#ea580c',
      background: '#ffffff',
      surface: '#faf8f5',
      text: '#1e293b',
      textMuted: '#64748b',
      accent: '#f59e0b',
      border: '#e2e8f0',
    }
  },
  {
    name: 'モダン',
    colors: {
      primary: '#3b82f6',
      secondary: '#6366f1',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      textMuted: '#64748b',
      accent: '#3b82f6',
      border: '#e2e8f0',
    }
  },
  {
    name: 'エレガント',
    colors: {
      primary: '#be185d',
      secondary: '#9333ea',
      background: '#ffffff',
      surface: '#fdf4ff',
      text: '#1e1b4b',
      textMuted: '#6b7280',
      accent: '#be185d',
      border: '#e5e7eb',
    }
  },
  {
    name: 'ダーク',
    colors: {
      primary: '#f59e0b',
      secondary: '#f97316',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      accent: '#f59e0b',
      border: '#334155',
    }
  },
];

// カラーピッカーコンポーネント
function ColorPicker({ 
  label, 
  value, 
  onChange, 
  description 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 h-8 text-xs font-mono"
        />
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10"
          />
          <div 
            className="w-10 h-10 rounded-lg border-2 border-border shadow-sm cursor-pointer"
            style={{ backgroundColor: value }}
          />
        </div>
      </div>
    </div>
  );
}

// セクション管理コンポーネント
function SectionManager({
  sections,
  onChange,
}: {
  sections: ShopSection[];
  onChange: (sections: ShopSection[]) => void;
}) {
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    // orderを入れ替え
    [newSections[index].order, newSections[newIndex].order] = 
    [newSections[newIndex].order, newSections[index].order];
    
    // ソートして返す
    onChange(newSections.sort((a, b) => a.order - b.order));
  };

  const toggleSection = (id: string) => {
    onChange(
      sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
    );
  };

  return (
    <div className="space-y-2">
      {sections.sort((a, b) => a.order - b.order).map((section, index) => (
        <div 
          key={section.id}
          className={`flex items-center gap-3 p-3 rounded-lg border ${
            section.enabled ? 'bg-background' : 'bg-muted/50 opacity-60'
          }`}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          
          <div className="flex-1">
            <span className={`text-sm font-medium ${!section.enabled && 'text-muted-foreground'}`}>
              {section.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => moveSection(index, 'up')}
              disabled={index === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => moveSection(index, 'down')}
              disabled={index === sections.length - 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Switch
              checked={section.enabled}
              onCheckedChange={() => toggleSection(section.id)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ShopThemePage() {
  const { organization } = useOrganization();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<ShopThemeSettings>(DEFAULT_SHOP_THEME);

  // テーマ設定を取得
  useEffect(() => {
    async function loadTheme() {
      if (!organization?.id) return;
      
      const { data, error } = await getShopTheme(organization.id);
      
      if (data) {
        setTheme(data);
      } else if (error) {
        toast.error('テーマ設定の読み込みに失敗しました');
      }
      
      setIsLoading(false);
    }
    
    loadTheme();
  }, [organization?.id]);

  // 保存
  const handleSave = () => {
    if (!organization?.id) {
      toast.error('組織が設定されていません');
      return;
    }

    startTransition(async () => {
      const { data, error } = await updateShopTheme(organization.id, theme);
      
      if (data) {
        // ローカルストレージにも保存（ショップ側で即時反映するため）
        localStorage.setItem('shop-theme', JSON.stringify(theme));
        toast.success('テーマ設定を保存しました');
      } else {
        toast.error(error || '保存に失敗しました');
      }
    });
  };

  // リセット
  const handleReset = () => {
    if (!organization?.id) return;

    startTransition(async () => {
      const { data, error } = await resetShopTheme(organization.id);
      
      if (data) {
        setTheme(data);
        // ローカルストレージも更新
        localStorage.setItem('shop-theme', JSON.stringify(data));
        toast.success('デフォルト設定にリセットしました');
      } else {
        toast.error(error || 'リセットに失敗しました');
      }
    });
  };

  // カラー更新
  const updateColor = (key: keyof typeof theme.colors, value: string) => {
    setTheme(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value }
    }));
  };

  // プリセット適用
  const applyPreset = (preset: typeof colorPresets[0]) => {
    setTheme(prev => ({
      ...prev,
      colors: preset.colors
    }));
    toast.success(`「${preset.name}」プリセットを適用しました`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">ショップテーマ</h1>
            <p className="text-muted-foreground">ショップのデザインをカスタマイズ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/shop" target="_blank">
              <Eye className="mr-2 h-4 w-4" />
              プレビュー
            </Link>
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={isPending}>
            <RotateCcw className="mr-2 h-4 w-4" />
            リセット
          </Button>
          <Button className="btn-premium" onClick={handleSave} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存
          </Button>
        </div>
      </div>

      {/* タブ */}
      <Tabs defaultValue="sections" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="sections" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">セクション</span>
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">カラー</span>
          </TabsTrigger>
          <TabsTrigger value="fonts" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline">フォント</span>
          </TabsTrigger>
          <TabsTrigger value="header" className="flex items-center gap-2">
            <Layout className="h-4 w-4" />
            <span className="hidden sm:inline">ヘッダー</span>
          </TabsTrigger>
        </TabsList>

        {/* セクション管理 */}
        <TabsContent value="sections">
          <Card>
            <CardHeader>
              <CardTitle>セクション管理</CardTitle>
              <CardDescription>
                ショップページに表示するセクションの順序と表示/非表示を設定します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SectionManager
                sections={theme.sections}
                onChange={(sections) => setTheme(prev => ({ ...prev, sections }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* カラー設定 */}
        <TabsContent value="colors">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <Card>
              <CardHeader>
                <CardTitle>カラー設定</CardTitle>
                <CardDescription>
                  ショップのカラーパレットをカスタマイズします
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <ColorPicker
                  label="プライマリカラー"
                  description="ボタン、リンクなどのメインカラー"
                  value={theme.colors.primary}
                  onChange={(v) => updateColor('primary', v)}
                />
                <ColorPicker
                  label="セカンダリカラー"
                  description="サブボタン、アイコンなど"
                  value={theme.colors.secondary}
                  onChange={(v) => updateColor('secondary', v)}
                />
                <ColorPicker
                  label="背景色"
                  description="ページ全体の背景色"
                  value={theme.colors.background}
                  onChange={(v) => updateColor('background', v)}
                />
                <ColorPicker
                  label="サーフェス色"
                  description="カード、セクションの背景色"
                  value={theme.colors.surface}
                  onChange={(v) => updateColor('surface', v)}
                />
                <ColorPicker
                  label="テキスト色"
                  description="メインのテキスト色"
                  value={theme.colors.text}
                  onChange={(v) => updateColor('text', v)}
                />
                <ColorPicker
                  label="サブテキスト色"
                  description="説明文、補足テキストの色"
                  value={theme.colors.textMuted}
                  onChange={(v) => updateColor('textMuted', v)}
                />
                <ColorPicker
                  label="アクセントカラー"
                  description="ハイライト、バッジなど"
                  value={theme.colors.accent}
                  onChange={(v) => updateColor('accent', v)}
                />
                <ColorPicker
                  label="ボーダー色"
                  description="枠線、区切り線の色"
                  value={theme.colors.border}
                  onChange={(v) => updateColor('border', v)}
                />
              </CardContent>
            </Card>

            {/* プリセット */}
            <Card>
              <CardHeader>
                <CardTitle>プリセット</CardTitle>
                <CardDescription>
                  ワンクリックでカラーを変更
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className="w-full p-3 rounded-lg border hover:border-primary transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1">
                        {[preset.colors.primary, preset.colors.secondary, preset.colors.accent].map((color, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border-2 border-background"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="font-medium text-sm">{preset.name}</span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* フォント設定 */}
        <TabsContent value="fonts">
          <Card>
            <CardHeader>
              <CardTitle>フォント設定</CardTitle>
              <CardDescription>
                ショップで使用するフォントを選択します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>見出しフォント</Label>
                  <Select
                    value={theme.fonts.heading}
                    onValueChange={(v: FontFamily) => 
                      setTheme(prev => ({ ...prev, fonts: { ...prev.fonts, heading: v } }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <div className="flex items-center gap-2">
                            <span>{font.label}</span>
                            <span className="text-muted-foreground text-xs">({font.preview})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>本文フォント</Label>
                  <Select
                    value={theme.fonts.body}
                    onValueChange={(v: FontFamily) => 
                      setTheme(prev => ({ ...prev, fonts: { ...prev.fonts, body: v } }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          <div className="flex items-center gap-2">
                            <span>{font.label}</span>
                            <span className="text-muted-foreground text-xs">({font.preview})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>フォントサイズ</Label>
                <Select
                  value={theme.fonts.size}
                  onValueChange={(v: FontSize) => 
                    setTheme(prev => ({ ...prev, fonts: { ...prev.fonts, size: v } }))
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontSizeOptions.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* プレビュー */}
              <div className="p-6 rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground mb-2">プレビュー</p>
                <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  見出しテキストのサンプル
                </h3>
                <p className="text-base" style={{ fontFamily: 'var(--font-body)' }}>
                  本文テキストのサンプルです。日本語フォントの表示を確認できます。
                  商いストアは、日常の中にある小さな喜びを大切にするライフスタイルブランドです。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ヘッダー設定 */}
        <TabsContent value="header">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ヘッダー設定</CardTitle>
                <CardDescription>
                  ショップのヘッダー部分をカスタマイズします
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="logoText">ロゴテキスト</Label>
                  <Input
                    id="logoText"
                    value={theme.header.logoText}
                    onChange={(e) => setTheme(prev => ({
                      ...prev,
                      header: { ...prev.header, logoText: e.target.value }
                    }))}
                    placeholder="AKINAI"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>告知バナー</Label>
                      <p className="text-xs text-muted-foreground">
                        ヘッダー上部の告知エリア
                      </p>
                    </div>
                    <Switch
                      checked={theme.header.bannerEnabled}
                      onCheckedChange={(checked) => setTheme(prev => ({
                        ...prev,
                        header: { ...prev.header, bannerEnabled: checked }
                      }))}
                    />
                  </div>

                  {theme.header.bannerEnabled && (
                    <div className="space-y-4 pl-4 border-l-2">
                      <div className="space-y-2">
                        <Label htmlFor="bannerText">バナーテキスト</Label>
                        <Input
                          id="bannerText"
                          value={theme.header.bannerText}
                          onChange={(e) => setTheme(prev => ({
                            ...prev,
                            header: { ...prev.header, bannerText: e.target.value }
                          }))}
                          placeholder="ご注文金額¥5,000以上で送料無料"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>バナー背景色</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={theme.header.bannerBackgroundColor}
                              onChange={(e) => setTheme(prev => ({
                                ...prev,
                                header: { ...prev.header, bannerBackgroundColor: e.target.value }
                              }))}
                              className="flex-1 h-9 text-xs font-mono"
                            />
                            <div className="relative">
                              <input
                                type="color"
                                value={theme.header.bannerBackgroundColor}
                                onChange={(e) => setTheme(prev => ({
                                  ...prev,
                                  header: { ...prev.header, bannerBackgroundColor: e.target.value }
                                }))}
                                className="absolute inset-0 opacity-0 cursor-pointer w-9 h-9"
                              />
                              <div 
                                className="w-9 h-9 rounded border cursor-pointer"
                                style={{ backgroundColor: theme.header.bannerBackgroundColor }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>バナー文字色</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={theme.header.bannerTextColor}
                              onChange={(e) => setTheme(prev => ({
                                ...prev,
                                header: { ...prev.header, bannerTextColor: e.target.value }
                              }))}
                              className="flex-1 h-9 text-xs font-mono"
                            />
                            <div className="relative">
                              <input
                                type="color"
                                value={theme.header.bannerTextColor}
                                onChange={(e) => setTheme(prev => ({
                                  ...prev,
                                  header: { ...prev.header, bannerTextColor: e.target.value }
                                }))}
                                className="absolute inset-0 opacity-0 cursor-pointer w-9 h-9"
                              />
                              <div 
                                className="w-9 h-9 rounded border cursor-pointer"
                                style={{ backgroundColor: theme.header.bannerTextColor }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>フッター設定</CardTitle>
                <CardDescription>
                  ショップのフッター部分をカスタマイズします
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="copyrightText">コピーライト</Label>
                  <Input
                    id="copyrightText"
                    value={theme.footer.copyrightText}
                    onChange={(e) => setTheme(prev => ({
                      ...prev,
                      footer: { ...prev.footer, copyrightText: e.target.value }
                    }))}
                    placeholder="© AKINAI All rights reserved."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>ニュースレター登録</Label>
                    <p className="text-xs text-muted-foreground">
                      メール購読フォームを表示
                    </p>
                  </div>
                  <Switch
                    checked={theme.footer.showNewsletter}
                    onCheckedChange={(checked) => setTheme(prev => ({
                      ...prev,
                      footer: { ...prev.footer, showNewsletter: checked }
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SNSリンク</Label>
                    <p className="text-xs text-muted-foreground">
                      ソーシャルメディアリンクを表示
                    </p>
                  </div>
                  <Switch
                    checked={theme.footer.showSocialLinks}
                    onCheckedChange={(checked) => setTheme(prev => ({
                      ...prev,
                      footer: { ...prev.footer, showSocialLinks: checked }
                    }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


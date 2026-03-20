'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, RefreshCw, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ProductVariant } from './simple-variant-input';

interface AxisItem {
  id: string;
  value: string;
  imageUrl?: string;
}

interface Axis {
  id: string;
  name: string;
  items: AxisItem[];
}

export type { Axis, AxisItem };

interface MatrixVariantInputProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  onSelectedVariantChange?: (variant: ProductVariant | null) => void;
  onAxesChange?: (axes: Axis[]) => void;
  disabled?: boolean;
}

function generateSku(parts: string[]): string {
  return parts
    .map((p) => p.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean)
    .join('-');
}

const AXIS_PRESETS = ['色', 'サイズ', '素材', '外枠カラー', 'マットカラー', 'ベースカラー'];

export function MatrixVariantInput({ variants, onChange, onSelectedVariantChange, onAxesChange, disabled }: MatrixVariantInputProps) {
  const [axes, setAxes] = useState<Axis[]>([]);
  const [newAxisName, setNewAxisName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [newItemValues, setNewItemValues] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({});

  // コールバックをrefで保持（依存配列ループを避けるため）
  const onSelectedVariantChangeRef = useRef(onSelectedVariantChange);
  useEffect(() => { onSelectedVariantChangeRef.current = onSelectedVariantChange; });
  const onAxesChangeRef = useRef(onAxesChange);
  useEffect(() => { onAxesChangeRef.current = onAxesChange; });

  // 軸が変わったらプレビューに通知
  useEffect(() => { onAxesChangeRef.current?.(axes); }, [axes]);

  // スウォッチ選択 or バリエーション一覧が変わったらプレビューを更新
  useEffect(() => {
    if (!onSelectedVariantChangeRef.current) return;
    const validAxes = axes.filter((a) => a.items.length > 0);
    if (validAxes.length === 0 || variants.length === 0) {
      onSelectedVariantChangeRef.current(null);
      return;
    }
    const name = validAxes
      .map((a) => selectedItems[a.id] ?? a.items[0]?.value)
      .filter(Boolean)
      .join(' / ');
    const matched = variants.find((v) => v.name === name) ?? null;
    onSelectedVariantChangeRef.current(matched);
  }, [selectedItems, variants, axes]);

  const addAxis = (name?: string) => {
    const axisName = (name ?? newAxisName).trim();
    if (!axisName) return;
    if (axes.some((a) => a.name === axisName)) return;
    setAxes([...axes, { id: `axis-${Date.now()}`, name: axisName, items: [] }]);
    setNewAxisName('');
    setShowPresets(false);
  };

  const removeAxis = (axisId: string) => setAxes(axes.filter((a) => a.id !== axisId));

  const addItem = (axisId: string) => {
    const value = newItemValues[axisId]?.trim();
    if (!value) return;
    const newItem = { id: `i-${Date.now()}`, value };
    setAxes(axes.map((a) =>
      a.id === axisId ? { ...a, items: [...a.items, newItem] } : a
    ));
    // 最初の選択肢を自動選択
    setSelectedItems((prev) => ({ ...prev, [axisId]: prev[axisId] ?? value }));
    setNewItemValues({ ...newItemValues, [axisId]: '' });
  };

  const removeItem = (axisId: string, itemId: string) => {
    setAxes(axes.map((a) =>
      a.id === axisId ? { ...a, items: a.items.filter((i) => i.id !== itemId) } : a
    ));
  };

  const updateItemImage = (axisId: string, itemId: string, imageUrl: string) =>
    setAxes(axes.map((a) =>
      a.id === axisId
        ? { ...a, items: a.items.map((i) => i.id === itemId ? { ...i, imageUrl } : i) }
        : a
    ));

  const generateCombinations = (axesList: Axis[]): string[][] => {
    if (axesList.length === 0) return [];
    const [first, ...rest] = axesList;
    if (first.items.length === 0) return generateCombinations(rest);
    const restCombinations = generateCombinations(rest);
    if (restCombinations.length === 0) return first.items.map((item) => [item.value]);
    return first.items.flatMap((item) =>
      restCombinations.map((combo) => [item.value, ...combo])
    );
  };

  const handleGenerate = () => {
    const validAxes = axes.filter((a) => a.items.length > 0);
    if (validAxes.length === 0) return;
    const combinations = generateCombinations(validAxes);
    const newVariants: ProductVariant[] = combinations.map((combo) => {
      const name = combo.join(' / ');
      const existing = variants.find((v) => v.name === name);
      return existing ?? {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        sku: generateSku(combo),
        price: variants[0]?.price ?? 0,
        stock: 0,
      };
    });
    onChange(newVariants);
  };

  const updateVariant = (id: string, field: 'price' | 'stock' | 'sku' | 'imageUrl', value: string | number) =>
    onChange(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)));

  const validAxes = axes.filter((a) => a.items.length > 0);
  const totalCombinations = generateCombinations(validAxes).length;
  const unusedPresets = AXIS_PRESETS.filter((p) => !axes.some((a) => a.name === p));

  return (
    <div className="space-y-0">

      {/* 各軸（WooCommerce風） */}
      {axes.map((axis, axisIndex) => {
        const selectedValue = selectedItems[axis.id] ?? axis.items[0]?.value;
        return (
          <div key={axis.id} className={cn('py-4', axisIndex > 0 && 'border-t')}>
            {/* 軸ヘッダー */}
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-sm font-bold">
                <span className="text-red-500 mr-0.5">*</span>
                {axis.name}
                {selectedValue && (
                  <span className="font-normal text-muted-foreground">：{selectedValue}</span>
                )}
              </p>
              <button
                type="button"
                onClick={() => removeAxis(axis.id)}
                disabled={disabled}
                className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* スウォッチ一覧 */}
            <div className="flex flex-wrap gap-2">
              {axis.items.map((item) => {
                const isSelected = selectedItems[axis.id] === item.value || (!selectedItems[axis.id] && axis.items[0]?.id === item.id);
                return (
                  <div key={item.id} className="group relative flex flex-col items-center gap-1">
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={disabled}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          updateItemImage(axis.id, item.id, URL.createObjectURL(file));
                        }}
                      />
                      <div
                        onClick={(e) => {
                          // ファイル選択ではなく選択状態の切り替え用（labelのクリックと干渉しないよう）
                          setSelectedItems((prev) => ({ ...prev, [axis.id]: item.value }));
                        }}
                        className={cn(
                          'h-16 w-16 rounded-lg border-2 flex items-center justify-center overflow-hidden transition-all cursor-pointer',
                          isSelected
                            ? 'border-slate-800 shadow-sm'
                            : 'border-slate-200 hover:border-slate-400',
                          !item.imageUrl && 'bg-slate-50'
                        )}
                      >
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.value} className="h-full w-full object-cover" />
                        ) : (
                          <Upload className="h-4 w-4 text-slate-300" />
                        )}
                      </div>
                    </label>
                    <span className="text-xs text-center max-w-[64px] truncate leading-tight">{item.value}</span>
                    {/* ホバーで削除 */}
                    <button
                      type="button"
                      onClick={() => !disabled && removeItem(axis.id, item.id)}
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                );
              })}

              {/* 選択肢追加タイル */}
              <div className="flex flex-col items-center gap-1">
                <div className="h-16 w-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1 w-full px-1">
                    <Input
                      placeholder="追加"
                      value={newItemValues[axis.id] ?? ''}
                      onChange={(e) => setNewItemValues({ ...newItemValues, [axis.id]: e.target.value })}
                      className="h-6 text-[10px] text-center border-0 shadow-none p-0 focus-visible:ring-0 bg-transparent placeholder:text-slate-300"
                      disabled={disabled}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(axis.id); } }}
                    />
                    <button
                      type="button"
                      onClick={() => addItem(axis.id)}
                      disabled={disabled || !newItemValues[axis.id]?.trim()}
                      className="text-slate-400 hover:text-sky-500 disabled:opacity-30 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400">新しく追加</span>
              </div>
            </div>

            {/* クリア */}
            {selectedItems[axis.id] && (
              <button
                type="button"
                onClick={() => setSelectedItems((prev) => { const n = { ...prev }; delete n[axis.id]; return n; })}
                className="mt-2 text-xs text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-2 transition-colors"
              >
                クリア
              </button>
            )}
          </div>
        );
      })}

      {/* 軸を追加 */}
      <div className={cn('pt-4', axes.length > 0 && 'border-t')}>
        {/* プリセット候補 */}
        {unusedPresets.length > 0 && showPresets && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {unusedPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => addAxis(preset)}
                disabled={disabled}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-sky-200 bg-white text-xs text-sky-600 font-medium hover:bg-sky-50 hover:border-sky-400 transition-colors"
              >
                <Plus className="h-3 w-3" />
                {preset}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="種類名を入力（例: フレームカラー）"
            value={newAxisName}
            onChange={(e) => setNewAxisName(e.target.value)}
            onFocus={() => setShowPresets(true)}
            className="h-8 bg-white text-sm"
            disabled={disabled}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAxis(); } }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => addAxis()}
            disabled={disabled || !newAxisName.trim()}
            className="h-8 bg-white shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            種類を追加
          </Button>
        </div>
      </div>

      {/* 生成ボタン */}
      {axes.length > 0 && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            {totalCombinations > 0 ? (
              <p className="text-sm text-muted-foreground">
                {validAxes.map((a) => `${a.name} ${a.items.length}種`).join(' × ')} ＝ <span className="font-semibold text-foreground">{totalCombinations} 通り</span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">各種類に選択肢を追加すると生成できます</p>
            )}
            <Button
              onClick={handleGenerate}
              disabled={disabled || totalCombinations === 0}
              className="btn-premium"
              size="sm"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              組み合わせを生成
            </Button>
          </div>
        </div>
      )}

      {/* バリエーション一覧 */}
      {variants.length > 0 && (
        <div className="border-t pt-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">生成済みバリエーション</p>
          {variants.map((variant) => (
            <div key={variant.id} className="rounded-xl border bg-white overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-2.5">
                <label className="cursor-pointer group shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={disabled}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      updateVariant(variant.id, 'imageUrl', URL.createObjectURL(file));
                    }}
                  />
                  <div className={cn(
                    'h-10 w-10 rounded-lg border flex items-center justify-center overflow-hidden transition-colors',
                    'group-hover:border-sky-400',
                    variant.imageUrl ? 'border-transparent' : 'border-slate-200'
                  )}>
                    {variant.imageUrl
                      ? <img src={variant.imageUrl} alt={variant.name} className="h-full w-full object-cover" />
                      : <Upload className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition-colors" />
                    }
                  </div>
                </label>
                <span className="text-sm font-medium flex-1 min-w-0 truncate">{variant.name}</span>
                {variant.imageUrl && (
                  <button
                    type="button"
                    onClick={() => updateVariant(variant.id, 'imageUrl', '')}
                    className="text-xs text-slate-400 hover:text-destructive transition-colors shrink-0"
                  >
                    画像削除
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 border-t divide-x text-sm">
                <div className="px-3 py-2">
                  <p className="text-[10px] text-muted-foreground mb-1">SKU</p>
                  <Input
                    value={variant.sku}
                    onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                    className="h-6 text-xs font-mono border-0 p-0 shadow-none focus-visible:ring-0 bg-transparent"
                    placeholder="SKU-000"
                    disabled={disabled}
                  />
                </div>
                <div className="px-3 py-2">
                  <p className="text-[10px] text-muted-foreground mb-1">価格（税込）</p>
                  <div className="flex items-center gap-0.5">
                    <span className="text-xs text-muted-foreground">¥</span>
                    <Input
                      type="number"
                      value={variant.price || ''}
                      onChange={(e) => updateVariant(variant.id, 'price', parseInt(e.target.value) || 0)}
                      className="h-6 text-xs border-0 p-0 shadow-none focus-visible:ring-0 bg-transparent"
                      placeholder="0"
                      disabled={disabled}
                    />
                  </div>
                </div>
                <div className="px-3 py-2">
                  <p className="text-[10px] text-muted-foreground mb-1">在庫数</p>
                  <Input
                    type="number"
                    value={variant.stock || ''}
                    onChange={(e) => updateVariant(variant.id, 'stock', parseInt(e.target.value) || 0)}
                    className="h-6 text-xs border-0 p-0 shadow-none focus-visible:ring-0 bg-transparent"
                    placeholder="0"
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

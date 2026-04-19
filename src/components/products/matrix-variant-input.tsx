'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, RefreshCw, Upload, X, Search, Wand2, Palette, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ProductVariant } from './simple-variant-input';

interface AxisItem {
  id: string;
  value: string;
  imageUrl?: string;
  color?: string; // HEX: #ffffff 等
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
  /** 保存済みスウォッチ設定（色など）を初期値として渡す */
  initialSwatchConfig?: Axis[];
  /** スウォッチ設定が変わったときに呼ばれる（保存用） */
  onSwatchConfigChange?: (config: Axis[]) => void;
  disabled?: boolean;
  /** ヒーロープレビュー（選択に応じた大きな画像表示）を出すか */
  showHeroPreview?: boolean;
}

function generateSku(parts: string[]): string {
  return parts
    .map((p) => p.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean)
    .join('-');
}

const AXIS_PRESETS = ['色', 'サイズ', '素材', '外枠カラー', 'マットカラー', 'ベースカラー'];

export function MatrixVariantInput({ variants, onChange, onSelectedVariantChange, onAxesChange, initialSwatchConfig, onSwatchConfigChange, disabled, showHeroPreview = false }: MatrixVariantInputProps) {
  const [axes, setAxes] = useState<Axis[]>([]);
  const [newAxisName, setNewAxisName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [newItemValues, setNewItemValues] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({});
  const hydratedRef = useRef(false);

  // 既存variantsからaxesを自動復元（初回のみ）
  // variant名パターン: "マット:オフホワイト / ベース:オリーブ / フレーム:ソイル"
  //                  または "オフホワイト / オリーブ / ソイル"
  useEffect(() => {
    if (hydratedRef.current) return;
    if (variants.length === 0) return;
    if (axes.length > 0) { hydratedRef.current = true; return; }

    const axisOrder: string[] = [];
    const axisItemsMap = new Map<string, Map<string, AxisItem>>();
    let valid = true;

    for (const v of variants) {
      if (!v.name) continue;
      const parts = v.name.split(' / ').map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) { valid = false; break; }

      parts.forEach((part, idx) => {
        const colonIdx = part.indexOf(':');
        let axisName: string;
        let value: string;
        if (colonIdx > 0) {
          axisName = part.slice(0, colonIdx).trim();
          value = part.slice(colonIdx + 1).trim();
        } else {
          axisName = `項目${idx + 1}`;
          value = part;
        }
        if (!axisOrder.includes(axisName)) {
          axisOrder.push(axisName);
          axisItemsMap.set(axisName, new Map());
        }
        const itemMap = axisItemsMap.get(axisName)!;
        if (!itemMap.has(value)) {
          itemMap.set(value, {
            id: `i-${axisName}-${value}-${itemMap.size}`,
            value,
            imageUrl: v.imageUrl,
          });
        }
      });
    }

    if (!valid || axisOrder.length === 0) { hydratedRef.current = true; return; }

    const restored: Axis[] = axisOrder.map((name, idx) => {
      // initialSwatchConfig から同名の軸を探して色を引き継ぐ
      const savedAxis = initialSwatchConfig?.find((a) => a.name === name);
      return {
        id: `axis-restored-${idx}`,
        name,
        items: Array.from(axisItemsMap.get(name)!.values()).map((item) => {
          const savedItem = savedAxis?.items.find((i) => i.value === item.value);
          return { ...item, color: savedItem?.color ?? item.color };
        }),
      };
    });
    setAxes(restored);
    hydratedRef.current = true;
  }, [variants, axes.length]);

  // コールバックをrefで保持（依存配列ループを避けるため）
  const onSelectedVariantChangeRef = useRef(onSelectedVariantChange);
  useEffect(() => { onSelectedVariantChangeRef.current = onSelectedVariantChange; });
  const onAxesChangeRef = useRef(onAxesChange);
  useEffect(() => { onAxesChangeRef.current = onAxesChange; });
  const onSwatchConfigChangeRef = useRef(onSwatchConfigChange);
  useEffect(() => { onSwatchConfigChangeRef.current = onSwatchConfigChange; });

  // 軸が変わったらプレビューに通知 + swatch config を保存
  useEffect(() => {
    onAxesChangeRef.current?.(axes);
    onSwatchConfigChangeRef.current?.(axes);
  }, [axes]);

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

  const updateItemColor = (axisId: string, itemId: string, color: string) =>
    setAxes(axes.map((a) =>
      a.id === axisId
        ? { ...a, items: a.items.map((i) => i.id === itemId ? { ...i, color } : i) }
        : a
    ));

  const updateItemValue = (axisId: string, itemId: string, value: string) =>
    setAxes(axes.map((a) =>
      a.id === axisId
        ? { ...a, items: a.items.map((i) => i.id === itemId ? { ...i, value } : i) }
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

  // --- フィルタ・検索・ページング・一括編集 ---
  const [search, setSearch] = useState('');
  const [axisFilters, setAxisFilters] = useState<Record<string, string>>({});
  const [pageSize, setPageSize] = useState(30);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPrice, setBulkPrice] = useState<string>('');
  const [bulkStock, setBulkStock] = useState<string>('');
  const [showBulkPanel, setShowBulkPanel] = useState(false);

  const filteredVariants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return variants.filter((v) => {
      if (q && !`${v.name} ${v.sku}`.toLowerCase().includes(q)) return false;
      for (const [, val] of Object.entries(axisFilters)) {
        if (val && !v.name.includes(val)) return false;
      }
      return true;
    });
  }, [variants, search, axisFilters]);

  const displayedVariants = filteredVariants.slice(0, pageSize);
  const hasActiveFilter = search.length > 0 || Object.values(axisFilters).some(Boolean);
  const activeSelection = Array.from(selectedIds).filter((id) =>
    filteredVariants.some((v) => v.id === id)
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (activeSelection.length === filteredVariants.length && filteredVariants.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVariants.map((v) => v.id)));
    }
  };

  const targetIds = selectedIds.size > 0
    ? filteredVariants.filter((v) => selectedIds.has(v.id)).map((v) => v.id)
    : filteredVariants.map((v) => v.id);

  const applyBulk = (field: 'price' | 'stock', value: number) => {
    if (targetIds.length === 0) return;
    onChange(variants.map((v) => (targetIds.includes(v.id) ? { ...v, [field]: value } : v)));
  };

  const applyBulkPrice = () => {
    const n = parseInt(bulkPrice);
    if (Number.isNaN(n)) return;
    applyBulk('price', n);
    setBulkPrice('');
  };

  const applyBulkStock = () => {
    const n = parseInt(bulkStock);
    if (Number.isNaN(n)) return;
    applyBulk('stock', n);
    setBulkStock('');
  };

  const clearFilters = () => {
    setSearch('');
    setAxisFilters({});
  };

  return (
    <div className="space-y-0">

      {/* ヒーロープレビュー（スウォッチモード時） */}
      {showHeroPreview && (() => {
        const selectedCombo = validAxes
          .map((a) => selectedItems[a.id] ?? a.items[0]?.value)
          .filter(Boolean);
        const matchedVariant = variants.find((v) => v.name === selectedCombo.join(' / '));
        const previewImage = matchedVariant?.imageUrl;

        const handleHeroImageChange = (file: File) => {
          if (!matchedVariant) return;
          const url = URL.createObjectURL(file);
          onChange(variants.map((v) => v.id === matchedVariant.id ? { ...v, imageUrl: url } : v));
        };

        return (
          <div className="mb-5 rounded-xl overflow-hidden border bg-background">
            {/* 画像エリア */}
            <div className="aspect-[16/9] flex items-center justify-center relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 group/hero">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="プレビュー"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 opacity-40" />
                  <p className="text-xs text-center px-4">
                    {selectedCombo.length > 0
                      ? '右下の「画像を設定」ボタンからこの組み合わせの画像をアップロードできます'
                      : 'スウォッチを選択してプレビューを確認'}
                  </p>
                </div>
              )}

              {/* 選択中スウォッチのミニ表示（左下） */}
              {validAxes.length > 0 && (
                <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 max-w-[55%]">
                  {validAxes.map((a) => {
                    const selVal = selectedItems[a.id] ?? a.items[0]?.value;
                    const item = a.items.find((i) => i.value === selVal);
                    if (!item) return null;
                    return (
                      <div
                        key={a.id}
                        className="h-7 w-7 rounded-md border-2 border-white shadow-md overflow-hidden bg-slate-200"
                        style={item.color ? { backgroundColor: item.color } : undefined}
                        title={`${a.name}: ${item.value}`}
                      />
                    );
                  })}
                </div>
              )}

              {/* 画像変更ボタン（右下に常時表示） */}
              {matchedVariant && (
                <label
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/60 dark:border-slate-600 shadow-md text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-white dark:hover:bg-slate-700 transition-colors"
                  title="この組み合わせの画像を変更"
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={disabled}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleHeroImageChange(file);
                    }}
                  />
                  <Upload className="h-3.5 w-3.5 shrink-0" />
                  {previewImage ? '画像を変更' : '画像を設定'}
                </label>
              )}

              {/* バリエーション未マッチ時のヒント */}
              {!matchedVariant && selectedCombo.length === validAxes.length && selectedCombo.length > 0 && (
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground/60 bg-white/70 dark:bg-slate-800/70 rounded-md px-2 py-1">
                  この組み合わせのバリエーションが見つかりません
                </div>
              )}
            </div>

            {/* フッター：選択中の組み合わせと価格 */}
            {selectedCombo.length > 0 && (
              <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-xs font-medium truncate">
                    <span className="text-muted-foreground">選択中：</span>
                    {selectedCombo.join(' / ')}
                  </p>
                  {!matchedVariant && (
                    <p className="text-[11px] text-amber-500 dark:text-amber-400">
                      ※ 対応するバリエーションが存在しません（バリエーション一覧を確認してください）
                    </p>
                  )}
                </div>
                {matchedVariant && (
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400 shrink-0">
                    ¥{matchedVariant.price.toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}

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

            {/* スウォッチ一覧（横並びタイル） */}
            <div className="flex flex-wrap gap-2.5">
              {axis.items.map((item) => {
                const isSelected = selectedItems[axis.id] === item.value || (!selectedItems[axis.id] && axis.items[0]?.id === item.id);
                const hasColor = Boolean(item.color);
                return (
                  <div key={item.id} className="group flex flex-col items-center gap-1 relative">

                    {/* カラー正方形 */}
                    <div
                      className={cn(
                        'relative h-14 w-14 rounded-lg border-2 overflow-hidden transition-all cursor-pointer',
                        isSelected
                          ? 'border-slate-800 dark:border-white shadow-md scale-105'
                          : 'border-slate-200 dark:border-white/20 hover:border-slate-400',
                        !hasColor && 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800'
                      )}
                      style={hasColor ? { backgroundColor: item.color } : undefined}
                      onClick={() => setSelectedItems((prev) => ({ ...prev, [axis.id]: item.value }))}
                      title="クリックしてプレビューに反映"
                    >
                      {/* 選択チェック */}
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <span className="h-6 w-6 rounded-full bg-white/90 text-slate-800 text-xs flex items-center justify-center font-bold shadow">✓</span>
                        </span>
                      )}

                      {/* 色変更ボタン（ホバーで表示） */}
                      <label
                        className="absolute bottom-0.5 right-0.5 h-5 w-5 rounded-md bg-white/80 dark:bg-black/60 backdrop-blur-sm border border-white/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                        title="色を変更"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="color"
                          value={item.color ?? '#aaaaaa'}
                          onChange={(e) => updateItemColor(axis.id, item.id, e.target.value)}
                          disabled={disabled}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Palette className="h-2.5 w-2.5 text-slate-600 dark:text-slate-300" />
                      </label>
                    </div>

                    {/* 名前入力（下段） */}
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => updateItemValue(axis.id, item.id, e.target.value)}
                      disabled={disabled}
                      className="w-14 text-[11px] text-center bg-transparent border-0 border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-sky-400 outline-none py-0.5 transition-colors leading-tight"
                      title="名前を編集"
                    />

                    {/* 削除ボタン（ホバーで右上に出現） */}
                    <button
                      type="button"
                      onClick={() => !disabled && removeItem(axis.id, item.id)}
                      disabled={disabled}
                      title="削除"
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                );
              })}

              {/* 新しい選択肢を追加 */}
              <div className="flex flex-col items-center gap-1">
                <div className="relative h-14 w-14 rounded-lg border-2 border-dashed border-slate-300 dark:border-white/20 flex flex-col items-center justify-center gap-0.5 bg-slate-50/50 dark:bg-slate-800/30">
                  <Plus className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="名前を入力"
                  value={newItemValues[axis.id] ?? ''}
                  onChange={(e) => setNewItemValues({ ...newItemValues, [axis.id]: e.target.value })}
                  disabled={disabled}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(axis.id); } }}
                  className="w-14 text-[11px] text-center bg-transparent border-0 border-b border-slate-200 dark:border-slate-600 focus:border-sky-400 outline-none py-0.5 placeholder:text-slate-400 transition-colors"
                />
              </div>
            </div>

            {/* 色未設定の注意書き（1つでも未設定があれば表示） */}
            {axis.items.some((i) => !i.color) && (
              <p className="mt-2 text-[11px] text-muted-foreground/60">
                スウォッチ右下の <Palette className="inline h-2.5 w-2.5 mx-0.5" /> をクリックして色を設定できます
              </p>
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
        <div className="border-t pt-4 space-y-3">
          {/* ヘッダー */}
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              生成済みバリエーション
              <span className="ml-1.5 normal-case tracking-normal">
                （{hasActiveFilter ? `${filteredVariants.length} / ` : ''}{variants.length}件）
              </span>
            </p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="名前・SKUで検索"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 w-48 text-xs"
                />
              </div>
              <Button
                variant={showBulkPanel ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowBulkPanel((v) => !v)}
                className="h-8"
              >
                <Wand2 className="h-3.5 w-3.5 mr-1" />
                一括編集
              </Button>
            </div>
          </div>

          {/* 軸フィルタ */}
          {validAxes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {validAxes.map((axis) => (
                <select
                  key={axis.id}
                  value={axisFilters[axis.id] ?? ''}
                  onChange={(e) => setAxisFilters({ ...axisFilters, [axis.id]: e.target.value })}
                  className="text-xs h-7 rounded-md border border-input bg-background px-2 outline-none focus:ring-2 focus:ring-ring"
                  disabled={disabled}
                >
                  <option value="">{axis.name}：すべて</option>
                  {axis.items.map((item) => (
                    <option key={item.id} value={item.value}>{item.value}</option>
                  ))}
                </select>
              ))}
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted/50 transition-colors"
                >
                  × フィルタクリア
                </button>
              )}
            </div>
          )}

          {/* 一括編集パネル */}
          {showBulkPanel && (
            <div className="p-3 rounded-xl border bg-muted/30 space-y-2">
              <p className="text-xs font-medium">
                {selectedIds.size > 0 ? (
                  <>選択中の <span className="font-bold text-foreground">{activeSelection.length}件</span> に適用</>
                ) : (
                  <>表示中の <span className="font-bold text-foreground">{filteredVariants.length}件</span> に適用（未選択時）</>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">価格</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    className="h-7 w-24 text-xs"
                    disabled={disabled}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyBulkPrice(); } }}
                  />
                  <Button size="sm" variant="outline" onClick={applyBulkPrice} disabled={disabled || !bulkPrice} className="h-7">
                    設定
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">在庫</span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                    className="h-7 w-24 text-xs"
                    disabled={disabled}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyBulkStock(); } }}
                  />
                  <Button size="sm" variant="outline" onClick={applyBulkStock} disabled={disabled || !bulkStock} className="h-7">
                    設定
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* テーブル */}
          <div className="rounded-xl border overflow-hidden bg-background">
            {/* ヘッダー行 */}
            <div className="grid grid-cols-[28px_36px_minmax(0,1fr)_minmax(100px,140px)_minmax(80px,110px)_minmax(60px,80px)_28px] gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/30">
              <input
                type="checkbox"
                checked={activeSelection.length === filteredVariants.length && filteredVariants.length > 0}
                onChange={toggleSelectAll}
                disabled={disabled || filteredVariants.length === 0}
                className="h-3.5 w-3.5 justify-self-center cursor-pointer"
                title="すべて選択"
              />
              <span className="text-center">画像</span>
              <span>バリエーション</span>
              <span>SKU</span>
              <span>価格(税込)</span>
              <span>在庫</span>
              <span></span>
            </div>

            {/* 行 */}
            {displayedVariants.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                該当するバリエーションがありません
              </div>
            ) : (
              displayedVariants.map((variant) => {
                const isChecked = selectedIds.has(variant.id);
                return (
                  <div
                    key={variant.id}
                    className={cn(
                      'grid grid-cols-[28px_36px_minmax(0,1fr)_minmax(100px,140px)_minmax(80px,110px)_minmax(60px,80px)_28px] gap-2 px-3 py-1.5 items-center border-b last:border-b-0 hover:bg-muted/20 transition-colors',
                      isChecked && 'bg-sky-50 dark:bg-sky-950/20'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(variant.id)}
                      disabled={disabled}
                      className="h-3.5 w-3.5 justify-self-center cursor-pointer"
                    />
                    <label className="cursor-pointer group justify-self-center">
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
                        'h-8 w-8 rounded-md border flex items-center justify-center overflow-hidden transition-colors',
                        'group-hover:border-sky-400',
                        variant.imageUrl ? 'border-transparent' : 'border-slate-200 dark:border-slate-700'
                      )}>
                        {variant.imageUrl
                          ? <img src={variant.imageUrl} alt={variant.name} className="h-full w-full object-cover" />
                          : <Upload className="h-3 w-3 text-slate-300 group-hover:text-sky-400 transition-colors" />
                        }
                      </div>
                    </label>
                    <span className="text-xs font-medium min-w-0 truncate" title={variant.name}>
                      {variant.name}
                    </span>
                    <Input
                      value={variant.sku}
                      onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                      className="h-7 text-xs font-mono"
                      placeholder="SKU-000"
                      disabled={disabled}
                    />
                    <Input
                      type="number"
                      value={variant.price || ''}
                      onChange={(e) => updateVariant(variant.id, 'price', parseInt(e.target.value) || 0)}
                      className="h-7 text-xs"
                      placeholder="0"
                      disabled={disabled}
                    />
                    <Input
                      type="number"
                      value={variant.stock || ''}
                      onChange={(e) => updateVariant(variant.id, 'stock', parseInt(e.target.value) || 0)}
                      className="h-7 text-xs"
                      placeholder="0"
                      disabled={disabled}
                    />
                    <button
                      type="button"
                      onClick={() => onChange(variants.filter((v) => v.id !== variant.id))}
                      disabled={disabled}
                      className="text-muted-foreground/60 hover:text-destructive transition-colors justify-self-center"
                      title="削除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* ページネーション */}
          {filteredVariants.length > pageSize && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageSize((p) => p + 30)}
              className="w-full h-8 text-xs"
            >
              もっと見る（残り {filteredVariants.length - pageSize} 件 / 計 {filteredVariants.length} 件）
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

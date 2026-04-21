'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, RefreshCw, Upload, X, Search, Wand2, Palette, Image as ImageIcon, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
}

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
  /** 商品ギャラリー画像（組み合わせプレビューに紐付け可能） */
  productImages?: ProductImage[];
  /** 商品ID（スウォッチ画像アップロード用） */
  productId?: string;
}

// ────────────────────────────────────────────────────────────
// ドラッグ可能なスウォッチタイル
// ────────────────────────────────────────────────────────────
interface SortableSwatchItemProps {
  item: AxisItem;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onColorChange: (color: string) => void;
  onImageChange: (imageUrl: string) => void;
  onValueChange: (value: string) => void;
  onRemove: () => void;
  productId?: string;
  /** この軸で画像アップロードを許可するか（軸内に1つでも画像があればtrue） */
  allowImages?: boolean;
}

function SortableSwatchItem({
  item,
  isSelected,
  disabled,
  onSelect,
  onColorChange,
  onImageChange,
  onValueChange,
  onRemove,
  productId,
  allowImages = false,
}: SortableSwatchItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const hasColor = Boolean(item.color);
  const hasImage = Boolean(item.imageUrl);
  const isOmakase = item.value === 'おまかせ';
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file: File) => {
    if (!productId) {
      // productId なければ blob URL を一時使用
      onImageChange(URL.createObjectURL(file));
      return;
    }
    setUploading(true);
    try {
      const { uploadProductImage } = await import('@/lib/actions/storage');
      const fd = new FormData();
      fd.append('file', file);
      const result = await uploadProductImage(productId, fd);
      if (result.data?.url) onImageChange(result.data.url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col items-center gap-1 relative group"
    >
      {/* ドラッグハンドル（タイル上部） */}
      <div
        {...attributes}
        {...listeners}
        className="absolute -top-2 left-1/2 -translate-x-1/2 h-4 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 transition-opacity touch-none"
        title="ドラッグして並び替え"
      >
        <GripVertical className="h-3 w-3 text-slate-400 rotate-90" />
      </div>

      {/* カラー正方形 */}
      <div
        className={cn(
          'relative h-14 w-14 rounded-lg border-2 overflow-hidden transition-all cursor-pointer',
          isSelected
            ? 'border-slate-800 dark:border-white shadow-md scale-105'
            : 'border-slate-200 dark:border-white/20 hover:border-slate-400',
          !hasColor && !hasImage && !isOmakase && 'bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800'
        )}
        style={
          isOmakase
            ? { background: 'linear-gradient(135deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #c77dff, #ff6b6b)' }
            : (!hasImage && hasColor ? { backgroundColor: item.color } : undefined)
        }
        onClick={onSelect}
        title="クリックしてプレビューに反映"
      >
        {/* 画像表示 */}
        {hasImage && (
          <img src={item.imageUrl} alt={item.value} className="absolute inset-0 w-full h-full object-cover" />
        )}

        {/* アップロード中インジケーター */}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          </span>
        )}

        {/* 選択チェック */}
        {isSelected && !uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/10">
            <span className="h-6 w-6 rounded-full bg-white/90 text-slate-800 text-xs flex items-center justify-center font-bold shadow">✓</span>
          </span>
        )}

        {/* 色変更ボタン（ホバーで表示・右下・元通り） */}
        <label
          className="absolute bottom-0.5 right-0.5 h-5 w-5 rounded-md bg-white/80 dark:bg-black/60 backdrop-blur-sm border border-white/60 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
          title="色を変更"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="color"
            value={item.color ?? '#aaaaaa'}
            onChange={(e) => onColorChange(e.target.value)}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Palette className="h-2.5 w-2.5 text-slate-600 dark:text-slate-300" />
        </label>

        {/* 画像設定済みバッジ（画像がある時だけ左上に表示） */}
        {hasImage && (
          <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded bg-white/80 dark:bg-black/60 flex items-center justify-center">
            <ImageIcon className="h-2.5 w-2.5 text-sky-500" />
          </span>
        )}
      </div>

      {/* 名前入力（下段） */}
      <input
        type="text"
        value={item.value}
        onChange={(e) => onValueChange(e.target.value)}
        disabled={disabled}
        className="w-14 text-[11px] text-center bg-transparent border-0 border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-sky-400 outline-none py-0.5 transition-colors leading-tight"
        title="名前を編集"
      />

      {/* 画像アップロード（名前の下・ホバーで表示・allowImagesの軸のみ） */}
      {allowImages && (
        <label
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title={hasImage ? '画像を変更' : '画像を設定'}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
              e.target.value = '';
            }}
          />
          <span className="text-[10px] text-muted-foreground hover:text-sky-500 transition-colors flex items-center gap-0.5">
            <ImageIcon className="h-2.5 w-2.5" />
            {hasImage ? '変更' : '画像'}
          </span>
        </label>
      )}

      {/* 削除ボタン（ホバーで右上に出現） */}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        title="削除"
        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 shadow-sm flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-300 transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

function generateSku(parts: string[]): string {
  return parts
    .map((p) => p.slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, ''))
    .filter(Boolean)
    .join('-');
}

const AXIS_PRESETS = ['色', 'サイズ', '素材', '外枠カラー', 'マットカラー', 'ベースカラー'] as const;

export function MatrixVariantInput({ variants, onChange, onSelectedVariantChange, onAxesChange, initialSwatchConfig, onSwatchConfigChange, disabled, showHeroPreview = false, productImages = [], productId }: MatrixVariantInputProps) {
  const [axes, setAxes] = useState<Axis[]>([]);
  const [newAxisName, setNewAxisName] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [newItemValues, setNewItemValues] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<Record<string, string>>({});
  const hydratedRef = useRef(false);

  // バリアント画像のプリロード（選択時にキャッシュ済みで即表示）
  useEffect(() => {
    const urls = variants.map((v) => v.imageUrl).filter((u): u is string => !!u && !u.startsWith('blob:'));
    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, [variants]);

  // ドラッグ&ドロップ
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragEnd = (axisId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setAxes((prev) =>
      prev.map((a) => {
        if (a.id !== axisId) return a;
        const oldIdx = a.items.findIndex((i) => i.id === active.id);
        const newIdx = a.items.findIndex((i) => i.id === over.id);
        if (oldIdx < 0 || newIdx < 0) return a;
        return { ...a, items: arrayMove(a.items, oldIdx, newIdx) };
      })
    );
  };

  // 既存variantsからaxesを自動復元（初回のみ）
  // variant名パターン: "マット:オフホワイト / ベース:オリーブ / フレーム:ソイル"
  //                  または "オフホワイト / オリーブ / ソイル"
  useEffect(() => {
    // ── すでに軸が構築済み → 色だけを後から適用（initialSwatchConfig が遅れて届いた場合）
    if (hydratedRef.current) {
      if (!initialSwatchConfig?.length || axes.length === 0) return;
      setAxes((prev) => {
        const next = prev.map((axis) => {
          const savedAxis = initialSwatchConfig.find((a) => a.name === axis.name);
          if (!savedAxis) return axis;
          // 色の更新 + savedAxisの順序に並べ替え
          const existingMap = new Map(axis.items.map((i) => [i.value, i]));
          // savedAxis の順序で並べ、存在するアイテムのみ採用（色も上書き）
          const reordered: AxisItem[] = [];
          for (const savedItem of savedAxis.items) {
            const existing = existingMap.get(savedItem.value);
            if (existing) {
              reordered.push({ ...existing, color: savedItem.color ?? existing.color, imageUrl: savedItem.imageUrl ?? existing.imageUrl });
            } else {
              reordered.push({ id: savedItem.id, value: savedItem.value, color: savedItem.color, imageUrl: savedItem.imageUrl });
            }
          }
          // savedAxis にない既存アイテムは末尾に追加
          for (const item of axis.items) {
            if (!savedAxis.items.find((i) => i.value === item.value)) {
              reordered.push(item);
            }
          }
          const changed =
            reordered.length !== axis.items.length ||
            reordered.some((item, idx) => item.value !== axis.items[idx]?.value || item.color !== axis.items[idx]?.color || item.imageUrl !== axis.items[idx]?.imageUrl);
          return changed ? { ...axis, items: reordered } : axis;
        });
        const anyChanged = next.some((a, i) => a !== prev[i]);
        return anyChanged ? next : prev;
      });
      return;
    }

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
            // バリアントの画像はスウォッチには引き継がない（スウォッチ画像はinitialSwatchConfigから取得）
          });
        }
      });
    }

    if (!valid || axisOrder.length === 0) { hydratedRef.current = true; return; }

    const restored: Axis[] = axisOrder.map((name, idx) => {
      // initialSwatchConfig から同名の軸を探して色・順序を引き継ぐ
      const savedAxis = initialSwatchConfig?.find((a) => a.name === name);
      const variantItemMap = axisItemsMap.get(name)!;
      let items: AxisItem[];
      if (savedAxis?.items?.length) {
        // savedAxis の順序で並べ替え（色も適用）
        const ordered: AxisItem[] = [];
        for (const savedItem of savedAxis.items) {
          const variantItem = variantItemMap.get(savedItem.value);
          if (variantItem) {
            ordered.push({ ...variantItem, color: savedItem.color ?? variantItem.color, imageUrl: savedItem.imageUrl ?? variantItem.imageUrl });
          } else {
            ordered.push({ id: savedItem.id, value: savedItem.value, color: savedItem.color, imageUrl: savedItem.imageUrl });
          }
        }
        // savedAxis にないバリアントアイテムは末尾に追加
        for (const [value, item] of variantItemMap.entries()) {
          if (!savedAxis.items.find((i) => i.value === value)) {
            ordered.push(item);
          }
        }
        items = ordered;
      } else {
        items = Array.from(variantItemMap.values());
      }
      return { id: `axis-restored-${idx}`, name, items };
    });
    setAxes(restored);
    hydratedRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variants, axes.length, initialSwatchConfig]);

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
    // 軸名:値 形式のバリエーション名にも対応
    const nameWithPrefix = validAxes
      .map((a) => {
        const val = selectedItems[a.id] ?? a.items[0]?.value;
        return val ? `${a.name}:${val}` : null;
      })
      .filter(Boolean)
      .join(' / ');
    const matched = variants.find((v) => v.name === nameWithPrefix || v.name === name) ?? null;
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
    <div className={cn(showHeroPreview ? "flex gap-4 items-start" : "space-y-0")}>

      {/* ヒーロープレビュー（スウォッチモード時・左側固定） */}
      {showHeroPreview && (() => {
        const selectedCombo = validAxes
          .map((a) => selectedItems[a.id] ?? a.items[0]?.value)
          .filter(Boolean);

        // バリエーション名は「軸名:値 / 軸名:値」形式の場合があるので両パターンで検索
        const comboWithPrefix = validAxes
          .map((a) => {
            const val = selectedItems[a.id] ?? a.items[0]?.value;
            return val ? `${a.name}:${val}` : null;
          })
          .filter(Boolean)
          .join(' / ');
        const comboPlain = selectedCombo.join(' / ');

        // バリアント名を分解して各軸の値が全て含まれているかで照合（順番・フォーマット違いに対応）
        const matchedVariant = variants.find((v) => {
          // まず完全一致を試みる（高速）
          if (v.name === comboWithPrefix || v.name === comboPlain) return true;
          // 完全一致しない場合は各選択値がバリアント名に含まれるか確認
          if (selectedCombo.length === 0) return false;
          const nameLower = v.name.toLowerCase();
          return selectedCombo.every((val) => nameLower.includes(val.toLowerCase()));
        });

        // おまかせが選択されている場合もマッチしたバリアントの画像を表示（空フレーム画像を設定可能）
        const hasOmakase = selectedCombo.includes('おまかせ');
        const previewImage = matchedVariant?.imageUrl;

        const handleHeroImageChange = async (file: File) => {
          if (!matchedVariant) return;
          if (!productId) {
            // productId がない場合は blob URL を一時使用（保存時は blob: URL が除外される）
            const url = URL.createObjectURL(file);
            onChange(variants.map((v) => v.id === matchedVariant.id ? { ...v, imageUrl: url } : v));
            return;
          }
          try {
            const { uploadProductImage } = await import('@/lib/actions/storage');
            const fd = new FormData();
            fd.append('file', file);
            const result = await uploadProductImage(productId, fd);
            if (result.data?.url) {
              const url = result.data.url;
              onChange(variants.map((v) => v.id === matchedVariant.id ? { ...v, imageUrl: url } : v));
            }
          } catch {
            // アップロード失敗時は何もしない
          }
        };

        return (
          <div className="w-80 shrink-0 sticky top-4 rounded-xl overflow-hidden border bg-background self-start">
            {/* 画像エリア */}
            <div className="aspect-[16/9] flex items-center justify-center relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 group/hero">
              {previewImage ? (
                <>
                  <img
                    key={previewImage}
                    src={previewImage}
                    alt="プレビュー"
                    className="w-full h-full object-contain"
                    loading="eager"
                  />
                  {hasOmakase && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #c77dff)' }}
                    >
                      おまかせ
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-10 w-10 opacity-40" />
                  <p className="text-xs text-center px-4">
                    {hasOmakase
                      ? '右下の「画像を設定」からおまかせ用の空フレーム画像をアップロードできます'
                      : selectedCombo.length > 0
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

              {/* バリエーション未マッチ時のヒント（おまかせ選択中は非表示） */}
              {!hasOmakase && !matchedVariant && selectedCombo.length === validAxes.length && selectedCombo.length > 0 && (
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
                  {!hasOmakase && !matchedVariant && (
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

            {/* ギャラリー画像選択（組み合わせへの紐付け） */}
            {matchedVariant && productImages.length > 0 && (
              <div className="px-4 py-3 border-t bg-muted/10">
                <p className="text-[11px] text-muted-foreground mb-2">
                  商品ギャラリーから画像を選択してこの組み合わせに紐付け：
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {productImages.map((img) => {
                    const isLinked = matchedVariant.imageUrl === img.url;
                    return (
                      <button
                        key={img.id}
                        type="button"
                        title={img.alt ?? img.url}
                        disabled={disabled}
                        onClick={() => {
                          onChange(
                            variants.map((v) =>
                              v.id === matchedVariant.id
                                ? { ...v, imageUrl: isLinked ? undefined : img.url }
                                : v
                            )
                          );
                        }}
                        className={cn(
                          'shrink-0 h-14 w-14 rounded-lg border-2 overflow-hidden transition-all',
                          isLinked
                            ? 'border-sky-500 ring-2 ring-sky-300 dark:ring-sky-700 scale-105'
                            : 'border-slate-200 dark:border-slate-600 hover:border-sky-400'
                        )}
                      >
                        <img
                          src={img.url}
                          alt={img.alt ?? ''}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* スウォッチ軸コントロール（横並び時は右カラム） */}
      <div className={cn(showHeroPreview && "flex-1 min-w-0 space-y-0")}>

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

            {/* スウォッチ一覧（横並びタイル・ドラッグ並び替え対応） */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(axis.id, e)}
            >
              <SortableContext
                items={axis.items.map((i) => i.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex flex-wrap gap-2.5 pt-2">
                  {axis.items.map((item) => {
                    const isSelected = selectedItems[axis.id] === item.value || (!selectedItems[axis.id] && axis.items[0]?.id === item.id);
                    const axisAllowsImages = axis.items.some((i) => i.imageUrl);
                    return (
                      <SortableSwatchItem
                        key={item.id}
                        item={item}
                        isSelected={isSelected}
                        disabled={disabled}
                        onSelect={() => setSelectedItems((prev) => ({ ...prev, [axis.id]: item.value }))}
                        onColorChange={(color) => updateItemColor(axis.id, item.id, color)}
                        onImageChange={(imageUrl) => updateItemImage(axis.id, item.id, imageUrl)}
                        onValueChange={(value) => updateItemValue(axis.id, item.id, value)}
                        onRemove={() => !disabled && removeItem(axis.id, item.id)}
                        productId={productId}
                        allowImages={axisAllowsImages}
                      />
                    );
                  })}

                  {/* 新しい選択肢を追加 */}
                  <div className="flex flex-col items-center gap-1 pt-2">
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
              </SortableContext>
            </DndContext>

            {/* 色未設定の注意書き（1つでも未設定があれば表示） */}
            {axis.items.some((i) => !i.color) && (
              <p className="mt-2 text-[11px] text-muted-foreground/60 flex items-center gap-1">
                スウォッチにカーソルを合わせて右下の <Palette className="inline h-2.5 w-2.5" /> から色を設定できます
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
      {!showHeroPreview && axes.length > 0 && (
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
      {!showHeroPreview && variants.length > 0 && (
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
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          e.target.value = '';
                          if (!productId) {
                            updateVariant(variant.id, 'imageUrl', URL.createObjectURL(file));
                            return;
                          }
                          try {
                            const { uploadProductImage } = await import('@/lib/actions/storage');
                            const fd = new FormData();
                            fd.append('file', file);
                            const result = await uploadProductImage(productId, fd);
                            if (result.data?.url) {
                              updateVariant(variant.id, 'imageUrl', result.data.url);
                            }
                          } catch {
                            updateVariant(variant.id, 'imageUrl', URL.createObjectURL(file));
                          }
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
      </div>{/* /スウォッチ軸コントロール */}
    </div>
  );
}

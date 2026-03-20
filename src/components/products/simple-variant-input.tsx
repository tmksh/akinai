'use client';

import { Plus, Trash2, GripVertical, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  imageUrl?: string;
}

interface SimpleVariantInputProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  disabled?: boolean;
}

export function SimpleVariantInput({ variants, onChange, disabled }: SimpleVariantInputProps) {
  const addVariant = () => {
    onChange([
      ...variants,
      { id: `new-${Date.now()}`, name: '', sku: '', price: 0, stock: 0 },
    ]);
  };

  const removeVariant = (id: string) => {
    if (variants.length > 1) {
      onChange(variants.filter((v) => v.id !== id));
    }
  };

  const updateVariant = (id: string, field: keyof ProductVariant, value: string | number) => {
    onChange(variants.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">バリエーションを1行ずつ追加します</p>
        <Button variant="outline" size="sm" onClick={addVariant} disabled={disabled}>
          <Plus className="mr-2 h-4 w-4" />
          追加
        </Button>
      </div>

      <div className="space-y-3">
        {variants.map((variant, index) => (
          <div key={variant.id} className="rounded-lg border p-4 space-y-3">
            {/* 上段: ドラッグ・画像・名前・削除 */}
            <div className="flex items-center gap-3">
              <div className="text-muted-foreground cursor-grab">
                <GripVertical className="h-4 w-4" />
              </div>
              <label className="block cursor-pointer group shrink-0">
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
                  'h-10 w-10 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors',
                  'hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/20',
                  variant.imageUrl ? 'border-transparent' : 'border-slate-200 dark:border-slate-700'
                )}>
                  {variant.imageUrl ? (
                    <img src={variant.imageUrl} alt={variant.name} className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground group-hover:text-sky-500" />
                  )}
                </div>
              </label>
              <span className="text-sm font-medium flex-1 truncate">
                {variant.name || `バリエーション ${index + 1}`}
              </span>
              {variant.imageUrl && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => updateVariant(variant.id, 'imageUrl', '')}
                >
                  画像削除
                </button>
              )}
              {variants.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeVariant(variant.id)}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* 下段: 入力フィールド */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">バリエーション名</Label>
                <Input
                  placeholder="例: ホワイト / M"
                  value={variant.name}
                  onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">SKU *</Label>
                <Input
                  placeholder="例: PRD-001-WH-M"
                  value={variant.sku}
                  onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                  className="font-mono"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">価格（税込）</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={variant.price || ''}
                  onChange={(e) => updateVariant(variant.id, 'price', parseInt(e.target.value) || 0)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">在庫数</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={variant.stock || ''}
                  onChange={(e) => updateVariant(variant.id, 'stock', parseInt(e.target.value) || 0)}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

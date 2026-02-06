'use client';

import { Label } from '@/components/ui/label';

interface FieldLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  fieldKey: string;
  className?: string;
}

/**
 * APIキーIDバッジ付きのフィールドラベル
 * 固定フィールドのAPIキーをUI上に表示する
 */
export function FieldLabel({ htmlFor, children, fieldKey, className }: FieldLabelProps) {
  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Label htmlFor={htmlFor}>{children}</Label>
      <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded">
        {fieldKey}
      </span>
    </div>
  );
}

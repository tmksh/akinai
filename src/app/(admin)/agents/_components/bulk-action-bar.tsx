'use client';

import { X, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}

export function BulkActionBar({
  selectedCount,
  onClear,
  onActivate,
  onDeactivate,
  onDelete,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2 px-4 py-3 bg-card border shadow-lg rounded-full">
        <span className="text-sm font-medium px-2">
          {selectedCount}件選択中
        </span>
        <div className="h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onActivate}
          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
        >
          <CheckCircle className="h-4 w-4 mr-1.5" />
          有効化
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeactivate}
          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
        >
          <XCircle className="h-4 w-4 mr-1.5" />
          停止
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          削除
        </Button>
        <div className="h-4 w-px bg-border" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

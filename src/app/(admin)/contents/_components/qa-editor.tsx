'use client';

import { useCallback, useRef } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import type { QAPairBlock } from '@/types/content-blocks';

interface QAEditorProps {
  pairs: QAPairBlock[];
  onChange: (pairs: QAPairBlock[]) => void;
  disabled?: boolean;
}

export function QAEditor({ pairs, onChange, disabled }: QAEditorProps) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const addPair = () => {
    const newPair: QAPairBlock = {
      id: `qa-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      question: '',
      answer: '',
      order: pairs.length,
    };
    onChange([...pairs, newPair]);
  };

  const updatePair = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = pairs.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    );
    onChange(updated);
  };

  const removePair = (index: number) => {
    const updated = pairs
      .filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, order: i }));
    onChange(updated);
  };

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index;
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOverItem.current = index;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const updated = [...pairs];
    const draggedItem = updated[dragItem.current];
    updated.splice(dragItem.current, 1);
    updated.splice(dragOverItem.current, 0, draggedItem);

    const reordered = updated.map((p, i) => ({ ...p, order: i }));
    onChange(reordered);

    dragItem.current = null;
    dragOverItem.current = null;
  }, [pairs, onChange]);

  return (
    <div className="space-y-4">
      {pairs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-sm">まだ質問がありません</p>
          <p className="text-xs mt-1">「質問を追加」ボタンで追加してください</p>
        </div>
      )}

      {pairs.map((pair, index) => (
        <div
          key={pair.id}
          draggable={!disabled}
          onDragStart={() => handleDragStart(index)}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => e.preventDefault()}
          className="border rounded-lg p-4 bg-white dark:bg-slate-900 space-y-3 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
              <Badge variant="secondary" className="text-xs font-mono">
                Q{index + 1}
              </Badge>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removePair(index)}
              disabled={disabled}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-2">
            <Input
              placeholder="質問を入力..."
              value={pair.question}
              onChange={(e) => updatePair(index, 'question', e.target.value)}
              disabled={disabled}
              className="font-medium"
            />
            <Textarea
              placeholder="回答を入力..."
              value={pair.answer}
              onChange={(e) => updatePair(index, 'answer', e.target.value)}
              disabled={disabled}
              className="min-h-[80px]"
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addPair}
        disabled={disabled}
        className="w-full border-dashed"
      >
        <Plus className="mr-2 h-4 w-4" />
        質問を追加
      </Button>
    </div>
  );
}

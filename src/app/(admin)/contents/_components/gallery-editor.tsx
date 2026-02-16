'use client';

import { useCallback, useRef, useState } from 'react';
import { Plus, Trash2, GripVertical, Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadContentImage } from '@/lib/actions/storage';
import type { GalleryItemBlock } from '@/types/content-blocks';

interface GalleryEditorProps {
  items: GalleryItemBlock[];
  onChange: (items: GalleryItemBlock[]) => void;
  organizationId: string;
  disabled?: boolean;
}

export function GalleryEditor({ items, onChange, organizationId, disabled }: GalleryEditorProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const newItems: GalleryItemBlock[] = [];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await uploadContentImage(organizationId, formData);
      if (data) {
        newItems.push({
          id: `gallery-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          url: data.url,
          caption: '',
          alt: file.name.split('.')[0],
          order: items.length + newItems.length,
        });
      } else {
        console.error('Upload failed:', error);
      }
    }

    if (newItems.length > 0) {
      onChange([...items, ...newItems]);
    }
    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateItem = (index: number, field: 'caption' | 'alt', value: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const removeItem = (index: number) => {
    const updated = items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, order: i }));
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

    const updated = [...items];
    const draggedItem = updated[dragItem.current];
    updated.splice(dragItem.current, 1);
    updated.splice(dragOverItem.current, 0, draggedItem);

    const reordered = updated.map((item, i) => ({ ...item, order: i }));
    onChange(reordered);

    dragItem.current = null;
    dragOverItem.current = null;
  }, [items, onChange]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* ドロップゾーン */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed rounded-lg p-6 text-center hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors cursor-pointer"
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">アップロード中...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              画像をドラッグ＆ドロップ、またはクリックして選択
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WEBP, GIF（10MB以下）
            </p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled || uploading}
        />
      </div>

      {/* 画像グリッド */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable={!disabled}
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className="border rounded-lg overflow-hidden bg-white dark:bg-slate-900 group"
            >
              <div className="relative aspect-square bg-muted">
                <Image
                  src={item.url}
                  alt={item.alt || ''}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors">
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-5 w-5 text-white cursor-grab drop-shadow" />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeItem(index)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="p-2 space-y-1.5">
                <Input
                  placeholder="キャプション"
                  value={item.caption}
                  onChange={(e) => updateItem(index, 'caption', e.target.value)}
                  disabled={disabled}
                  className="h-7 text-xs"
                />
                <Input
                  placeholder="alt テキスト"
                  value={item.alt}
                  onChange={(e) => updateItem(index, 'alt', e.target.value)}
                  disabled={disabled}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && !uploading && (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-xs">まだ画像がありません</p>
        </div>
      )}
    </div>
  );
}

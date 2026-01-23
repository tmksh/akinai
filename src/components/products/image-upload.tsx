'use client';

import { useState, useCallback, useTransition } from 'react';
import Image from 'next/image';
import { Upload, X, Loader2, GripVertical, ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uploadProductImage, deleteProductImage, updateImageOrder } from '@/lib/actions/storage';

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sort_order: number;
}

interface ImageUploadProps {
  productId: string;
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  disabled?: boolean;
}

export function ImageUpload({ productId, images, onImagesChange, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // ファイルアップロード処理
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const result = await uploadProductImage(productId, formData);
        
        if (result.error) {
          setUploadError(result.error);
          continue;
        }

        if (result.data) {
          const newImage: ProductImage = {
            id: result.data.id,
            url: result.data.url,
            alt: file.name.split('.')[0],
            sort_order: images.length,
          };
          onImagesChange([...images, newImage]);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('アップロードに失敗しました');
    } finally {
      setIsUploading(false);
      // inputをリセット
      e.target.value = '';
    }
  }, [productId, images, onImagesChange]);

  // 画像削除処理
  const handleDelete = useCallback((imageId: string) => {
    startTransition(async () => {
      const result = await deleteProductImage(imageId, productId);
      
      if (result.success) {
        onImagesChange(images.filter(img => img.id !== imageId));
      } else {
        setUploadError(result.error || '削除に失敗しました');
      }
    });
  }, [productId, images, onImagesChange]);

  // ドラッグ&ドロップ処理
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    
    setDraggedIndex(index);
    onImagesChange(newImages);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null) {
      // 並び順をサーバーに保存
      startTransition(async () => {
        await updateImageOrder(productId, images.map(img => img.id));
      });
    }
    setDraggedIndex(null);
  };

  // ドロップゾーンへのドラッグ&ドロップ
  const handleDropzoneDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      for (const file of Array.from(files)) {
        // ファイルタイプチェック
        if (!file.type.startsWith('image/')) continue;

        const formData = new FormData();
        formData.append('file', file);

        const result = await uploadProductImage(productId, formData);
        
        if (result.error) {
          setUploadError(result.error);
          continue;
        }

        if (result.data) {
          const newImage: ProductImage = {
            id: result.data.id,
            url: result.data.url,
            alt: file.name.split('.')[0],
            sort_order: images.length,
          };
          onImagesChange([...images, newImage]);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('アップロードに失敗しました');
    } finally {
      setIsUploading(false);
    }
  }, [productId, images, onImagesChange]);

  return (
    <div className="space-y-4">
      {/* エラー表示 */}
      {uploadError && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <X className="h-4 w-4 shrink-0" />
          {uploadError}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2"
            onClick={() => setUploadError(null)}
          >
            閉じる
          </Button>
        </div>
      )}

      {/* 画像グリッド */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <div
            key={image.id}
            draggable={!disabled && !isPending}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "relative aspect-square rounded-lg overflow-hidden border group",
              draggedIndex === index && "opacity-50",
              !disabled && "cursor-grab active:cursor-grabbing"
            )}
          >
            <Image
              src={image.url}
              alt={image.alt || `商品画像 ${index + 1}`}
              fill
              className="object-cover"
            />
            {/* オーバーレイ */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {!disabled && (
                <>
                  <div className="absolute top-2 left-2 p-1 rounded bg-white/10 text-white">
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(image.id)}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
            </div>
            {/* メイン画像ラベル */}
            {index === 0 && (
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-white text-xs">
                メイン画像
              </div>
            )}
          </div>
        ))}

        {/* アップロードボタン（画像がある場合のみグリッド内に表示） */}
        {!disabled && images.length > 0 && (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleDropzoneDrop}
            className={cn(
              "aspect-square rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer",
              isUploading 
                ? "border-primary bg-primary/5" 
                : "hover:border-primary hover:bg-muted/50 hover:text-primary"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">アップロード中...</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm">画像を追加</span>
                <span className="text-xs">またはドラッグ&ドロップ</span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      {/* 説明 */}
      {!disabled && images.length === 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={handleDropzoneDrop}
          className={cn(
            "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isUploading
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="mx-auto h-10 w-10 text-primary animate-spin" />
              <p className="mt-2 text-sm text-muted-foreground">
                アップロード中...
              </p>
            </>
          ) : (
            <>
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                画像をドラッグ&ドロップ、または
              </p>
              <label className="cursor-pointer">
                <span className="mt-1 inline-block text-sm text-primary hover:underline">
                  ファイルを選択
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG, JPG, WEBP, GIF（最大10MB）
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}


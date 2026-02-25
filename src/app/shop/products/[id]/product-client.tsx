'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ShopProduct } from '@/lib/actions/shop';
import { toast } from 'sonner';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';

interface ProductClientProps {
  product: ShopProduct;
}

export default function ProductClient({ product }: ProductClientProps) {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { addItem: addToCart } = useCart();
  const { toggle: toggleWishlist, isInWishlist } = useWishlist();

  const selectedVariant = product.variants[selectedVariantIndex];
  const hasMultipleVariants = product.variants.length > 1;
  const hasMultipleImages = product.images.length > 1;
  const isOutOfStock = selectedVariant?.stock === 0;
  const inWishlist = isInWishlist(product.id);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  // カートに追加
  const handleAddToCart = () => {
    if (!selectedVariant || isOutOfStock) return;

    addToCart({
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      price: selectedVariant.price,
      compareAtPrice: selectedVariant.compareAtPrice ?? undefined,
      image: product.images[0]?.url || '',
      quantity,
      variant: selectedVariant.options || {},
      sku: selectedVariant.sku,
    });

    toast.success('カートに追加しました', {
      description: `${product.name}${hasMultipleVariants ? ` (${selectedVariant.name})` : ''} × ${quantity}`,
      action: {
        label: 'カートを見る',
        onClick: () => window.location.href = '/shop/cart',
      },
    });
  };

  // お気に入りトグル
  const handleAddToWishlist = () => {
    const added = toggleWishlist({
      productId: product.id,
      name: product.name,
      image: product.images[0]?.url || '',
      price: product.minPrice,
      slug: product.slug,
    });
    toast.success(added ? 'お気に入りに追加しました' : 'お気に入りから削除しました');
  };

  // シェア
  const handleShare = async () => {
    try {
      await navigator.share({
        title: product.name,
        text: product.shortDescription || product.description || '',
        url: window.location.href,
      });
    } catch {
      // Web Share APIがサポートされていない場合はURLをコピー
      await navigator.clipboard.writeText(window.location.href);
      toast.success('URLをコピーしました');
    }
  };

  const currentImage = product.images[currentImageIndex]?.url || 'https://picsum.photos/seed/default/800/1000';

  return (
    <>
      {/* 画像ギャラリー */}
      <div className="space-y-4">
        {/* メイン画像 */}
        <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden group">
          <Image
            src={currentImage}
            alt={product.images[currentImageIndex]?.alt || product.name}
            fill
            className="object-cover"
            priority
          />
          
          {hasMultipleImages && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-lg font-medium">SOLD OUT</span>
            </div>
          )}
        </div>

        {/* サムネイル */}
        {hasMultipleImages && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {product.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={cn(
                  "relative w-20 h-20 flex-shrink-0 overflow-hidden transition-all",
                  index === currentImageIndex 
                    ? "ring-2 ring-slate-800" 
                    : "opacity-60 hover:opacity-100"
                )}
              >
                <Image
                  src={image.url}
                  alt={image.alt || `${product.name} ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 商品情報 */}
      <div className="flex flex-col">
        {/* カテゴリ */}
        {product.categories[0] && (
          <p className="text-xs tracking-[0.2em] text-slate-400 uppercase mb-2">
            {product.categories[0].name}
          </p>
        )}

        {/* 商品名 */}
        <h1 className="text-2xl md:text-3xl font-light tracking-wide text-slate-800 mb-4">
          {product.name}
        </h1>

        {/* 価格 */}
        <div className="flex items-baseline gap-3 mb-6">
          <span className="text-2xl font-medium text-slate-800">
            ¥{selectedVariant?.price.toLocaleString() || product.minPrice.toLocaleString()}
          </span>
          {selectedVariant?.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price && (
            <span className="text-lg text-slate-400 line-through">
              ¥{selectedVariant.compareAtPrice.toLocaleString()}
            </span>
          )}
          <span className="text-sm text-slate-500">（税込）</span>
        </div>

        {/* 短い説明 */}
        {product.shortDescription && (
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            {product.shortDescription}
          </p>
        )}

        <Separator className="my-6" />

        {/* バリエーション選択 */}
        {hasMultipleVariants && (
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-800 mb-3">
              バリエーション
            </p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant, index) => (
                <button
                  key={variant.id}
                  onClick={() => setSelectedVariantIndex(index)}
                  disabled={variant.stock === 0}
                  className={cn(
                    "px-4 py-2 text-sm border transition-all",
                    selectedVariantIndex === index
                      ? "border-slate-800 bg-slate-800 text-white"
                      : variant.stock === 0
                        ? "border-slate-200 text-slate-300 cursor-not-allowed"
                        : "border-slate-200 hover:border-slate-400"
                  )}
                >
                  {variant.name}
                  {variant.stock === 0 && " (売切)"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 数量選択 */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-800 mb-3">
            数量
          </p>
          <div className="inline-flex items-center border border-slate-200">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-3 hover:bg-slate-50 transition-colors"
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-12 text-center font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(selectedVariant?.stock || 99, quantity + 1))}
              className="p-3 hover:bg-slate-50 transition-colors"
              disabled={quantity >= (selectedVariant?.stock || 99)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {selectedVariant && selectedVariant.stock <= 5 && selectedVariant.stock > 0 && (
            <p className="text-sm text-orange-600 mt-2">
              残り{selectedVariant.stock}点です
            </p>
          )}
        </div>

        {/* アクションボタン */}
        <div className="space-y-3">
          <Button
            size="lg"
            className="w-full h-14 bg-slate-800 hover:bg-slate-900 text-white"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            {isOutOfStock ? (
              '在庫切れ'
            ) : (
              <>
                <ShoppingBag className="h-5 w-5 mr-2" />
                カートに追加
              </>
            )}
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className={cn("flex-1", inWishlist && "border-red-300 text-red-500 hover:bg-red-50")}
              onClick={handleAddToWishlist}
            >
              <Heart className={cn("h-5 w-5 mr-2", inWishlist && "fill-red-500 text-red-500")} />
              {inWishlist ? 'お気に入り済み' : 'お気に入り'}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleShare}
            >
              <Share2 className="h-5 w-5 mr-2" />
              シェア
            </Button>
          </div>
        </div>

        {/* 追加情報 */}
        {selectedVariant && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">SKU</dt>
                <dd className="text-slate-800">{selectedVariant.sku}</dd>
              </div>
              {product.categories.length > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">カテゴリ</dt>
                  <dd className="text-slate-800">
                    {product.categories.map(c => c.name).join(', ')}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </>
  );
}





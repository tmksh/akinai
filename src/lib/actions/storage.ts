'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { processAndUploadImageBuffer } from '@/lib/server-image';

const BUCKET_NAME = 'products';

// 商品画像をアップロード
export async function uploadProductImage(
  productId: string,
  formData: FormData
): Promise<{
  data: { id: string; url: string } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { data: null, error: 'ファイルが選択されていません' };
    }

    // ファイルサイズチェック（10MB以下）
    if (file.size > 10 * 1024 * 1024) {
      return { data: null, error: 'ファイルサイズは10MB以下にしてください' };
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { data: null, error: 'サポートされていないファイル形式です（JPG, PNG, WEBP, GIFのみ）' };
    }

    // サーバー側でリサイズ(長辺1200px)+WebP変換し、サムネイル(400px)も生成して保存
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    let processed: { url: string; thumbnailUrl: string };
    try {
      processed = await processAndUploadImageBuffer(supabase, inputBuffer, {
        bucket: BUCKET_NAME,
        folder: productId,
      });
    } catch (e) {
      console.error('Image processing error:', e);
      return { data: null, error: 'アップロードに失敗しました' };
    }

    // 既存の画像数を取得してソート順を決定
    const { data: existingImages } = await supabase
      .from('product_images')
      .select('sort_order')
      .eq('product_id', productId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = existingImages && existingImages.length > 0 
      ? existingImages[0].sort_order + 1 
      : 0;

    // product_imagesテーブルに保存
    const { data: imageRecord, error: dbError } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        url: processed.url,
        thumbnail_url: processed.thumbnailUrl,
        alt: file.name.split('.')[0], // ファイル名から拡張子を除いたものをaltに
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      return { data: null, error: 'データベースへの保存に失敗しました' };
    }

    revalidatePath(`/products/${productId}`);
    revalidatePath(`/products/${productId}/edit`);

    return {
      data: {
        id: imageRecord.id,
        url: processed.url,
      },
      error: null,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return { data: null, error: 'アップロードに失敗しました' };
  }
}

// バリアント専用画像アップロード（product_imagesギャラリーには登録しない）
export async function uploadVariantImage(
  productId: string,
  formData: FormData
): Promise<{
  data: { url: string } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { data: null, error: 'ファイルが選択されていません' };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { data: null, error: 'ファイルサイズは10MB以下にしてください' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { data: null, error: 'サポートされていないファイル形式です（JPG, PNG, WEBP, GIFのみ）' };
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    let processed: { url: string; thumbnailUrl: string };
    try {
      processed = await processAndUploadImageBuffer(supabase, inputBuffer, {
        bucket: BUCKET_NAME,
        folder: `${productId}/variants`,
      });
    } catch (e) {
      console.error('Variant image processing error:', e);
      return { data: null, error: 'アップロードに失敗しました' };
    }

    return { data: { url: processed.url }, error: null };
  } catch (error) {
    console.error('Variant image upload error:', error);
    return { data: null, error: 'アップロードに失敗しました' };
  }
}

// 商品画像を削除
export async function deleteProductImage(
  imageId: string,
  productId: string
): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 画像レコードを取得
    const { data: image, error: fetchError } = await supabase
      .from('product_images')
      .select('url')
      .eq('id', imageId)
      .single();

    if (fetchError || !image) {
      return { success: false, error: '画像が見つかりません' };
    }

    // URLからパスを抽出
    const url = new URL(image.url);
    const pathParts = url.pathname.split('/');
    const storagePath = pathParts.slice(pathParts.indexOf(BUCKET_NAME) + 1).join('/');

    // バリアントがこのURLを使用中か確認（使用中はStorageファイルを削除しない）
    const { data: referencingVariants } = await supabase
      .from('product_variants')
      .select('id')
      .eq('product_id', productId)
      .filter('options->>imageUrl', 'eq', image.url)
      .limit(1);

    const isUsedByVariant = referencingVariants && referencingVariants.length > 0;

    // Storageから削除（バリアントが参照していない場合のみ）
    if (storagePath && !isUsedByVariant) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Storageの削除に失敗してもDBの削除は続行
      }
    }

    // DBから削除
    const { error: dbError } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      return { success: false, error: 'データベースからの削除に失敗しました' };
    }

    revalidatePath(`/products/${productId}`);
    revalidatePath(`/products/${productId}/edit`);

    return { success: true, error: null };
  } catch (error) {
    console.error('Delete error:', error);
    return { success: false, error: '削除に失敗しました' };
  }
}

// 画像の並び順を更新
export async function updateImageOrder(
  productId: string,
  imageIds: string[]
): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // 各画像のsort_orderを更新
    const updates = imageIds.map((id, index) => 
      supabase
        .from('product_images')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('product_id', productId)
    );

    await Promise.all(updates);

    revalidatePath(`/products/${productId}`);
    revalidatePath(`/products/${productId}/edit`);

    return { success: true, error: null };
  } catch (error) {
    console.error('Update order error:', error);
    return { success: false, error: '並び順の更新に失敗しました' };
  }
}

// コンテンツ（ギャラリー）画像をアップロード
export async function uploadContentImage(
  organizationId: string,
  formData: FormData
): Promise<{
  data: { url: string } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { data: null, error: 'ファイルが選択されていません' };
    }

    if (file.size > 10 * 1024 * 1024) {
      return { data: null, error: 'ファイルサイズは10MB以下にしてください' };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return { data: null, error: 'サポートされていないファイル形式です（JPG, PNG, WEBP, GIFのみ）' };
    }

    // サーバー側でリサイズ(長辺1200px)+WebP変換して保存
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    let processed: { url: string; thumbnailUrl: string };
    try {
      processed = await processAndUploadImageBuffer(supabase, inputBuffer, {
        bucket: 'contents',
        folder: organizationId,
      });
    } catch (e) {
      console.error('Content image processing error:', e);
      return { data: null, error: 'アップロードに失敗しました' };
    }

    return {
      data: { url: processed.url },
      error: null,
    };
  } catch (error) {
    console.error('Content image upload error:', error);
    return { data: null, error: 'アップロードに失敗しました' };
  }
}

// Storageバケットを初期化（存在しない場合は作成）
export async function initializeStorageBucket(): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    // バケットが存在するか確認
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('List buckets error:', listError);
      return { success: false, error: 'バケット一覧の取得に失敗しました' };
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (!bucketExists) {
      // バケットを作成
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });

      if (createError) {
        console.error('Create bucket error:', createError);
        return { success: false, error: 'バケットの作成に失敗しました' };
      }
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Initialize bucket error:', error);
    return { success: false, error: 'バケットの初期化に失敗しました' };
  }
}


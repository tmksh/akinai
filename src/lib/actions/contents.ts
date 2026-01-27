'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ContentType, ContentStatus } from '@/types';

// コンテンツ型定義
export interface ContentData {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  excerpt: string | null;
  blocks: unknown[];
  status: ContentStatus;
  authorId: string | null;
  authorName?: string | null;
  authorAvatar?: string | null;
  featuredImage: string | null;
  tags: string[];
  relatedProductIds: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

// コンテンツ作成入力
export interface CreateContentInput {
  type: ContentType;
  title: string;
  slug: string;
  excerpt?: string;
  blocks?: unknown[];
  status?: ContentStatus;
  featuredImage?: string;
  tags?: string[];
  relatedProductIds?: string[];
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: string;
  scheduledAt?: string;
}

// コンテンツ更新入力
export interface UpdateContentInput {
  type?: ContentType;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  blocks?: unknown[];
  status?: ContentStatus;
  featuredImage?: string | null;
  tags?: string[];
  relatedProductIds?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedAt?: string | null;
  scheduledAt?: string | null;
}

// コンテンツ一覧取得
export async function getContents(
  organizationId: string,
  options?: {
    type?: ContentType;
    status?: ContentStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: ContentData[] | null; error: string | null; total: number }> {
  try {
    const supabase = await createClient();
    
    let query = supabase
      .from('contents')
      .select(`
        *,
        author:users!author_id (
          name,
          avatar
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // フィルター
    if (options?.type) {
      query = query.eq('type', options.type);
    }
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.search) {
      query = query.ilike('title', `%${options.search}%`);
    }

    // ページネーション
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: error.message, total: 0 };
    }

    const contents: ContentData[] = data.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      type: item.type as ContentType,
      title: item.title as string,
      slug: item.slug as string,
      excerpt: item.excerpt as string | null,
      blocks: (item.blocks as unknown[]) || [],
      status: item.status as ContentStatus,
      authorId: item.author_id as string | null,
      authorName: (item.author as Record<string, unknown> | null)?.name as string | null,
      authorAvatar: (item.author as Record<string, unknown> | null)?.avatar as string | null,
      featuredImage: item.featured_image as string | null,
      tags: (item.tags as string[]) || [],
      relatedProductIds: (item.related_product_ids as string[]) || [],
      seoTitle: item.seo_title as string | null,
      seoDescription: item.seo_description as string | null,
      publishedAt: item.published_at as string | null,
      scheduledAt: item.scheduled_at as string | null,
      organizationId: item.organization_id as string,
      createdAt: item.created_at as string,
      updatedAt: item.updated_at as string,
    }));

    return { data: contents, error: null, total: count || 0 };
  } catch (err) {
    return { data: null, error: (err as Error).message, total: 0 };
  }
}

// コンテンツ統計取得
export async function getContentStats(
  organizationId: string
): Promise<{
  total: number;
  published: number;
  draft: number;
  scheduled: number;
} | null> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('contents')
      .select('status, scheduled_at')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Error fetching content stats:', error);
      return null;
    }

    return {
      total: data.length,
      published: data.filter(c => c.status === 'published').length,
      draft: data.filter(c => c.status === 'draft').length,
      scheduled: data.filter(c => c.scheduled_at !== null).length,
    };
  } catch (err) {
    console.error('Error:', err);
    return null;
  }
}

// 単一コンテンツ取得
export async function getContent(
  contentId: string,
  organizationId: string
): Promise<{ data: ContentData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('contents')
      .select(`
        *,
        author:users!author_id (
          name,
          avatar
        )
      `)
      .eq('id', contentId)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const content: ContentData = {
      id: data.id,
      type: data.type as ContentType,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      blocks: data.blocks || [],
      status: data.status as ContentStatus,
      authorId: data.author_id,
      authorName: data.author?.name,
      authorAvatar: data.author?.avatar,
      featuredImage: data.featured_image,
      tags: data.tags || [],
      relatedProductIds: data.related_product_ids || [],
      seoTitle: data.seo_title,
      seoDescription: data.seo_description,
      publishedAt: data.published_at,
      scheduledAt: data.scheduled_at,
      organizationId: data.organization_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { data: content, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

// コンテンツ作成
export async function createContent(
  input: CreateContentInput,
  organizationId: string
): Promise<{ data: ContentData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    // 現在のユーザーを取得
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: '認証が必要です' };
    }

    // スラッグの重複チェック
    const { data: existing } = await supabase
      .from('contents')
      .select('id')
      .eq('slug', input.slug)
      .eq('organization_id', organizationId)
      .single();

    if (existing) {
      return { data: null, error: 'このスラッグは既に使用されています' };
    }

    const { data, error } = await supabase
      .from('contents')
      .insert({
        type: input.type,
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt || null,
        blocks: input.blocks || [],
        status: input.status || 'draft',
        author_id: user.id,
        featured_image: input.featuredImage || null,
        tags: input.tags || [],
        related_product_ids: input.relatedProductIds || [],
        seo_title: input.seoTitle || null,
        seo_description: input.seoDescription || null,
        published_at: input.publishedAt || null,
        scheduled_at: input.scheduledAt || null,
        organization_id: organizationId,
      })
      .select(`
        *,
        author:users!author_id (
          name,
          avatar
        )
      `)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    revalidatePath('/contents');

    const content: ContentData = {
      id: data.id,
      type: data.type as ContentType,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      blocks: data.blocks || [],
      status: data.status as ContentStatus,
      authorId: data.author_id,
      authorName: data.author?.name,
      authorAvatar: data.author?.avatar,
      featuredImage: data.featured_image,
      tags: data.tags || [],
      relatedProductIds: data.related_product_ids || [],
      seoTitle: data.seo_title,
      seoDescription: data.seo_description,
      publishedAt: data.published_at,
      scheduledAt: data.scheduled_at,
      organizationId: data.organization_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { data: content, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

// コンテンツ更新
export async function updateContent(
  contentId: string,
  input: UpdateContentInput,
  organizationId: string
): Promise<{ data: ContentData | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // スラッグの重複チェック（自分以外）
    if (input.slug) {
      const { data: existing } = await supabase
        .from('contents')
        .select('id')
        .eq('slug', input.slug)
        .eq('organization_id', organizationId)
        .neq('id', contentId)
        .single();

      if (existing) {
        return { data: null, error: 'このスラッグは既に使用されています' };
      }
    }

    const updateData: Record<string, unknown> = {};
    if (input.type !== undefined) updateData.type = input.type;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.excerpt !== undefined) updateData.excerpt = input.excerpt;
    if (input.blocks !== undefined) updateData.blocks = input.blocks;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.featuredImage !== undefined) updateData.featured_image = input.featuredImage;
    if (input.tags !== undefined) updateData.tags = input.tags;
    if (input.relatedProductIds !== undefined) updateData.related_product_ids = input.relatedProductIds;
    if (input.seoTitle !== undefined) updateData.seo_title = input.seoTitle;
    if (input.seoDescription !== undefined) updateData.seo_description = input.seoDescription;
    if (input.publishedAt !== undefined) updateData.published_at = input.publishedAt;
    if (input.scheduledAt !== undefined) updateData.scheduled_at = input.scheduledAt;

    const { data, error } = await supabase
      .from('contents')
      .update(updateData)
      .eq('id', contentId)
      .eq('organization_id', organizationId)
      .select(`
        *,
        author:users!author_id (
          name,
          avatar
        )
      `)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    revalidatePath('/contents');
    revalidatePath(`/contents/${contentId}`);

    const content: ContentData = {
      id: data.id,
      type: data.type as ContentType,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      blocks: data.blocks || [],
      status: data.status as ContentStatus,
      authorId: data.author_id,
      authorName: data.author?.name,
      authorAvatar: data.author?.avatar,
      featuredImage: data.featured_image,
      tags: data.tags || [],
      relatedProductIds: data.related_product_ids || [],
      seoTitle: data.seo_title,
      seoDescription: data.seo_description,
      publishedAt: data.published_at,
      scheduledAt: data.scheduled_at,
      organizationId: data.organization_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { data: content, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}

// コンテンツ削除
export async function deleteContent(
  contentId: string,
  organizationId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('contents')
      .delete()
      .eq('id', contentId)
      .eq('organization_id', organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/contents');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// コンテンツ公開
export async function publishContent(
  contentId: string,
  organizationId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('contents')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', contentId)
      .eq('organization_id', organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/contents');
    revalidatePath(`/contents/${contentId}`);
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// コンテンツをアーカイブ
export async function archiveContent(
  contentId: string,
  organizationId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('contents')
      .update({ status: 'archived' })
      .eq('id', contentId)
      .eq('organization_id', organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/contents');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// コンテンツを複製
export async function duplicateContent(
  contentId: string,
  organizationId: string
): Promise<{ data: ContentData | null; error: string | null }> {
  try {
    const supabase = await createClient();
    
    // 元のコンテンツを取得
    const { data: original, error: fetchError } = await supabase
      .from('contents')
      .select('*')
      .eq('id', contentId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !original) {
      return { data: null, error: 'コンテンツが見つかりません' };
    }

    // 新しいスラッグを生成
    const newSlug = `${original.slug}-copy-${Date.now()}`;

    // 現在のユーザーを取得
    const { data: { user } } = await supabase.auth.getUser();

    // 複製
    const { data, error } = await supabase
      .from('contents')
      .insert({
        type: original.type,
        title: `${original.title} (コピー)`,
        slug: newSlug,
        excerpt: original.excerpt,
        blocks: original.blocks,
        status: 'draft',
        author_id: user?.id || original.author_id,
        featured_image: original.featured_image,
        tags: original.tags,
        related_product_ids: original.related_product_ids,
        seo_title: original.seo_title,
        seo_description: original.seo_description,
        organization_id: organizationId,
      })
      .select(`
        *,
        author:users!author_id (
          name,
          avatar
        )
      `)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    revalidatePath('/contents');

    const content: ContentData = {
      id: data.id,
      type: data.type as ContentType,
      title: data.title,
      slug: data.slug,
      excerpt: data.excerpt,
      blocks: data.blocks || [],
      status: data.status as ContentStatus,
      authorId: data.author_id,
      authorName: data.author?.name,
      authorAvatar: data.author?.avatar,
      featuredImage: data.featured_image,
      tags: data.tags || [],
      relatedProductIds: data.related_product_ids || [],
      seoTitle: data.seo_title,
      seoDescription: data.seo_description,
      publishedAt: data.published_at,
      scheduledAt: data.scheduled_at,
      organizationId: data.organization_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { data: content, error: null };
  } catch (err) {
    return { data: null, error: (err as Error).message };
  }
}






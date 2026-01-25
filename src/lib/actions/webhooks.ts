'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateWebhookSecret, sendTestWebhook } from '@/lib/webhooks/sender';
import { WebhookEventType } from '@/lib/webhooks/events';

// Webhook型定義
export interface Webhook {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  retry_count: number;
  timeout_ms: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  attempt: number;
  delivered_at: string | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface WebhookStats {
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  avg_duration_ms: number;
  last_delivery_at: string | null;
}

// Webhook一覧を取得
export async function getWebhooks(
  organizationId: string
): Promise<{ data: Webhook[] | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhooks:', error);
      return { data: null, error: 'Webhookの取得に失敗しました' };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching webhooks:', error);
    return { data: null, error: 'Webhookの取得中にエラーが発生しました' };
  }
}

// Webhook詳細を取得
export async function getWebhook(
  webhookId: string
): Promise<{ data: Webhook | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (error) {
      console.error('Error fetching webhook:', error);
      return { data: null, error: 'Webhookの取得に失敗しました' };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching webhook:', error);
    return { data: null, error: 'Webhookの取得中にエラーが発生しました' };
  }
}

// Webhookを作成
export async function createWebhook(
  organizationId: string,
  input: {
    name: string;
    url: string;
    events: WebhookEventType[];
    retry_count?: number;
    timeout_ms?: number;
  }
): Promise<{ data: Webhook | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // シークレットを自動生成
    const secret = generateWebhookSecret();

    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        organization_id: organizationId,
        name: input.name,
        url: input.url,
        secret,
        events: input.events,
        retry_count: input.retry_count || 3,
        timeout_ms: input.timeout_ms || 30000,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating webhook:', error);
      return { data: null, error: 'Webhookの作成に失敗しました' };
    }

    revalidatePath('/settings/webhooks');
    return { data, error: null };
  } catch (error) {
    console.error('Exception creating webhook:', error);
    return { data: null, error: 'Webhookの作成中にエラーが発生しました' };
  }
}

// Webhookを更新
export async function updateWebhook(
  webhookId: string,
  input: {
    name?: string;
    url?: string;
    events?: WebhookEventType[];
    is_active?: boolean;
    retry_count?: number;
    timeout_ms?: number;
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('webhooks')
      .update(input)
      .eq('id', webhookId);

    if (error) {
      console.error('Error updating webhook:', error);
      return { success: false, error: 'Webhookの更新に失敗しました' };
    }

    revalidatePath('/settings/webhooks');
    return { success: true, error: null };
  } catch (error) {
    console.error('Exception updating webhook:', error);
    return { success: false, error: 'Webhookの更新中にエラーが発生しました' };
  }
}

// Webhookを削除
export async function deleteWebhook(
  webhookId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId);

    if (error) {
      console.error('Error deleting webhook:', error);
      return { success: false, error: 'Webhookの削除に失敗しました' };
    }

    revalidatePath('/settings/webhooks');
    return { success: true, error: null };
  } catch (error) {
    console.error('Exception deleting webhook:', error);
    return { success: false, error: 'Webhookの削除中にエラーが発生しました' };
  }
}

// シークレットを再生成
export async function regenerateWebhookSecret(
  webhookId: string
): Promise<{ data: { secret: string } | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const newSecret = generateWebhookSecret();

    const { error } = await supabase
      .from('webhooks')
      .update({ secret: newSecret })
      .eq('id', webhookId);

    if (error) {
      console.error('Error regenerating secret:', error);
      return { data: null, error: 'シークレットの再生成に失敗しました' };
    }

    revalidatePath('/settings/webhooks');
    return { data: { secret: newSecret }, error: null };
  } catch (error) {
    console.error('Exception regenerating secret:', error);
    return { data: null, error: 'シークレットの再生成中にエラーが発生しました' };
  }
}

// テストWebhookを送信
export async function testWebhook(
  webhookId: string
): Promise<{ success: boolean; message: string }> {
  return await sendTestWebhook(webhookId);
}

// 配信履歴を取得
export async function getWebhookDeliveries(
  webhookId: string,
  limit: number = 50
): Promise<{ data: WebhookDelivery[] | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching deliveries:', error);
      return { data: null, error: '配信履歴の取得に失敗しました' };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching deliveries:', error);
    return { data: null, error: '配信履歴の取得中にエラーが発生しました' };
  }
}

// Webhook統計を取得
export async function getWebhookStats(
  webhookId: string
): Promise<{ data: WebhookStats | null; error: string | null }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .rpc('get_webhook_stats', { webhook_uuid: webhookId });

    if (error) {
      console.error('Error fetching stats:', error);
      return { data: null, error: '統計情報の取得に失敗しました' };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching stats:', error);
    return { data: null, error: '統計情報の取得中にエラーが発生しました' };
  }
}

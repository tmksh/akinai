import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { WebhookPayload, WebhookEventType } from './events';

// Supabaseクライアントを作成
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Webhook署名を生成
function generateSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

// Webhook配信結果
interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  durationMs: number;
}

// 単一のWebhookを配信
async function deliverWebhook(
  url: string,
  payload: string,
  secret: string,
  timeoutMs: number
): Promise<DeliveryResult> {
  const startTime = Date.now();

  try {
    const signature = generateSignature(payload, secret);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'User-Agent': 'Akinai-Webhook/1.0',
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text();
    const durationMs = Date.now() - startTime;

    return {
      success: response.ok,
      statusCode: response.status,
      responseBody: responseBody.substring(0, 1000), // 最大1000文字
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          errorMessage: `Timeout after ${timeoutMs}ms`,
          durationMs,
        };
      }
      return {
        success: false,
        errorMessage: error.message,
        durationMs,
      };
    }

    return {
      success: false,
      errorMessage: 'Unknown error',
      durationMs,
    };
  }
}

// 配信履歴を記録
async function logDelivery(
  webhookId: string,
  eventType: string,
  payload: unknown,
  result: DeliveryResult,
  attempt: number
): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhookId,
      event_type: eventType,
      payload: payload,
      response_status: result.statusCode,
      response_body: result.responseBody,
      attempt,
      delivered_at: result.success ? new Date().toISOString() : null,
      error_message: result.errorMessage,
      duration_ms: result.durationMs,
    });
  } catch (error) {
    console.error('Failed to log webhook delivery:', error);
  }
}

// リトライ付きでWebhookを配信
async function deliverWithRetry(
  webhookId: string,
  url: string,
  secret: string,
  eventType: string,
  payload: unknown,
  maxRetries: number,
  timeoutMs: number
): Promise<boolean> {
  const payloadStr = JSON.stringify(payload);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await deliverWebhook(url, payloadStr, secret, timeoutMs);

    await logDelivery(webhookId, eventType, payload, result, attempt);

    if (result.success) {
      return true;
    }

    // 最後の試行でなければ待機してリトライ
    if (attempt < maxRetries) {
      // 指数バックオフ: 1秒, 2秒, 4秒...
      const waitMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  return false;
}

/**
 * Webhookイベントを発火
 * 組織内のアクティブなWebhookすべてに配信
 */
export async function triggerWebhook<T>(
  organizationId: string,
  eventType: WebhookEventType,
  data: T
): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    // アクティブなWebhookを取得
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .contains('events', [eventType]);

    if (error) {
      console.error('Error fetching webhooks:', error);
      return;
    }

    if (!webhooks || webhooks.length === 0) {
      return; // 対象Webhookなし
    }

    // ペイロードを構築
    const payload: WebhookPayload<T> = {
      id: crypto.randomUUID(),
      event: eventType,
      created_at: new Date().toISOString(),
      organization_id: organizationId,
      data,
    };

    // すべてのWebhookに非同期で配信
    const deliveryPromises = webhooks.map((webhook) =>
      deliverWithRetry(
        webhook.id,
        webhook.url,
        webhook.secret,
        eventType,
        payload,
        webhook.retry_count || 3,
        webhook.timeout_ms || 30000
      )
    );

    // 配信を待たずに完了（非同期バックグラウンド処理）
    Promise.allSettled(deliveryPromises).catch((err) =>
      console.error('Webhook delivery error:', err)
    );
  } catch (error) {
    console.error('Error triggering webhook:', error);
  }
}

/**
 * テストWebhookを送信
 */
export async function sendTestWebhook(
  webhookId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabaseClient();

    // Webhook情報を取得
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (error || !webhook) {
      return { success: false, message: 'Webhook not found' };
    }

    // テストペイロードを構築
    const testPayload: WebhookPayload<{ message: string }> = {
      id: crypto.randomUUID(),
      event: 'test' as WebhookEventType,
      created_at: new Date().toISOString(),
      organization_id: webhook.organization_id,
      data: {
        message: 'This is a test webhook from Akinai',
      },
    };

    const result = await deliverWebhook(
      webhook.url,
      JSON.stringify(testPayload),
      webhook.secret,
      webhook.timeout_ms || 30000
    );

    // テスト配信も履歴に記録
    await logDelivery(webhookId, 'test', testPayload, result, 1);

    if (result.success) {
      return { success: true, message: `Webhook delivered successfully (${result.statusCode})` };
    } else {
      return {
        success: false,
        message: result.errorMessage || `Failed with status ${result.statusCode}`,
      };
    }
  } catch (error) {
    console.error('Test webhook error:', error);
    return { success: false, message: 'Internal error' };
  }
}

/**
 * Webhookシークレットを生成
 */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

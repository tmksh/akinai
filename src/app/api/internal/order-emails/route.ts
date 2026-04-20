import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOrderEmails } from '@/lib/order-emails';

/**
 * POST /api/internal/order-emails
 *
 * 注文確認・通知メールを送信する内部エンドポイント。
 * INTERNAL_API_SECRET ヘッダーで保護されており、外部からは呼び出せない。
 * eiwanext など別サーバーからメール送信をトリガーするために使用する。
 */
export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET;

  if (!secret) {
    console.error('[internal/order-emails] INTERNAL_API_SECRET is not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const auth = request.headers.get('Authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { orderId: string; organizationId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await sendOrderEmails(supabase, body.orderId, body.organizationId ?? null);

  return NextResponse.json({ success: true });
}

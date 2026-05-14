/**
 * GET /api/v1/newsletters/unsubscribe?token=xxx
 *
 * メルマガ配信停止エンドポイント。
 * token は送信時に HMAC-SHA256 で署名されたワンクリック解除トークン。
 * 成功した場合、顧客の custom_fields.newsletter_unsubscribed を true にセットする。
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'crypto';

function getSecret(): string {
  return process.env.UNSUBSCRIBE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

/** トークンを検証し { organizationId, customerId } を返す。無効なら null。 */
function verifyToken(token: string): { organizationId: string; customerId: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expected = createHmac('sha256', getSecret()).update(payload).digest('base64url');
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const [organizationId, customerId] = decoded.split(':');
    if (!organizationId || !customerId) return null;
    return { organizationId, customerId };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse('トークンが指定されていません。', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const parsed = verifyToken(token);
  if (!parsed) {
    return new NextResponse('無効なトークンです。', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const { organizationId, customerId } = parsed;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 顧客の custom_fields を取得
  const { data: customer, error: fetchErr } = await supabase
    .from('customers')
    .select('id, custom_fields')
    .eq('id', customerId)
    .eq('organization_id', organizationId)
    .single();

  if (fetchErr || !customer) {
    return new NextResponse('顧客が見つかりません。', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const currentCf = (customer.custom_fields as Record<string, unknown>) || {};

  // すでに配信停止済みの場合もそのまま成功扱い
  const { error: updateErr } = await supabase
    .from('customers')
    .update({ custom_fields: { ...currentCf, newsletter_unsubscribed: true } })
    .eq('id', customerId)
    .eq('organization_id', organizationId);

  if (updateErr) {
    return new NextResponse('配信停止処理に失敗しました。しばらくしてから再度お試しください。', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // シンプルな完了ページを返す
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>メルマガ配信停止</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .card { background: #fff; border-radius: 16px; padding: 40px 48px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 420px; }
    h1 { font-size: 1.25rem; color: #1e293b; margin: 16px 0 8px; }
    p { color: #64748b; font-size: 0.9rem; line-height: 1.6; margin: 0; }
    .icon { font-size: 2.5rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>配信停止が完了しました</h1>
    <p>メルマガの配信を停止しました。<br>今後このメールアドレスへのメルマガ配信は行われません。</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

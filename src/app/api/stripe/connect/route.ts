import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/stripe/connect
 * Stripe Connect OAuth フローを開始する
 * 店舗オーナーをStripeの認証ページにリダイレクト
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.redirect(new URL('/login?redirect=/settings/payments', request.url));
    }

    // ユーザーの組織を取得
    const { data: member, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.redirect(new URL('/settings/payments?error=no_organization', request.url));
    }

    // 管理者権限チェック
    if (member.role !== 'owner' && member.role !== 'admin') {
      return NextResponse.redirect(new URL('/settings/payments?error=unauthorized', request.url));
    }

    // 環境変数チェック
    const stripeClientId = process.env.STRIPE_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!stripeClientId) {
      console.error('STRIPE_CLIENT_ID is not set');
      return NextResponse.redirect(new URL('/settings/payments?error=config_error', request.url));
    }

    // Stripe Connect OAuth URL を構築
    const state = Buffer.from(JSON.stringify({
      organizationId: member.organization_id,
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64');

    const params = new URLSearchParams();
    params.append('response_type', 'code');
    params.append('client_id', stripeClientId);
    params.append('scope', 'read_write');
    params.append('redirect_uri', `${appUrl}/api/stripe/callback`);
    params.append('state', state);
    // 推奨: Express アカウントを使用（簡単なオンボーディング）
    params.append('stripe_user[business_type]', 'company');
    params.append('suggested_capabilities[]', 'card_payments');
    params.append('suggested_capabilities[]', 'transfers');

    const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    return NextResponse.redirect(stripeConnectUrl);
  } catch (error) {
    console.error('Stripe Connect error:', error);
    return NextResponse.redirect(new URL('/settings/payments?error=unknown', request.url));
  }
}


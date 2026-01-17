import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * GET /api/stripe/callback
 * Stripe Connect OAuth コールバック
 * Stripeから認証コードを受け取り、アカウントIDを保存
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // エラーハンドリング
  if (error) {
    console.error('Stripe Connect OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/settings/payments?error=stripe_denied&message=${encodeURIComponent(errorDescription || '')}`, appUrl)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings/payments?error=missing_params', appUrl));
  }

  try {
    // State をデコード
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    const { organizationId, userId, timestamp } = stateData;

    // タイムスタンプチェック（15分以内）
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(new URL('/settings/payments?error=expired', appUrl));
    }

    // Supabase クライアント
    const supabase = await createClient();

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) {
      return NextResponse.redirect(new URL('/settings/payments?error=auth_mismatch', appUrl));
    }

    // Stripe API キー確認
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY is not set');
      return NextResponse.redirect(new URL('/settings/payments?error=config_error', appUrl));
    }

    // Stripe SDK 初期化
    const stripe = new Stripe(stripeSecretKey);

    // 認証コードをアクセストークンに交換
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code,
    });

    const stripeAccountId = response.stripe_user_id;

    if (!stripeAccountId) {
      console.error('No stripe_user_id in response');
      return NextResponse.redirect(new URL('/settings/payments?error=no_account', appUrl));
    }

    // アカウント情報を取得してオンボーディング状態を確認
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const isOnboardingComplete = account.charges_enabled && account.payouts_enabled;

    // データベースに保存
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        stripe_account_id: stripeAccountId,
        stripe_account_status: isOnboardingComplete ? 'active' : 'pending',
        stripe_onboarding_complete: isOnboardingComplete,
      })
      .eq('id', organizationId);

    if (updateError) {
      console.error('Failed to update organization:', updateError);
      return NextResponse.redirect(new URL('/settings/payments?error=db_error', appUrl));
    }

    // オンボーディングが完了していない場合は Stripe のオンボーディングページへ
    if (!isOnboardingComplete) {
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${appUrl}/api/stripe/connect`,
        return_url: `${appUrl}/settings/payments?stripe=connected`,
        type: 'account_onboarding',
      });
      return NextResponse.redirect(accountLink.url);
    }

    // 成功
    return NextResponse.redirect(new URL('/settings/payments?stripe=connected', appUrl));
  } catch (err) {
    console.error('Stripe callback error:', err);
    return NextResponse.redirect(new URL('/settings/payments?error=callback_failed', appUrl));
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * GET /api/stripe/callback
 * Stripe Connect オンボーディング完了後のコールバック
 * アカウントの状態を確認してDBを更新
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY is not set');
      return NextResponse.redirect(new URL('/settings/payments?error=config_error', appUrl));
    }

    const supabase = await createClient();

    // ユーザー認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.redirect(new URL('/login?redirect=/settings/payments', appUrl));
    }

    // ユーザーの組織を取得
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.redirect(new URL('/settings/payments?error=no_organization', appUrl));
    }

    // 組織のStripeアカウントIDを取得
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_account_id')
      .eq('id', member.organization_id)
      .single();

    if (!org?.stripe_account_id) {
      return NextResponse.redirect(new URL('/settings/payments?error=no_account', appUrl));
    }

    // Stripeアカウントの状態を確認
    const stripe = new Stripe(stripeSecretKey);
    const account = await stripe.accounts.retrieve(org.stripe_account_id);
    const isOnboardingComplete = account.charges_enabled && account.payouts_enabled;

    // DBを更新
    await supabase
      .from('organizations')
      .update({
        stripe_account_status: isOnboardingComplete ? 'active' : 'pending',
        stripe_onboarding_complete: isOnboardingComplete,
      })
      .eq('id', member.organization_id);

    return NextResponse.redirect(new URL('/settings/payments?stripe=connected', appUrl));
  } catch (err) {
    console.error('Stripe callback error:', err);
    return NextResponse.redirect(new URL('/settings/payments?error=callback_failed', appUrl));
  }
}

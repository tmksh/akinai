import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * GET /api/stripe/callback?mode=live
 * GET /api/stripe/callback?mode=test
 *
 * Stripe Connect オンボーディング完了後のコールバック。
 * mode パラメータでテスト/本番を判定し、対応するカラムを更新する。
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const isTestMode = request.nextUrl.searchParams.get('mode') === 'test';

  try {
    const stripeSecretKey = isTestMode
      ? process.env.STRIPE_TEST_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey) {
      const keyName = isTestMode ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_SECRET_KEY';
      console.error(`${keyName} is not set`);
      return NextResponse.redirect(new URL('/settings/payments?error=config_error', appUrl));
    }

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.redirect(new URL('/login?redirect=/settings/payments', appUrl));
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.redirect(new URL('/settings/payments?error=no_organization', appUrl));
    }

    const accountIdColumn = isTestMode ? 'stripe_test_account_id' : 'stripe_account_id';
    const { data: org } = await supabase
      .from('organizations')
      .select(`${accountIdColumn}`)
      .eq('id', member.organization_id)
      .single();

    const stripeAccountId = org?.[accountIdColumn as keyof typeof org] as string | null | undefined;
    if (!stripeAccountId) {
      return NextResponse.redirect(new URL('/settings/payments?error=no_account', appUrl));
    }

    const stripe = new Stripe(stripeSecretKey);
    const account = await stripe.accounts.retrieve(stripeAccountId);
    const isOnboardingComplete = account.charges_enabled && account.payouts_enabled;

    const updatePayload = isTestMode
      ? { stripe_test_account_status: isOnboardingComplete ? 'active' : 'pending', stripe_test_onboarding_complete: isOnboardingComplete }
      : { stripe_account_status: isOnboardingComplete ? 'active' : 'pending', stripe_onboarding_complete: isOnboardingComplete };

    await supabase
      .from('organizations')
      .update(updatePayload)
      .eq('id', member.organization_id);

    return NextResponse.redirect(new URL('/settings/payments?stripe=connected', appUrl));
  } catch (err) {
    console.error('Stripe callback error:', err);
    return NextResponse.redirect(new URL('/settings/payments?error=callback_failed', appUrl));
  }
}

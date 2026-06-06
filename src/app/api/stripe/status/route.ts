import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * GET /api/stripe/status
 * Stripe Connect の接続状態を取得（テスト/本番の両方）
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select(`
        stripe_account_id,
        stripe_account_status,
        stripe_onboarding_complete,
        stripe_test_mode,
        stripe_test_account_id,
        stripe_test_account_status,
        stripe_test_onboarding_complete
      `)
      .eq('id', member.organization_id)
      .single();

    if (!org) {
      return NextResponse.json({
        connected: false,
        status: 'not_connected',
        onboardingComplete: false,
        testMode: false,
      });
    }

    const isTestMode = !!org.stripe_test_mode;
    const activeAccountId = isTestMode ? org.stripe_test_account_id : org.stripe_account_id;
    const secretKey = isTestMode
      ? process.env.STRIPE_TEST_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY;

    // アクティブなアカウントの最新状態を Stripe から取得
    if (secretKey && activeAccountId) {
      try {
        const stripe = new Stripe(secretKey);
        const account = await stripe.accounts.retrieve(activeAccountId);
        const isActive = account.charges_enabled && account.payouts_enabled;

        const updatePayload = isTestMode
          ? { stripe_test_account_status: isActive ? 'active' : 'pending', stripe_test_onboarding_complete: isActive }
          : { stripe_account_status: isActive ? 'active' : 'pending', stripe_onboarding_complete: isActive };

        const currentComplete = isTestMode ? org.stripe_test_onboarding_complete : org.stripe_onboarding_complete;
        if (isActive !== currentComplete) {
          await supabase
            .from('organizations')
            .update(updatePayload)
            .eq('id', member.organization_id);
        }

        return NextResponse.json({
          connected: true,
          status: isActive ? 'active' : 'pending',
          onboardingComplete: isActive,
          accountId: activeAccountId,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          testMode: isTestMode,
          // テスト連携の有無も返す（UI参照用）
          testAccountId: org.stripe_test_account_id,
          testOnboardingComplete: isActive && isTestMode
            ? true
            : org.stripe_test_onboarding_complete,
        });
      } catch (stripeError) {
        console.error('Stripe API error:', stripeError);
      }
    }

    const currentStatus = isTestMode ? org.stripe_test_account_status : org.stripe_account_status;
    const currentComplete = isTestMode ? org.stripe_test_onboarding_complete : org.stripe_onboarding_complete;

    return NextResponse.json({
      connected: !!activeAccountId,
      status: currentStatus || (activeAccountId ? 'pending' : 'not_connected'),
      onboardingComplete: currentComplete,
      accountId: activeAccountId,
      testMode: isTestMode,
      testAccountId: org.stripe_test_account_id,
      testOnboardingComplete: org.stripe_test_onboarding_complete,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * PATCH /api/stripe/status
 * テスト/本番モードを切り替える
 * Body: { testMode: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    if (member.role !== 'owner' && member.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: { testMode?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (typeof body.testMode !== 'boolean') {
      return NextResponse.json({ error: 'testMode (boolean) is required' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ stripe_test_mode: body.testMode })
      .eq('id', member.organization_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update mode' }, { status: 500 });
    }

    return NextResponse.json({ success: true, testMode: body.testMode });
  } catch (error) {
    console.error('Mode toggle error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/stripe/status
 * DELETE /api/stripe/status?test=1  ← テスト連携のみ解除
 *
 * Stripe Connect の接続を解除（DBのみ。Stripe側アカウントは削除しない）
 */
export async function DELETE(request: NextRequest) {
  const isTestMode = request.nextUrl.searchParams.get('test') === '1';

  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    if (member.role !== 'owner' && member.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatePayload = isTestMode
      ? { stripe_test_account_id: null, stripe_test_account_status: 'not_connected', stripe_test_onboarding_complete: false }
      : { stripe_account_id: null, stripe_account_status: 'not_connected', stripe_onboarding_complete: false };

    const { error: updateError } = await supabase
      .from('organizations')
      .update(updatePayload)
      .eq('id', member.organization_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

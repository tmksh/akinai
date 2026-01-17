import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * GET /api/stripe/status
 * Stripe Connect の接続状態を取得
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーの組織を取得
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    // 組織のStripe情報を取得
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_account_id, stripe_account_status, stripe_onboarding_complete')
      .eq('id', member.organization_id)
      .single();

    if (!org || !org.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        status: 'not_connected',
        onboardingComplete: false,
      });
    }

    // Stripe からアカウント情報を取得して最新状態を確認
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey && org.stripe_account_id) {
      try {
        const stripe = new Stripe(stripeSecretKey);
        
        const account = await stripe.accounts.retrieve(org.stripe_account_id);
        const isActive = account.charges_enabled && account.payouts_enabled;
        
        // DBを更新
        if (isActive !== org.stripe_onboarding_complete) {
          await supabase
            .from('organizations')
            .update({
              stripe_account_status: isActive ? 'active' : 'pending',
              stripe_onboarding_complete: isActive,
            })
            .eq('id', member.organization_id);
        }

        return NextResponse.json({
          connected: true,
          status: isActive ? 'active' : 'pending',
          onboardingComplete: isActive,
          accountId: org.stripe_account_id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        });
      } catch (stripeError) {
        console.error('Stripe API error:', stripeError);
      }
    }

    return NextResponse.json({
      connected: true,
      status: org.stripe_account_status,
      onboardingComplete: org.stripe_onboarding_complete,
      accountId: org.stripe_account_id,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/stripe/status
 * Stripe Connect の接続を解除
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ユーザーの組織を取得
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    // 管理者権限チェック
    if (member.role !== 'owner' && member.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Stripe接続情報をクリア
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        stripe_account_id: null,
        stripe_account_status: 'not_connected',
        stripe_onboarding_complete: false,
      })
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


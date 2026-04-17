import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

/**
 * GET /api/stripe/connect
 * Stripe Connect Account Links フローを開始する
 * Expressアカウントを作成してオンボーディングURLにリダイレクト
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
      console.error('Member not found:', memberError);
      return NextResponse.redirect(new URL('/settings/payments?error=no_organization', request.url));
    }

    // 管理者権限チェック
    if (member.role !== 'owner' && member.role !== 'admin') {
      return NextResponse.redirect(new URL('/settings/payments?error=unauthorized', request.url));
    }

    // 環境変数チェック
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY is not set');
      return NextResponse.redirect(new URL('/settings/payments?error=config_error', request.url));
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    console.log('appUrl:', appUrl);

    let stripe: Stripe;
    try {
      stripe = new Stripe(stripeSecretKey);
    } catch (e) {
      console.error('Stripe init error:', e);
      return NextResponse.redirect(new URL('/settings/payments?error=stripe_init', request.url));
    }

    // 既存のStripeアカウントIDを確認
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_account_id')
      .eq('id', member.organization_id)
      .single();

    if (orgError) {
      console.error('Org fetch error:', orgError);
      return NextResponse.redirect(new URL('/settings/payments?error=db_error', request.url));
    }

    let stripeAccountId = org?.stripe_account_id;

    // アカウントがなければ新規作成
    if (!stripeAccountId) {
      try {
        const account = await stripe.accounts.create({
          type: 'express',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });
        stripeAccountId = account.id;
        console.log('Created new stripe account:', stripeAccountId);
      } catch (e) {
        console.error('Account create error:', e);
        return NextResponse.redirect(new URL('/settings/payments?error=account_create', request.url));
      }

      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          stripe_account_id: stripeAccountId,
          stripe_account_status: 'pending',
          stripe_onboarding_complete: false,
        })
        .eq('id', member.organization_id);

      if (updateError) {
        console.error('Failed to save stripe account:', updateError);
        return NextResponse.redirect(new URL('/settings/payments?error=db_error', request.url));
      }
    }

    // Account Link でオンボーディングURLを生成
    let accountLink;
    try {
      accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${appUrl}/api/stripe/connect`,
        return_url: `${appUrl}/api/stripe/callback`,
        type: 'account_onboarding',
      });
    } catch (linkError) {
      console.error('Account link creation failed, resetting:', linkError);
      await supabase
        .from('organizations')
        .update({
          stripe_account_id: null,
          stripe_account_status: 'not_connected',
          stripe_onboarding_complete: false,
        })
        .eq('id', member.organization_id);

      try {
        const newAccount = await stripe.accounts.create({
          type: 'express',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });

        await supabase
          .from('organizations')
          .update({
            stripe_account_id: newAccount.id,
            stripe_account_status: 'pending',
            stripe_onboarding_complete: false,
          })
          .eq('id', member.organization_id);

        accountLink = await stripe.accountLinks.create({
          account: newAccount.id,
          refresh_url: `${appUrl}/api/stripe/connect`,
          return_url: `${appUrl}/api/stripe/callback`,
          type: 'account_onboarding',
        });
      } catch (retryError) {
        console.error('Retry failed:', retryError);
        return NextResponse.redirect(new URL('/settings/payments?error=account_link', request.url));
      }
    }

    return NextResponse.redirect(accountLink.url);
  } catch (error) {
    console.error('Stripe Connect unexpected error:', error);
    return NextResponse.redirect(new URL('/settings/payments?error=unknown', request.url));
  }
}

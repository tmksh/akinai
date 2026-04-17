import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const PLAN_PRICE_MAP: Record<string, string | undefined> = {
  light: process.env.STRIPE_PRICE_LIGHT,
  standard: process.env.STRIPE_PRICE_STANDARD,
};

/**
 * POST /api/stripe/subscription
 * サブスクリプションの Checkout Session を作成
 */
export async function POST(request: NextRequest) {
  try {
    const { plan } = await request.json();

    if (!plan || !PLAN_PRICE_MAP[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const priceId = PLAN_PRICE_MAP[plan];
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 500 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id, email, name')
      .eq('id', member.organization_id)
      .single();

    const stripe = new Stripe(stripeSecretKey);

    // Stripe Customer を取得 or 作成
    let customerId = org?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: org?.email || user.email,
        name: org?.name,
        metadata: { organization_id: member.organization_id },
      });
      customerId = customer.id;

      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', member.organization_id);
    }

    // Checkout Session を作成（1ヶ月無料トライアル付き）
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 30,
        metadata: { organization_id: member.organization_id, plan },
      },
      success_url: `${appUrl}/settings/billing?subscription=success`,
      cancel_url: `${appUrl}/settings/billing?subscription=canceled`,
      metadata: { organization_id: member.organization_id, plan },
    });

    // Checkout Session ID を保存
    await supabase
      .from('organizations')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', member.organization_id);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * GET /api/stripe/subscription
 * サブスクリプション状態を取得
 */
export async function GET() {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
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
      .select('plan, subscription_status, trial_ends_at, subscription_current_period_end, stripe_subscription_id, stripe_customer_id')
      .eq('id', member.organization_id)
      .single();

    // Stripe から最新状態を同期
    if (stripeSecretKey && org?.stripe_subscription_id) {
      try {
        const stripe = new Stripe(stripeSecretKey);
        const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);

        const updatedData = {
          subscription_status: subscription.status,
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        };

        await supabase
          .from('organizations')
          .update(updatedData)
          .eq('id', member.organization_id);

        return NextResponse.json({ ...org, ...updatedData });
      } catch {
        // Stripe APIエラーは無視してDBの値を返す
      }
    }

    return NextResponse.json(org);
  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * DELETE /api/stripe/subscription
 * サブスクリプションをキャンセル（期間終了時に解約）
 */
export async function DELETE() {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

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

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_subscription_id')
      .eq('id', member.organization_id)
      .single();

    if (!org?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No subscription' }, { status: 404 });
    }

    const stripe = new Stripe(stripeSecretKey);
    await stripe.subscriptions.update(org.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

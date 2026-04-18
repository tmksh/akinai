import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/stripe/test-force-connect
 * 開発・テスト用: Stripeオンボーディングをスキップして連携完了状態にする
 * 本番環境では使用不可
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'No organization' }, { status: 400 });
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_account_id')
    .eq('id', member.organization_id)
    .single();

  if (!org?.stripe_account_id) {
    return NextResponse.json({ error: 'No stripe account connected yet. Please start the connect flow first.' }, { status: 400 });
  }

  await supabase
    .from('organizations')
    .update({
      stripe_account_status: 'active',
      stripe_onboarding_complete: true,
    })
    .eq('id', member.organization_id);

  return NextResponse.json({
    success: true,
    message: 'Stripe connection forced to active (test mode only)',
    stripe_account_id: org.stripe_account_id,
  });
}

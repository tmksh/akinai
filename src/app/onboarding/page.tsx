import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OnboardingClient from './onboarding-client';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('current_organization_id')
    .eq('id', user.id)
    .single();

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1);

  // すでに組織に所属している場合はダッシュボードへ
  if (memberships && memberships.length > 0 && userData?.current_organization_id) {
    redirect('/dashboard');
  }

  return <OnboardingClient />;
}

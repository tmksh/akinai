import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/actions/dashboard';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // ユーザーと組織情報を取得
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // ユーザーの現在の組織を取得
  const { data: userData } = await supabase
    .from('users')
    .select('current_organization_id')
    .eq('id', user.id)
    .single();
  
  const organizationId = userData?.current_organization_id;

  // 組織がない場合はオンボーディングへ
  if (!organizationId) {
    redirect('/onboarding');
  }

  // ダッシュボードデータを取得
  const dashboardData = await getDashboardData(organizationId);
  
  return <DashboardClient initialData={dashboardData} organizationId={organizationId} />;
}

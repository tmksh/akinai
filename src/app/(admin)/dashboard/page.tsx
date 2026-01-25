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
  
  if (!organizationId) {
    // 組織がない場合はデフォルトデータを表示
    const emptyData = {
      revenue: {
        month: { total: 0, change: 0 },
        year: { total: 0, change: 0 },
        total: { total: 0, change: 0 },
      },
      orders: {
        month: { total: 0, change: 0 },
        year: { total: 0, change: 0 },
        total: { total: 0, change: 0 },
      },
      customers: {
        month: { total: 0, change: 0 },
        year: { total: 0, change: 0 },
        total: { total: 0, change: 0 },
      },
      products: { total: 0, newThisMonth: 0 },
      recentOrders: [],
      topProducts: [],
      lowStockItems: [],
      monthlySales: [],
      performance: {
        salesTarget: 0,
        salesActual: 0,
        salesAchievement: 0,
        ordersTarget: 0,
        ordersActual: 0,
        ordersAchievement: 0,
        customersTarget: 0,
        customersActual: 0,
        customersAchievement: 0,
        growthRate: 0,
        avgAchievement: 0,
        grade: '-',
      },
    };
    
    return <DashboardClient initialData={emptyData} organizationId="" />;
  }
  
  // ダッシュボードデータを取得
  const dashboardData = await getDashboardData(organizationId);
  
  return <DashboardClient initialData={dashboardData} organizationId={organizationId} />;
}

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getDashboardData } from '@/lib/actions/dashboard';
import { ensureDefaultOrganization } from '@/lib/actions/onboarding';
import DashboardClient from './dashboard-client';
import { Loader2 } from 'lucide-react';

// エラー時のフォールバックデータ
const fallbackData = {
  revenue: { month: { total: 0, change: 0 }, year: { total: 0, change: 0 }, total: { total: 0, change: 0 } },
  orders: { month: { total: 0, change: 0 }, year: { total: 0, change: 0 }, total: { total: 0, change: 0 } },
  customers: { month: { total: 0, change: 0 }, year: { total: 0, change: 0 }, total: { total: 0, change: 0 } },
  products: { total: 0, newThisMonth: 0 },
  recentOrders: [] as never[],
  topProducts: [] as never[],
  lowStockItems: [] as never[],
  monthlySales: [] as never[],
  performance: {
    salesTarget: 0, salesActual: 0, salesAchievement: 0,
    ordersTarget: 0, ordersActual: 0, ordersAchievement: 0,
    customersTarget: 0, customersActual: 0, customersAchievement: 0,
    growthRate: 0, avgAchievement: 0, grade: 'D',
  },
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ダッシュボード</h1>
        <p className="text-sm text-slate-500">ショップの概要を読み込み中...</p>
      </div>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    </div>
  );
}

async function DashboardContent({ organizationId }: { organizationId: string }) {
  let dashboardData;
  try {
    dashboardData = await getDashboardData(organizationId);
  } catch (err) {
    console.error('[Dashboard] getDashboardData failed:', err);
    dashboardData = fallbackData;
  }

  return <DashboardClient initialData={dashboardData} organizationId={organizationId} />;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: userData } = await supabase
    .from('users')
    .select('current_organization_id')
    .eq('id', user.id)
    .single();

  let organizationId = userData?.current_organization_id;

  if (!organizationId) {
    const { data } = await ensureDefaultOrganization();
    organizationId = data?.organizationId ?? null;
    if (!organizationId) {
      redirect('/onboarding');
    }
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent organizationId={organizationId} />
    </Suspense>
  );
}

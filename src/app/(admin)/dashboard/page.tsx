'use client';

import { useEffect, useState } from 'react';
import { useOrganization } from '@/components/providers/organization-provider';
import { getDashboardData } from '@/lib/actions/dashboard';
import DashboardClient from './dashboard-client';
import { Loader2 } from 'lucide-react';

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

export default function DashboardPage() {
  const { organization } = useOrganization();
  const [data, setData] = useState<typeof fallbackData | null>(null);

  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;
    getDashboardData(organization.id)
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(fallbackData); });
    return () => { cancelled = true; };
  }, [organization?.id]);

  if (!data) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">ダッシュボード</h1>
          <p className="text-xs sm:text-sm text-slate-500">ショップの概要を読み込み中...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      </div>
    );
  }

  return <DashboardClient initialData={data} organizationId={organization?.id || ''} />;
}

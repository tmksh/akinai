'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { OrdersTabSkeleton } from './_components/tab-skeleton';

const OrdersTab = dynamic(
  () => import('./_components/orders-tab').then((mod) => ({ default: mod.OrdersTab })),
  { loading: () => <OrdersTabSkeleton /> }
);

export default function OrdersPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">注文管理</h1>
        <p className="text-sm text-muted-foreground">注文の確認と対応</p>
      </div>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.62)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.8)',
          boxShadow: '0 2px 24px rgba(100,120,160,0.08), inset 0 1px 0 rgba(255,255,255,0.95)',
        }}
      >
        <div className="p-5 sm:p-6">
          <Suspense fallback={<OrdersTabSkeleton />}>
            <OrdersTab />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

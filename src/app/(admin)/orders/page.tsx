'use client';

import { useState, Suspense, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import { ShoppingCart, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  OrdersTabSkeleton,
  QuotesTabSkeleton,
  CustomersTabSkeleton,
} from './_components/tab-skeleton';

// 動的インポートでコード分割
const OrdersTab = dynamic(
  () => import('./_components/orders-tab').then((mod) => ({ default: mod.OrdersTab })),
  { loading: () => <OrdersTabSkeleton /> }
);

const QuotesTab = dynamic(
  () => import('./_components/quotes-tab').then((mod) => ({ default: mod.QuotesTab })),
  { loading: () => <QuotesTabSkeleton /> }
);

const CustomersTab = dynamic(
  () => import('./_components/customers-tab').then((mod) => ({ default: mod.CustomersTab })),
  { loading: () => <CustomersTabSkeleton /> }
);

type TabType = 'orders' | 'quotes' | 'customers';

const tabs = [
  {
    id: 'orders' as const,
    label: '注文',
    icon: ShoppingCart,
    description: '注文の確認と対応',
  },
] as const;

// タブボタンをメモ化
const TabButton = memo(function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: (typeof tabs)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200',
        isActive
          ? 'bg-white/80 dark:bg-white/[0.12] text-sky-600 dark:text-sky-400 shadow-[0_1px_6px_rgba(100,120,160,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] border border-white/80 dark:border-white/[0.1]'
          : 'text-muted-foreground hover:text-foreground hover:bg-white/40 dark:hover:bg-white/[0.05]'
      )}
    >
      <Icon className={cn('h-4 w-4', isActive ? 'text-sky-500' : '')} />
      <span className="hidden xs:inline sm:inline">{tab.label}</span>
    </button>
  );
});

// タブコンテンツをメモ化
const TabContent = memo(function TabContent({ activeTab }: { activeTab: TabType }) {
  return (
    <div className="animate-in fade-in-0 duration-200">
      {activeTab === 'orders' && <OrdersTab />}
    </div>
  );
});

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<TabType>('orders');

  const handleTabChange = useCallback((tabId: TabType) => {
    setActiveTab(tabId);
  }, []);

  return (
    <div className="space-y-5">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">注文管理</h1>
        <p className="text-sm text-muted-foreground">
          注文・見積もり・お客様をまとめて管理できます
        </p>
      </div>

      {/* タブナビゲーション */}
      <div
        className="flex items-center gap-1 p-1 rounded-2xl w-full overflow-x-auto scrollbar-none"
        style={{
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.75)',
          boxShadow: '0 1px 4px rgba(100,120,160,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => handleTabChange(tab.id)}
          />
        ))}
      </div>

      {/* コンテンツ */}
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
          <Suspense
            fallback={
              activeTab === 'orders' ? (
                <OrdersTabSkeleton />
              ) : activeTab === 'quotes' ? (
                <QuotesTabSkeleton />
              ) : (
                <CustomersTabSkeleton />
              )
            }
          >
            <TabContent activeTab={activeTab} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, Suspense, useCallback, memo } from 'react';
import dynamic from 'next/dynamic';
import { ShoppingCart, FileText, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  {
    id: 'quotes' as const,
    label: '見積もり',
    icon: FileText,
    description: '見積書の作成と送付',
  },
  {
    id: 'customers' as const,
    label: 'お客様',
    icon: Users,
    description: 'お客様情報の確認',
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
        'flex-1 relative px-4 py-4 text-sm font-medium transition-colors',
        'hover:bg-muted/50',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive
          ? 'text-orange-600 dark:text-orange-400'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <div className="flex items-center justify-center gap-2">
        <Icon
          className={cn('h-4 w-4', isActive ? 'text-orange-500' : '')}
        />
        <span>{tab.label}</span>
      </div>
      <span className="hidden md:block text-xs font-normal text-muted-foreground mt-0.5">
        {tab.description}
      </span>
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-500" />
      )}
    </button>
  );
});

// タブコンテンツをメモ化
const TabContent = memo(function TabContent({ activeTab }: { activeTab: TabType }) {
  return (
    <div className="animate-in fade-in-0 duration-200">
      {activeTab === 'orders' && <OrdersTab />}
      {activeTab === 'quotes' && <QuotesTab />}
      {activeTab === 'customers' && <CustomersTab />}
    </div>
  );
});

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<TabType>('orders');

  const handleTabChange = useCallback((tabId: TabType) => {
    setActiveTab(tabId);
  }, []);

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">注文管理</h1>
        <p className="text-sm text-muted-foreground">
          注文・見積もり・お客様をまとめて管理できます
        </p>
      </div>

      {/* タブナビゲーション */}
      <Card className="overflow-hidden">
        <div className="border-b">
          <div className="flex">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
              />
            ))}
          </div>
        </div>

        <CardContent className="p-4 sm:p-6">
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
        </CardContent>
      </Card>
    </div>
  );
}

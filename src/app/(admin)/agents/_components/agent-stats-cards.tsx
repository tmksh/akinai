'use client';

import {
  Users,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Clock,
  XCircle,
} from 'lucide-react';

interface AgentStatsCardsProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    totalSales: number;
    totalCommission: number;
  };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

export function AgentStatsCards({ stats }: AgentStatsCardsProps) {
  const cards = [
    {
      label: '総代理店数',
      value: stats.total,
      suffix: '社',
      icon: Users,
      gradient: 'from-orange-50 via-orange-100/50 to-amber-50 dark:from-orange-950/40 dark:via-orange-900/30 dark:to-amber-950/40',
      border: 'border-orange-100 dark:border-orange-800/30',
      iconColor: 'text-orange-500',
      textColor: 'text-orange-700 dark:text-orange-300',
      valueColor: 'text-orange-900 dark:text-orange-100',
    },
    {
      label: 'アクティブ',
      value: stats.active,
      suffix: '社',
      icon: CheckCircle,
      gradient: 'from-orange-50/80 via-amber-50 to-orange-50 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-orange-950/30',
      border: 'border-orange-100/60 dark:border-orange-800/20',
      iconColor: 'text-orange-400',
      textColor: 'text-orange-600 dark:text-orange-300',
      valueColor: 'text-orange-800 dark:text-orange-100',
    },
    {
      label: '代理店経由売上',
      value: formatCurrency(stats.totalSales),
      icon: TrendingUp,
      gradient: 'from-amber-50 via-orange-50 to-amber-50/50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-amber-950/30',
      border: 'border-amber-100 dark:border-amber-800/20',
      iconColor: 'text-amber-500',
      textColor: 'text-amber-700 dark:text-amber-300',
      valueColor: 'text-amber-900 dark:text-amber-100',
      isLargeValue: true,
    },
    {
      label: '支払コミッション',
      value: formatCurrency(stats.totalCommission),
      icon: DollarSign,
      gradient: 'from-orange-500 via-orange-600 to-amber-600 dark:from-orange-600 dark:via-orange-500 dark:to-amber-500',
      border: 'border-orange-500 dark:border-orange-500',
      iconColor: 'text-white',
      textColor: 'text-white/90',
      valueColor: 'text-white',
      isHighlighted: true,
      isLargeValue: true,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${card.gradient} ${card.border} border shadow-sm hover:shadow-md transition-all duration-300`}
          >
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <div className={`p-1.5 sm:p-2 rounded-lg ${card.isHighlighted ? 'bg-white/30 dark:bg-slate-900/30' : 'bg-white/60 dark:bg-slate-800/60'}`}>
                <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${card.iconColor}`} />
              </div>
              <span className={`text-xs font-medium ${card.textColor}`}>{card.label}</span>
            </div>
            <p className={`${card.isLargeValue ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'} font-bold ${card.valueColor}`}>
              {card.value}
              {card.suffix && <span className="text-sm font-normal ml-1">{card.suffix}</span>}
            </p>
          </div>
        );
      })}
    </div>
  );
}

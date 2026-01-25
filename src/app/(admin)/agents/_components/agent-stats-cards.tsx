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
      gradient: 'from-emerald-50 via-emerald-100/50 to-green-50 dark:from-emerald-950/40 dark:via-emerald-900/30 dark:to-green-950/40',
      border: 'border-emerald-100 dark:border-emerald-800/30',
      iconColor: 'text-emerald-500',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      valueColor: 'text-emerald-900 dark:text-emerald-100',
    },
    {
      label: '代理店経由売上',
      value: formatCurrency(stats.totalSales),
      icon: TrendingUp,
      gradient: 'from-blue-50 via-blue-100/50 to-indigo-50 dark:from-blue-950/40 dark:via-blue-900/30 dark:to-indigo-950/40',
      border: 'border-blue-100 dark:border-blue-800/30',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-700 dark:text-blue-300',
      valueColor: 'text-blue-900 dark:text-blue-100',
      isLargeValue: true,
    },
    {
      label: '支払コミッション',
      value: formatCurrency(stats.totalCommission),
      icon: DollarSign,
      gradient: 'from-violet-400 via-purple-500 to-indigo-500 dark:from-violet-600 dark:via-purple-500 dark:to-indigo-600',
      border: 'border-violet-400 dark:border-violet-500',
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

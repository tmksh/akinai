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
      gradient: 'from-orange-500 to-amber-600',
      border: 'border-orange-400',
      iconColor: 'text-white',
      textColor: 'text-white/80',
      valueColor: 'text-white',
      isHighlighted: true,
    },
    {
      label: 'アクティブ',
      value: stats.active,
      suffix: '社',
      icon: CheckCircle,
      gradient: 'from-amber-400 to-yellow-500',
      border: 'border-amber-300',
      iconColor: 'text-white',
      textColor: 'text-white/80',
      valueColor: 'text-white',
      isHighlighted: true,
    },
    {
      label: '代理店経由売上',
      value: formatCurrency(stats.totalSales),
      icon: TrendingUp,
      gradient: 'from-orange-800 to-red-900',
      border: 'border-orange-700',
      iconColor: 'text-white',
      textColor: 'text-white/80',
      valueColor: 'text-white',
      isHighlighted: true,
      isLargeValue: true,
    },
    {
      label: '支払コミッション',
      value: formatCurrency(stats.totalCommission),
      icon: DollarSign,
      gradient: 'from-orange-300 to-amber-400',
      border: 'border-orange-200',
      iconColor: 'text-white',
      textColor: 'text-white/80',
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

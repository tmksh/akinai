'use client';

import {
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Percent,
  ShoppingCart,
  Copy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AgentDisplay } from '../types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AgentCardProps {
  agent: AgentDisplay;
  onView: (agent: AgentDisplay) => void;
}

const statusConfig = {
  active: {
    label: 'アクティブ',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/50',
    icon: CheckCircle,
    dotColor: 'bg-emerald-500',
  },
  inactive: {
    label: '停止中',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: XCircle,
    dotColor: 'bg-gray-400',
  },
  pending: {
    label: '審査中',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/50',
    icon: Clock,
    dotColor: 'bg-amber-500',
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export function AgentCard({
  agent,
  onView,
}: AgentCardProps) {
  const config = statusConfig[agent.status];
  const StatusIcon = config.icon;

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(agent.email);
    toast.success('メールアドレスをコピーしました');
  };

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(agent.phone);
    toast.success('電話番号をコピーしました');
  };

  return (
    <div 
      className="group relative bg-card border rounded-xl p-4 hover:shadow-lg transition-all duration-300 hover:border-orange-200 dark:hover:border-orange-800 cursor-pointer"
      onClick={() => onView(agent)}
    >
      {/* ステータスバッジ */}
      <div className="absolute top-3 right-3">
        <Badge className={cn('gap-1 font-medium', config.bgColor, config.color, 'border-0')}>
          <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
          {config.label}
        </Badge>
      </div>

      {/* ヘッダー: 会社名・担当者 */}
      <div className="flex items-start gap-3 mb-4 pr-20">
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold text-sm">
            {agent.company.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-base truncate">{agent.company}</h3>
          <p className="text-sm text-muted-foreground truncate">{agent.name}</p>
          <Badge variant="outline" className="mt-1 text-xs font-mono">
            {agent.code}
          </Badge>
        </div>
      </div>

      {/* 連絡先 */}
      <div className="space-y-2 mb-4 text-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopyEmail}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-full text-left group/item"
            >
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate flex-1">{agent.email}</span>
              <Copy className="h-3 w-3 opacity-0 group-hover/item:opacity-50" />
            </button>
          </TooltipTrigger>
          <TooltipContent>クリックでコピー</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopyPhone}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors w-full text-left group/item"
            >
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate flex-1">{agent.phone}</span>
              <Copy className="h-3 w-3 opacity-0 group-hover/item:opacity-50" />
            </button>
          </TooltipTrigger>
          <TooltipContent>クリックでコピー</TooltipContent>
        </Tooltip>
      </div>

      {/* 売上情報 */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <TrendingUp className="h-3 w-3" />
            <span className="text-xs">売上</span>
          </div>
          <p className="font-semibold text-sm">{formatCurrency(agent.totalSales)}</p>
        </div>
        <div className="text-center border-x border-border">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Percent className="h-3 w-3" />
            <span className="text-xs">料率</span>
          </div>
          <p className="font-semibold text-sm">{agent.commissionRate}%</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <ShoppingCart className="h-3 w-3" />
            <span className="text-xs">注文</span>
          </div>
          <p className="font-semibold text-sm">{agent.ordersCount}件</p>
        </div>
      </div>

      {/* 最終注文日 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>最終注文</span>
        <span>{agent.lastOrderAt ? formatDate(agent.lastOrderAt) : '注文なし'}</span>
      </div>
    </div>
  );
}

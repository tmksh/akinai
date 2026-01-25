'use client';

import {
  Mail,
  Phone,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Percent,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type Agent } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

interface AgentTableProps {
  agents: Agent[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onView: (agent: Agent) => void;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onStatusChange: (agent: Agent, status: Agent['status']) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
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
    month: 'short',
    day: 'numeric',
  });

function SortableHeader({
  children,
  column,
  currentSort,
  currentOrder,
  onSort,
  className,
}: {
  children: React.ReactNode;
  column: string;
  currentSort?: string;
  currentOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  className?: string;
}) {
  const isActive = currentSort === column;

  return (
    <button
      onClick={() => onSort?.(column)}
      className={cn(
        'flex items-center gap-1 hover:text-foreground transition-colors',
        className
      )}
    >
      {children}
      {isActive ? (
        currentOrder === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}

export function AgentTable({
  agents,
  selectedIds,
  onSelectionChange,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  sortBy,
  sortOrder,
  onSort,
}: AgentTableProps) {
  const allSelected = agents.length > 0 && selectedIds.length === agents.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < agents.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(agents.map((a) => a.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <XCircle className="h-8 w-8" />
        </div>
        <p className="font-medium">該当する代理店がありません</p>
        <p className="text-sm">検索条件を変更してください</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                  }
                }}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                column="company"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              >
                代理店
              </SortableHeader>
            </TableHead>
            <TableHead className="hidden md:table-cell">連絡先</TableHead>
            <TableHead className="text-right">
              <SortableHeader
                column="totalSales"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
                className="justify-end"
              >
                売上
              </SortableHeader>
            </TableHead>
            <TableHead className="text-right hidden sm:table-cell">コミッション</TableHead>
            <TableHead className="hidden lg:table-cell">ステータス</TableHead>
            <TableHead className="hidden lg:table-cell">
              <SortableHeader
                column="joinedAt"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              >
                登録日
              </SortableHeader>
            </TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => {
            const config = statusConfig[agent.status];
            const isSelected = selectedIds.includes(agent.id);

            return (
              <TableRow
                key={agent.id}
                className={cn(
                  'group',
                  isSelected && 'bg-orange-50/50 dark:bg-orange-950/20'
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleOne(agent.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold text-xs">
                        {agent.company.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{agent.company}</p>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono hidden sm:inline-flex"
                        >
                          {agent.code}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{agent.name}</p>
                      {/* モバイル用ステータス */}
                      <div className="lg:hidden mt-1">
                        <Badge
                          className={cn(
                            'gap-1 text-xs',
                            config.bgColor,
                            config.color,
                            'border-0'
                          )}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="text-sm space-y-0.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[180px]">{agent.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {agent.phone}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <p className="font-semibold">{formatCurrency(agent.totalSales)}</p>
                  <p className="text-xs text-muted-foreground">{agent.ordersCount}件</p>
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell">
                  <Badge variant="secondary" className="font-mono">
                    <Percent className="h-3 w-3 mr-1" />
                    {agent.commissionRate}
                  </Badge>
                  <p className="text-sm font-medium mt-1">
                    {formatCurrency(agent.totalCommission)}
                  </p>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge
                    className={cn('gap-1', config.bgColor, config.color, 'border-0')}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">
                  {formatDate(agent.joinedAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(agent)}>
                        <Eye className="mr-2 h-4 w-4" />
                        詳細を見る
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(agent)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        編集
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {agent.status === 'active' ? (
                        <DropdownMenuItem
                          onClick={() => onStatusChange(agent, 'inactive')}
                          className="text-amber-600"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          停止する
                        </DropdownMenuItem>
                      ) : agent.status === 'inactive' ? (
                        <DropdownMenuItem
                          onClick={() => onStatusChange(agent, 'active')}
                          className="text-emerald-600"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          有効にする
                        </DropdownMenuItem>
                      ) : (
                        <>
                          <DropdownMenuItem
                            onClick={() => onStatusChange(agent, 'active')}
                            className="text-emerald-600"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            承認する
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onStatusChange(agent, 'inactive')}
                            className="text-amber-600"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            却下する
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(agent)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        削除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

'use client';

import { Search, X, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

interface AgentFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  viewMode: 'card' | 'table';
  onViewModeChange: (mode: 'card' | 'table') => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  totalCount: number;
  filteredCount: number;
}

const statusOptions = [
  { value: 'all', label: 'すべて', count: null },
  { value: 'active', label: 'アクティブ', color: 'bg-emerald-500' },
  { value: 'inactive', label: '停止中', color: 'bg-gray-400' },
  { value: 'pending', label: '審査中', color: 'bg-amber-500' },
];

export function AgentFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  totalCount,
  filteredCount,
}: AgentFiltersProps) {
  const hasFilters = search || status !== 'all';

  const clearFilters = () => {
    onSearchChange('');
    onStatusChange('all');
  };

  return (
    <div className="space-y-4">
      {/* 検索とビュー切り替え */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 検索 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="会社名・担当者名・コードで検索..."
            className="pl-10 pr-10"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ソート */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">並び替え</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="end">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">並び替え項目</label>
                <Select value={sortBy} onValueChange={onSortByChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">会社名</SelectItem>
                    <SelectItem value="totalSales">売上</SelectItem>
                    <SelectItem value="joinedAt">登録日</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">順序</label>
                <Select value={sortOrder} onValueChange={(v) => onSortOrderChange(v as 'asc' | 'desc')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">昇順</SelectItem>
                    <SelectItem value="desc">降順</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* ビュー切り替え */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => v && onViewModeChange(v as 'card' | 'table')}
          className="border rounded-md"
        >
          <ToggleGroupItem value="card" aria-label="カード表示" className="px-3">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="テーブル表示" className="px-3">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* ステータスフィルター */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-1">ステータス:</span>
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              status === option.value
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            )}
          >
            <span className="flex items-center gap-1.5">
              {option.color && (
                <span className={cn('w-2 h-2 rounded-full', option.color)} />
              )}
              {option.label}
            </span>
          </button>
        ))}
      </div>

      {/* フィルター状態表示 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {filteredCount === totalCount
              ? `${totalCount}件の代理店`
              : `${filteredCount}件 / ${totalCount}件`}
          </span>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              フィルターをクリア
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, Building2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { mockAgents, type Agent } from '@/lib/mock-data';
import { toast } from 'sonner';
import {
  AgentStatsCards,
  AgentCard,
  AgentTable,
  AgentFormDialog,
  AgentDeleteDialog,
  AgentFilters,
  BulkActionBar,
  type AgentFormData,
} from './_components';

export default function AgentsPage() {
  // フィルター状態
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('totalSales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // 選択状態
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ダイアログ状態
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);

  // フィルタリングとソート
  const filteredAgents = useMemo(() => {
    let result = [...mockAgents];

    // 検索
    if (search) {
      const query = search.toLowerCase();
      result = result.filter(
        (agent) =>
          agent.company.toLowerCase().includes(query) ||
          agent.name.toLowerCase().includes(query) ||
          agent.code.toLowerCase().includes(query) ||
          agent.email.toLowerCase().includes(query)
      );
    }

    // ステータスフィルター
    if (status !== 'all') {
      result = result.filter((agent) => agent.status === status);
    }

    // ソート
    result.sort((a, b) => {
      const order = sortOrder === 'desc' ? -1 : 1;
      switch (sortBy) {
        case 'company':
          return order * a.company.localeCompare(b.company);
        case 'totalSales':
          return order * (a.totalSales - b.totalSales);
        case 'joinedAt':
          return order * (new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
        default:
          return 0;
      }
    });

    return result;
  }, [search, status, sortBy, sortOrder]);

  // 統計
  const stats = useMemo(() => ({
    total: mockAgents.length,
    active: mockAgents.filter((a) => a.status === 'active').length,
    inactive: mockAgents.filter((a) => a.status === 'inactive').length,
    pending: mockAgents.filter((a) => a.status === 'pending').length,
    totalSales: mockAgents.reduce((sum, a) => sum + a.totalSales, 0),
    totalCommission: mockAgents.reduce((sum, a) => sum + a.totalCommission, 0),
  }), []);

  // ソート切り替え
  const handleSort = useCallback((column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  }, [sortBy]);

  // アクション
  const handleView = useCallback((agent: Agent) => {
    toast.info(`${agent.company}の詳細ページへ遷移します`);
  }, []);

  const handleEdit = useCallback((agent: Agent) => {
    setEditingAgent(agent);
    setShowFormDialog(true);
  }, []);

  const handleDelete = useCallback((agent: Agent) => {
    setDeletingAgent(agent);
    setShowDeleteDialog(true);
  }, []);

  const handleStatusChange = useCallback(async (agent: Agent, newStatus: Agent['status']) => {
    const statusLabels = {
      active: 'アクティブ',
      inactive: '停止中',
      pending: '審査中',
    };
    toast.success(`${agent.company}を${statusLabels[newStatus]}に変更しました`);
  }, []);

  const handleFormSubmit = useCallback(async (data: AgentFormData) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setEditingAgent(null);
  }, []);

  const handleDeleteConfirm = useCallback(async (agent: Agent) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    setDeletingAgent(null);
  }, []);

  // 一括操作
  const handleBulkActivate = useCallback(() => {
    toast.success(`${selectedIds.length}件の代理店を有効化しました`);
    setSelectedIds([]);
  }, [selectedIds]);

  const handleBulkDeactivate = useCallback(() => {
    toast.success(`${selectedIds.length}件の代理店を停止しました`);
    setSelectedIds([]);
  }, [selectedIds]);

  const handleBulkDelete = useCallback(() => {
    toast.success(`${selectedIds.length}件の代理店を削除しました`);
    setSelectedIds([]);
  }, [selectedIds]);

  const handleNewAgent = useCallback(() => {
    setEditingAgent(null);
    setShowFormDialog(true);
  }, []);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-orange-500" />
              代理店管理
            </h1>
            <p className="text-muted-foreground mt-1">
              代理店パートナーの登録・売上管理
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleNewAgent} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              代理店を登録
            </Button>
          </div>
        </div>

        {/* 統計カード */}
        <AgentStatsCards stats={stats} />

        {/* フィルター */}
        <AgentFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          totalCount={mockAgents.length}
          filteredCount={filteredAgents.length}
        />

        {/* 代理店一覧 */}
        {viewMode === 'card' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onView={handleView}
              />
            ))}
            {filteredAgents.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">該当する代理店がありません</p>
                <p className="text-sm">検索条件を変更してください</p>
              </div>
            )}
          </div>
        ) : (
          <AgentTable
            agents={filteredAgents}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}

        {/* 一括操作バー */}
        <BulkActionBar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
          onActivate={handleBulkActivate}
          onDeactivate={handleBulkDeactivate}
          onDelete={handleBulkDelete}
        />

        {/* ダイアログ */}
        <AgentFormDialog
          open={showFormDialog}
          onOpenChange={setShowFormDialog}
          agent={editingAgent}
          onSubmit={handleFormSubmit}
        />

        <AgentDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          agent={deletingAgent}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </TooltipProvider>
  );
}

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Building2, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useOrganization } from '@/components/providers/organization-provider';
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
import {
  getAgents,
  getAgentStats,
  createAgent,
  updateAgent,
  deleteAgent,
  deleteAgents,
  updateAgentsStatus,
  generateAgentCode,
  type AgentStats,
} from '@/lib/actions/agents';
import type { Database } from '@/types/database';

type Agent = Database['public']['Tables']['agents']['Row'];

export default function AgentsPage() {
  const { organization, isLoading: orgLoading } = useOrganization();
  
  // データ状態
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0,
    totalSales: 0,
    totalCommission: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // フィルター状態
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('total_sales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // 選択状態
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // ダイアログ状態
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<Agent | null>(null);
  const [newAgentCode, setNewAgentCode] = useState('');

  // データ取得
  const fetchData = useCallback(async () => {
    if (!organization?.id) return;
    
    try {
      const [agentsResult, statsResult] = await Promise.all([
        getAgents(organization.id),
        getAgentStats(organization.id),
      ]);

      if (agentsResult.data) {
        setAgents(agentsResult.data);
      }
      if (statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      toast.error('データの取得に失敗しました');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // リフレッシュ
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  // フィルタリングとソート
  const filteredAgents = useMemo(() => {
    let result = [...agents];

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
        case 'total_sales':
          return order * (a.total_sales - b.total_sales);
        case 'joined_at':
          return order * (new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());
        default:
          return 0;
      }
    });

    return result;
  }, [agents, search, status, sortBy, sortOrder]);

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
    // TODO: 詳細ページへ遷移
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
    const result = await updateAgent(agent.id, { status: newStatus });
    
    if (result.error) {
      toast.error(result.error);
      return;
    }

    const statusLabels = {
      active: 'アクティブ',
      inactive: '停止中',
      pending: '審査中',
    };
    toast.success(`${agent.company}を${statusLabels[newStatus]}に変更しました`);
    fetchData();
  }, [fetchData]);

  const handleNewAgent = useCallback(async () => {
    if (!organization?.id) return;
    
    // 新しい代理店コードを生成
    const code = await generateAgentCode(organization.id);
    setNewAgentCode(code);
    setEditingAgent(null);
    setShowFormDialog(true);
  }, [organization?.id]);

  const handleFormSubmit = useCallback(async (data: AgentFormData) => {
    if (!organization?.id) return;

    if (editingAgent) {
      // 更新
      const result = await updateAgent(editingAgent.id, {
        code: data.code,
        company: data.company,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        status: data.status,
        commissionRate: data.commissionRate,
      });

      if (result.error) {
        toast.error(result.error);
        throw new Error(result.error);
      }
    } else {
      // 新規作成
      const result = await createAgent({
        organizationId: organization.id,
        code: data.code,
        company: data.company,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        commissionRate: data.commissionRate,
      });

      if (result.error) {
        toast.error(result.error);
        throw new Error(result.error);
      }
    }

    fetchData();
  }, [editingAgent, organization?.id, fetchData]);

  const handleDeleteConfirm = useCallback(async (agent: Agent) => {
    const result = await deleteAgent(agent.id);
    
    if (result.error) {
      toast.error(result.error);
      return;
    }
    
    toast.success(`${agent.company}を削除しました`);
    setDeletingAgent(null);
    fetchData();
  }, [fetchData]);

  // 一括操作
  const handleBulkActivate = useCallback(async () => {
    const result = await updateAgentsStatus(selectedIds, 'active');
    
    if (result.error) {
      toast.error(result.error);
      return;
    }
    
    toast.success(`${selectedIds.length}件の代理店を有効化しました`);
    setSelectedIds([]);
    fetchData();
  }, [selectedIds, fetchData]);

  const handleBulkDeactivate = useCallback(async () => {
    const result = await updateAgentsStatus(selectedIds, 'inactive');
    
    if (result.error) {
      toast.error(result.error);
      return;
    }
    
    toast.success(`${selectedIds.length}件の代理店を停止しました`);
    setSelectedIds([]);
    fetchData();
  }, [selectedIds, fetchData]);

  const handleBulkDelete = useCallback(async () => {
    const result = await deleteAgents(selectedIds);
    
    if (result.error) {
      toast.error(result.error);
      return;
    }
    
    toast.success(`${selectedIds.length}件の代理店を削除しました`);
    setSelectedIds([]);
    fetchData();
  }, [selectedIds, fetchData]);

  // モックデータ形式に変換（既存のコンポーネントとの互換性のため）
  const agentsForComponents = useMemo(() => {
    return filteredAgents.map(agent => ({
      id: agent.id,
      code: agent.code,
      company: agent.company,
      name: agent.name,
      email: agent.email,
      phone: agent.phone || '',
      address: agent.address || '',
      status: agent.status,
      commissionRate: agent.commission_rate,
      totalSales: agent.total_sales,
      totalCommission: agent.total_commission,
      ordersCount: 0,
      joinedAt: agent.joined_at,
    }));
  }, [filteredAgents]);

  // ローディング
  if (orgLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
          totalCount={agents.length}
          filteredCount={filteredAgents.length}
        />

        {/* 代理店一覧 */}
        {viewMode === 'card' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agentsForComponents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onView={() => handleView(filteredAgents.find(a => a.id === agent.id)!)}
              />
            ))}
            {filteredAgents.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">
                  {agents.length === 0 ? '代理店がまだ登録されていません' : '該当する代理店がありません'}
                </p>
                <p className="text-sm">
                  {agents.length === 0 ? '新しい代理店を登録してください' : '検索条件を変更してください'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <AgentTable
            agents={agentsForComponents}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onView={(agent) => handleView(filteredAgents.find(a => a.id === agent.id)!)}
            onEdit={(agent) => handleEdit(filteredAgents.find(a => a.id === agent.id)!)}
            onDelete={(agent) => handleDelete(filteredAgents.find(a => a.id === agent.id)!)}
            onStatusChange={(agent, status) => handleStatusChange(filteredAgents.find(a => a.id === agent.id)!, status)}
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
          agent={editingAgent ? {
            id: editingAgent.id,
            code: editingAgent.code,
            company: editingAgent.company,
            name: editingAgent.name,
            email: editingAgent.email,
            phone: editingAgent.phone || '',
            address: editingAgent.address || '',
            status: editingAgent.status,
            commissionRate: editingAgent.commission_rate,
            totalSales: editingAgent.total_sales,
            totalCommission: editingAgent.total_commission,
            ordersCount: 0,
            joinedAt: editingAgent.joined_at,
          } : newAgentCode ? {
            id: '',
            code: newAgentCode,
            company: '',
            name: '',
            email: '',
            phone: '',
            address: '',
            status: 'pending',
            commissionRate: 10,
            totalSales: 0,
            totalCommission: 0,
            ordersCount: 0,
            joinedAt: new Date().toISOString(),
          } : null}
          onSubmit={handleFormSubmit}
        />

        <AgentDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          agent={deletingAgent ? {
            id: deletingAgent.id,
            code: deletingAgent.code,
            company: deletingAgent.company,
            name: deletingAgent.name,
            email: deletingAgent.email,
            phone: deletingAgent.phone || '',
            address: deletingAgent.address || '',
            status: deletingAgent.status,
            commissionRate: deletingAgent.commission_rate,
            totalSales: deletingAgent.total_sales,
            totalCommission: deletingAgent.total_commission,
            ordersCount: 0,
            joinedAt: deletingAgent.joined_at,
          } : null}
          onConfirm={async () => { if (deletingAgent) await handleDeleteConfirm(deletingAgent); }}
        />
      </div>
    </TooltipProvider>
  );
}

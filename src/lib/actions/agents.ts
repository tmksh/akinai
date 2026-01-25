'use server';

import { revalidatePath } from 'next/cache';
import { mockAgents, type Agent } from '@/lib/mock-data';

// 代理店一覧を取得
export async function getAgents(filters?: {
  search?: string;
  status?: 'all' | 'active' | 'inactive' | 'pending';
  sortBy?: 'company' | 'totalSales' | 'joinedAt';
  sortOrder?: 'asc' | 'desc';
}): Promise<{ data: Agent[]; error: string | null }> {
  try {
    let data = [...mockAgents];

    // 検索フィルタ
    if (filters?.search) {
      const query = filters.search.toLowerCase();
      data = data.filter(
        (agent) =>
          agent.company.toLowerCase().includes(query) ||
          agent.name.toLowerCase().includes(query) ||
          agent.code.toLowerCase().includes(query) ||
          agent.email.toLowerCase().includes(query)
      );
    }

    // ステータスフィルタ
    if (filters?.status && filters.status !== 'all') {
      data = data.filter((agent) => agent.status === filters.status);
    }

    // ソート
    if (filters?.sortBy) {
      data.sort((a, b) => {
        const order = filters.sortOrder === 'desc' ? -1 : 1;
        switch (filters.sortBy) {
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
    }

    return { data, error: null };
  } catch (error) {
    return { data: [], error: '代理店データの取得に失敗しました' };
  }
}

// 代理店の統計を取得
export async function getAgentStats(): Promise<{
  data: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    totalSales: number;
    totalCommission: number;
    avgCommissionRate: number;
    topAgents: Agent[];
  } | null;
  error: string | null;
}> {
  try {
    const active = mockAgents.filter((a) => a.status === 'active');
    const stats = {
      total: mockAgents.length,
      active: active.length,
      inactive: mockAgents.filter((a) => a.status === 'inactive').length,
      pending: mockAgents.filter((a) => a.status === 'pending').length,
      totalSales: mockAgents.reduce((sum, a) => sum + a.totalSales, 0),
      totalCommission: mockAgents.reduce((sum, a) => sum + a.totalCommission, 0),
      avgCommissionRate:
        active.length > 0
          ? active.reduce((sum, a) => sum + a.commissionRate, 0) / active.length
          : 0,
      topAgents: [...active].sort((a, b) => b.totalSales - a.totalSales).slice(0, 3),
    };
    return { data: stats, error: null };
  } catch (error) {
    return { data: null, error: '統計情報の取得に失敗しました' };
  }
}

// 代理店を取得（単一）
export async function getAgent(id: string): Promise<{ data: Agent | null; error: string | null }> {
  try {
    const agent = mockAgents.find((a) => a.id === id);
    if (!agent) {
      return { data: null, error: '代理店が見つかりません' };
    }
    return { data: agent, error: null };
  } catch (error) {
    return { data: null, error: '代理店の取得に失敗しました' };
  }
}

// 代理店を作成
export async function createAgent(
  data: Omit<Agent, 'id' | 'totalSales' | 'totalCommission' | 'ordersCount' | 'joinedAt' | 'lastOrderAt'>
): Promise<{ data: Agent | null; error: string | null }> {
  try {
    const newAgent: Agent = {
      ...data,
      id: `agent-${Date.now()}`,
      totalSales: 0,
      totalCommission: 0,
      ordersCount: 0,
      joinedAt: new Date().toISOString(),
    };

    // TODO: DB保存実装
    revalidatePath('/agents');
    return { data: newAgent, error: null };
  } catch (error) {
    return { data: null, error: '代理店の作成に失敗しました' };
  }
}

// 代理店を更新
export async function updateAgent(
  id: string,
  data: Partial<Agent>
): Promise<{ data: Agent | null; error: string | null }> {
  try {
    const index = mockAgents.findIndex((a) => a.id === id);
    if (index === -1) {
      return { data: null, error: '代理店が見つかりません' };
    }

    const updated = { ...mockAgents[index], ...data };
    // TODO: DB更新実装

    revalidatePath('/agents');
    return { data: updated, error: null };
  } catch (error) {
    return { data: null, error: '代理店の更新に失敗しました' };
  }
}

// 代理店のステータスを変更
export async function updateAgentStatus(
  id: string,
  status: Agent['status']
): Promise<{ success: boolean; error: string | null }> {
  try {
    // TODO: DB更新実装
    revalidatePath('/agents');
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: 'ステータスの更新に失敗しました' };
  }
}

// 代理店を削除
export async function deleteAgent(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    // TODO: DB削除実装
    revalidatePath('/agents');
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: '代理店の削除に失敗しました' };
  }
}

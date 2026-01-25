'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/database';

// 型定義
type Agent = Database['public']['Tables']['agents']['Row'];
type AgentStatus = 'active' | 'inactive' | 'pending';

// 統計情報の型
export interface AgentStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  totalSales: number;
  totalCommission: number;
}

// 代理店一覧を取得
export async function getAgents(organizationId: string): Promise<{
  data: Agent[] | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching agents:', error);
    return { data: null, error: 'Failed to fetch agents' };
  }
}

// 代理店の統計情報を取得
export async function getAgentStats(organizationId: string): Promise<{
  data: AgentStats | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('status, total_sales, total_commission')
      .eq('organization_id', organizationId);

    if (error) throw error;

    const stats: AgentStats = {
      total: agents?.length || 0,
      active: agents?.filter(a => a.status === 'active').length || 0,
      inactive: agents?.filter(a => a.status === 'inactive').length || 0,
      pending: agents?.filter(a => a.status === 'pending').length || 0,
      totalSales: agents?.reduce((sum, a) => sum + (a.total_sales || 0), 0) || 0,
      totalCommission: agents?.reduce((sum, a) => sum + (a.total_commission || 0), 0) || 0,
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    return { data: null, error: 'Failed to fetch agent stats' };
  }
}

// 単一の代理店を取得
export async function getAgent(agentId: string): Promise<{
  data: Agent | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { data: null, error: '代理店が見つかりません' };
      }
      throw error;
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching agent:', error);
    return { data: null, error: 'Failed to fetch agent' };
  }
}

// 代理店を作成
export async function createAgent(input: {
  organizationId: string;
  code: string;
  company: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  commissionRate?: number;
  notes?: string;
}): Promise<{
  data: Agent | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('agents')
      .insert({
        organization_id: input.organizationId,
        code: input.code,
        company: input.company,
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        address: input.address || null,
        commission_rate: input.commissionRate || 10,
        notes: input.notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('code')) {
          return { data: null, error: 'この代理店コードは既に使用されています' };
        }
        if (error.message.includes('email')) {
          return { data: null, error: 'このメールアドレスは既に登録されています' };
        }
      }
      throw error;
    }

    revalidatePath('/agents');
    return { data, error: null };
  } catch (error) {
    console.error('Error creating agent:', error);
    return { data: null, error: '代理店の作成に失敗しました' };
  }
}

// 代理店を更新
export async function updateAgent(
  agentId: string,
  input: {
    code?: string;
    company?: string;
    name?: string;
    email?: string;
    phone?: string | null;
    address?: string | null;
    status?: AgentStatus;
    commissionRate?: number;
    notes?: string | null;
  }
): Promise<{
  data: Agent | null;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const updateData: Record<string, unknown> = {};
    if (input.code !== undefined) updateData.code = input.code;
    if (input.company !== undefined) updateData.company = input.company;
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.commissionRate !== undefined) updateData.commission_rate = input.commissionRate;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const { data, error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', agentId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('code')) {
          return { data: null, error: 'この代理店コードは既に使用されています' };
        }
        if (error.message.includes('email')) {
          return { data: null, error: 'このメールアドレスは既に登録されています' };
        }
      }
      throw error;
    }

    revalidatePath('/agents');
    return { data, error: null };
  } catch (error) {
    console.error('Error updating agent:', error);
    return { data: null, error: '代理店の更新に失敗しました' };
  }
}

// 代理店のステータスを更新
export async function updateAgentStatus(
  agentId: string,
  status: AgentStatus
): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('agents')
      .update({ status })
      .eq('id', agentId);

    if (error) throw error;

    revalidatePath('/agents');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating agent status:', error);
    return { success: false, error: 'ステータスの更新に失敗しました' };
  }
}

// 代理店を削除
export async function deleteAgent(agentId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId);

    if (error) throw error;

    revalidatePath('/agents');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting agent:', error);
    return { success: false, error: '代理店の削除に失敗しました' };
  }
}

// 複数の代理店を一括削除
export async function deleteAgents(agentIds: string[]): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('agents')
      .delete()
      .in('id', agentIds);

    if (error) throw error;

    revalidatePath('/agents');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting agents:', error);
    return { success: false, error: '代理店の一括削除に失敗しました' };
  }
}

// 複数の代理店のステータスを一括更新
export async function updateAgentsStatus(
  agentIds: string[],
  status: AgentStatus
): Promise<{
  success: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('agents')
      .update({ status })
      .in('id', agentIds);

    if (error) throw error;

    revalidatePath('/agents');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating agents status:', error);
    return { success: false, error: 'ステータスの一括更新に失敗しました' };
  }
}

// 代理店コードの重複チェック
export async function checkAgentCodeExists(
  organizationId: string,
  code: string,
  excludeAgentId?: string
): Promise<boolean> {
  const supabase = await createClient();

  try {
    let query = supabase
      .from('agents')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('code', code);

    if (excludeAgentId) {
      query = query.neq('id', excludeAgentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking agent code:', error);
    return false;
  }
}

// 代理店コードを自動生成
export async function generateAgentCode(organizationId: string): Promise<string> {
  const supabase = await createClient();

  try {
    // 最新の代理店コードを取得
    const { data } = await supabase
      .from('agents')
      .select('code')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (data && data.length > 0) {
      const match = data[0].code.match(/AG(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `AG${String(nextNumber).padStart(4, '0')}`;
  } catch {
    // エラーの場合はタイムスタンプベースのコードを生成
    return `AG${Date.now().toString().slice(-6)}`;
  }
}

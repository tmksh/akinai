'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';

// APIキーを生成する関数
function generateApiKey(prefix: 'live' | 'test' = 'live'): string {
  const key = randomBytes(24).toString('hex');
  return `sk_${prefix}_${key}`;
}

// 組織情報を取得
export async function getOrganization(organizationId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();
  
  if (error) {
    console.error('Error fetching organization:', error);
    return { data: null, error: error.message };
  }
  
  return { data, error: null };
}

// 組織情報を更新
export async function updateOrganization(
  organizationId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    logo?: string;
    frontend_url?: string;
  }
) {
  const supabase = await createClient();
  
  const { data: updated, error } = await supabase
    .from('organizations')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating organization:', error);
    return { data: null, error: error.message };
  }
  
  revalidatePath('/settings');
  revalidatePath('/settings/organization');
  return { data: updated, error: null };
}

// APIキーを生成・更新
export async function generateNewApiKey(
  organizationId: string,
  type: 'live' | 'test' = 'live'
) {
  const supabase = await createClient();
  
  const newKey = generateApiKey(type);
  
  const { data, error } = await supabase
    .from('organizations')
    .update({
      frontend_api_key: newKey,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)
    .select('frontend_api_key')
    .single();
  
  if (error) {
    console.error('Error generating API key:', error);
    return { data: null, error: error.message };
  }
  
  revalidatePath('/settings/api');
  
  // キーは一度だけ表示されるため、そのまま返す
  return { data: { apiKey: newKey }, error: null };
}

// APIキーを削除（無効化）
export async function revokeApiKey(organizationId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('organizations')
    .update({
      frontend_api_key: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId);
  
  if (error) {
    console.error('Error revoking API key:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/settings/api');
  return { success: true, error: null };
}

// APIキーが存在するか確認（キー自体は返さない）
export async function checkApiKeyExists(organizationId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('organizations')
    .select('frontend_api_key')
    .eq('id', organizationId)
    .single();
  
  if (error) {
    console.error('Error checking API key:', error);
    return { exists: false, error: error.message };
  }
  
  return { 
    exists: !!data?.frontend_api_key,
    // キーの最後の4文字だけを返す（セキュリティのため）
    lastFour: data?.frontend_api_key ? data.frontend_api_key.slice(-4) : null,
    error: null 
  };
}

// 組織メンバー一覧を取得
export async function getOrganizationMembers(organizationId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      *,
      user:users(id, email, name, avatar_url)
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching members:', error);
    return { data: [], error: error.message };
  }
  
  return { data: data || [], error: null };
}

// メンバーの権限を更新
export async function updateMemberRole(
  memberId: string,
  organizationId: string,
  newRole: 'owner' | 'admin' | 'manager' | 'editor' | 'viewer'
) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('organization_members')
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .eq('organization_id', organizationId);
  
  if (error) {
    console.error('Error updating member role:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/settings/members');
  return { success: true, error: null };
}

// メンバーを削除（非アクティブ化）
export async function removeMember(memberId: string, organizationId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('organization_members')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId)
    .eq('organization_id', organizationId);
  
  if (error) {
    console.error('Error removing member:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/settings/members');
  return { success: true, error: null };
}

// 招待を作成
export async function createInvitation(
  organizationId: string,
  email: string,
  role: 'admin' | 'manager' | 'editor' | 'viewer',
  invitedBy: string
) {
  const supabase = await createClient();
  
  // 招待トークンを生成
  const token = randomBytes(32).toString('hex');
  
  // 7日後に期限切れ
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  const { data, error } = await supabase
    .from('organization_invitations')
    .insert({
      organization_id: organizationId,
      email,
      role,
      token,
      invited_by: invitedBy,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating invitation:', error);
    return { data: null, error: error.message };
  }
  
  revalidatePath('/settings/members');
  return { data, error: null };
}

// 招待一覧を取得
export async function getInvitations(organizationId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching invitations:', error);
    return { data: [], error: error.message };
  }
  
  return { data: data || [], error: null };
}

// 招待を削除
export async function deleteInvitation(invitationId: string, organizationId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('organization_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('organization_id', organizationId);
  
  if (error) {
    console.error('Error deleting invitation:', error);
    return { success: false, error: error.message };
  }
  
  revalidatePath('/settings/members');
  return { success: true, error: null };
}


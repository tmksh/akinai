'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { ShopThemeSettings, DEFAULT_SHOP_THEME } from '@/types';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServiceClient(url, key);
}

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
  const supabase = getAdminClient();
  
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

// 商品フィールドスキーマを更新
export async function updateProductFieldSchema(
  organizationId: string,
  schema: { id: string; key: string; label: string; type: string; options?: string[] }[]
) {
  const supabase = getAdminClient();

  console.log('[updateProductFieldSchema] orgId:', organizationId, 'schema count:', schema.length);

  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (fetchError) {
    console.error('[updateProductFieldSchema] fetch error:', fetchError);
    return { data: null, error: fetchError.message };
  }

  const currentSettings = (org?.settings as Record<string, unknown>) || {};
  const newSettings = { ...currentSettings, product_field_schema: schema };

  console.log('[updateProductFieldSchema] updating settings...');

  const { data, error } = await supabase
    .from('organizations')
    .update({ settings: newSettings, updated_at: new Date().toISOString() })
    .eq('id', organizationId)
    .select()
    .single();

  if (error) {
    console.error('[updateProductFieldSchema] update error:', error);
    return { data: null, error: error.message };
  }

  const savedSchema = (data?.settings as Record<string, unknown>)?.product_field_schema;
  console.log('[updateProductFieldSchema] saved schema count:', Array.isArray(savedSchema) ? savedSchema.length : 'N/A');

  revalidatePath('/settings/products');
  return { data, error: null };
}

// バリエーション入力モードを更新
export async function updateVariantInputMode(
  organizationId: string,
  mode: 'simple' | 'matrix'
) {
  const supabase = getAdminClient();

  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (fetchError) return { data: null, error: fetchError.message };

  const currentSettings = (org?.settings as Record<string, unknown>) || {};
  const newSettings = { ...currentSettings, variant_input_mode: mode };

  const { data, error } = await supabase
    .from('organizations')
    .update({ settings: newSettings, updated_at: new Date().toISOString() })
    .eq('id', organizationId)
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  revalidatePath('/settings/products');
  revalidatePath('/products');
  return { data, error: null };
}

// コンテンツフィールドスキーマを更新（タイプ別マップ形式）
export async function updateContentFieldSchema(
  organizationId: string,
  schema: Record<string, { id: string; key: string; label: string; type: string; options?: string[] }[]>
) {
  const supabase = getAdminClient();

  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  const currentSettings = (org?.settings as Record<string, unknown>) || {};
  const newSettings = { ...currentSettings, content_field_schema: schema };

  const { data, error } = await supabase
    .from('organizations')
    .update({ settings: newSettings, updated_at: new Date().toISOString() })
    .eq('id', organizationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating content field schema:', error);
    return { data: null, error: error.message };
  }

  revalidatePath('/settings/contents-schema');
  return { data, error: null };
}

// 代理店フィールドスキーマを更新
export async function updateAgentFieldSchema(
  organizationId: string,
  schema: { id: string; key: string; label: string; type: string; options?: string[]; required?: boolean }[]
) {
  const supabase = getAdminClient();

  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  const currentSettings = (org?.settings as Record<string, unknown>) || {};
  const newSettings = { ...currentSettings, agent_field_schema: schema };

  const { data, error } = await supabase
    .from('organizations')
    .update({ settings: newSettings, updated_at: new Date().toISOString() })
    .eq('id', organizationId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/settings/agents-schema');
  return { data, error: null };
}
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
      user:users(id, email, name, avatar)
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

// ============================================
// ショップテーマ設定
// ============================================

// テーマ設定を取得
export async function getShopTheme(organizationId: string): Promise<{
  data: ShopThemeSettings | null;
  error: string | null;
}> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();
  
  if (error) {
    console.error('Error fetching shop theme:', error);
    return { data: null, error: error.message };
  }
  
  // settingsからshop_themeを取得、なければデフォルト値を返す
  const settings = data?.settings as Record<string, unknown> | null;
  const shopTheme = settings?.shop_theme as ShopThemeSettings | undefined;
  
  return { 
    data: shopTheme || DEFAULT_SHOP_THEME, 
    error: null 
  };
}

// テーマ設定を更新
export async function updateShopTheme(
  organizationId: string,
  theme: ShopThemeSettings
): Promise<{
  data: ShopThemeSettings | null;
  error: string | null;
}> {
  const supabase = await createClient();
  
  // 現在の設定を取得
  const { data: currentData, error: fetchError } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();
  
  if (fetchError) {
    console.error('Error fetching current settings:', fetchError);
    return { data: null, error: fetchError.message };
  }
  
  // 既存の設定とマージ
  const currentSettings = (currentData?.settings as Record<string, unknown>) || {};
  const newSettings = {
    ...currentSettings,
    shop_theme: theme,
  };
  
  // 更新
  const { data: updated, error: updateError } = await supabase
    .from('organizations')
    .update({
      settings: newSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)
    .select('settings')
    .single();
  
  if (updateError) {
    console.error('Error updating shop theme:', updateError);
    return { data: null, error: updateError.message };
  }
  
  revalidatePath('/settings/theme');
  revalidatePath('/shop');
  
  return { 
    data: (updated?.settings as Record<string, unknown>)?.shop_theme as ShopThemeSettings || theme, 
    error: null 
  };
}

// テーマをデフォルトにリセット
export async function resetShopTheme(organizationId: string): Promise<{
  data: ShopThemeSettings | null;
  error: string | null;
}> {
  return updateShopTheme(organizationId, DEFAULT_SHOP_THEME);
}

// ============================================
// 銀行振込口座設定
// ============================================

export interface BankTransferSettings {
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  transferDeadlineDays: number;
}

export async function getBankTransferSettings(organizationId: string): Promise<{
  data: BankTransferSettings | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (error) {
    console.error('Error fetching bank transfer settings:', error);
    return { data: null, error: error.message };
  }

  const settings = (data?.settings as Record<string, unknown>) || {};
  const bank = settings.bank_transfer as BankTransferSettings | undefined;
  return { data: bank || null, error: null };
}

export async function updateBankTransferSettings(
  organizationId: string,
  bank: BankTransferSettings
): Promise<{ data: BankTransferSettings | null; error: string | null }> {
  const supabase = await createClient();

  const { data: currentData, error: fetchError } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  const currentSettings = (currentData?.settings as Record<string, unknown>) || {};
  const newSettings = {
    ...currentSettings,
    bank_transfer: bank,
  };

  const { data: updated, error: updateError } = await supabase
    .from('organizations')
    .update({
      settings: newSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)
    .select('settings')
    .single();

  if (updateError) {
    return { data: null, error: updateError.message };
  }

  revalidatePath('/settings/payments');
  const result = (updated?.settings as Record<string, unknown>)?.bank_transfer as BankTransferSettings;
  return { data: result || bank, error: null };
}

// ============================================
// お知らせ（コンテンツ）で使うタイプ
// ============================================

export async function getEnabledContentTypes(organizationId: string): Promise<{
  data: string[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (error) {
    console.error('Error fetching enabled content types:', error);
    return { data: [], error: error.message };
  }

  const settings = (data?.settings as Record<string, unknown>) || {};
  const types = settings.enabled_content_types as string[] | undefined;
  return { data: Array.isArray(types) ? types : [], error: null };
}

export async function updateEnabledContentTypes(
  organizationId: string,
  types: string[]
): Promise<{ data: string[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: currentData, error: fetchError } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  const currentSettings = (currentData?.settings as Record<string, unknown>) || {};
  const newSettings = {
    ...currentSettings,
    enabled_content_types: types,
  };

  const { data: updated, error: updateError } = await supabase
    .from('organizations')
    .update({
      settings: newSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)
    .select('settings')
    .single();

  if (updateError) {
    return { data: null, error: updateError.message };
  }

  revalidatePath('/settings/contents');
  revalidatePath('/contents');
  revalidatePath('/contents/new');
  const result = (updated?.settings as Record<string, unknown>)?.enabled_content_types as string[];
  return { data: Array.isArray(result) ? result : types, error: null };
}

// ============================================
// ナビゲーション表示設定
// ============================================

export async function getEnabledNavItems(organizationId: string): Promise<{
  data: string[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (error) {
    console.error('Error fetching enabled nav items:', error);
    return { data: null, error: error.message };
  }

  const settings = (data?.settings as Record<string, unknown>) || {};
  const items = settings.enabled_nav_items as string[] | undefined;
  return { data: Array.isArray(items) ? items : null, error: null };
}

export async function updateEnabledNavItems(
  organizationId: string,
  items: string[] | null
): Promise<{ data: string[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: currentData, error: fetchError } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  const currentSettings = (currentData?.settings as Record<string, unknown>) || {};
  const newSettings = {
    ...currentSettings,
    enabled_nav_items: items,
  };

  const { data: updated, error: updateError } = await supabase
    .from('organizations')
    .update({
      settings: newSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)
    .select('settings')
    .single();

  if (updateError) {
    return { data: null, error: updateError.message };
  }

  revalidatePath('/settings/navigation');
  const result = (updated?.settings as Record<string, unknown>)?.enabled_nav_items as string[] | null;
  return { data: result ?? items, error: null };
}

// ============================================
// 会員種別ラベル設定
// ============================================

import { DEFAULT_CUSTOMER_ROLE_LABELS, DEFAULT_CUSTOMER_ROLE_ENABLED, type CustomerRoleLabels, type CustomerRoleEnabled } from '@/lib/customer-roles';
import { OrganizationFeatures, DEFAULT_ORGANIZATION_FEATURES } from '@/types/database';

export async function getCustomerRoleLabels(organizationId: string): Promise<{
  data: CustomerRoleLabels;
  enabled: CustomerRoleEnabled;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (error) {
    return { data: DEFAULT_CUSTOMER_ROLE_LABELS, enabled: DEFAULT_CUSTOMER_ROLE_ENABLED, error: error.message };
  }

  const settings = (data?.settings as Record<string, unknown>) || {};
  const saved = settings.customer_role_labels as Partial<CustomerRoleLabels> | undefined;
  const savedEnabled = settings.customer_role_enabled as Partial<CustomerRoleEnabled> | undefined;
  return {
    data: { ...DEFAULT_CUSTOMER_ROLE_LABELS, ...saved },
    enabled: { ...DEFAULT_CUSTOMER_ROLE_ENABLED, ...savedEnabled },
    error: null,
  };
}

export async function updateCustomerRoleLabels(
  organizationId: string,
  labels: CustomerRoleLabels,
  enabled?: CustomerRoleEnabled
): Promise<{ data: CustomerRoleLabels | null; error: string | null }> {
  const supabase = await createClient();

  const { data: currentData, error: fetchError } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  const currentSettings = (currentData?.settings as Record<string, unknown>) || {};
  const newSettings: Record<string, unknown> = { ...currentSettings, customer_role_labels: labels };
  if (enabled !== undefined) {
    newSettings.customer_role_enabled = enabled;
  }

  const { data: updated, error: updateError } = await supabase
    .from('organizations')
    .update({ settings: newSettings, updated_at: new Date().toISOString() })
    .eq('id', organizationId)
    .select('settings')
    .single();

  if (updateError) {
    return { data: null, error: updateError.message };
  }

  revalidatePath('/settings/customer-roles');
  revalidatePath('/customers');
  const result = (updated?.settings as Record<string, unknown>)?.customer_role_labels as CustomerRoleLabels;
  return { data: { ...DEFAULT_CUSTOMER_ROLE_LABELS, ...result }, error: null };
}

// ============================================
// 顧客カスタムフィールドスキーマ設定
// 他の企業がデフォルトは空、自社でフィールドを追加できる
// ============================================

export interface CustomerFieldSchema {
  key: string;           // フィールドキー（英数字）
  label: string;         // 表示名
  type: 'text' | 'select' | 'multiselect' | 'textarea' | 'number' | 'boolean';
  options?: string[];    // select/multiselect の選択肢
  required?: boolean;
  placeholder?: string;
  roles?: ('personal' | 'buyer' | 'supplier')[];  // 表示する会員種別（未指定は全て）
}

export async function getCustomerFieldSchema(organizationId: string): Promise<{
  data: CustomerFieldSchema[];
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (error) {
    return { data: [], error: error.message };
  }

  const settings = (data?.settings as Record<string, unknown>) || {};
  const schema = (settings.customer_field_schema as CustomerFieldSchema[]) || [];
  return { data: schema, error: null };
}

export async function updateCustomerFieldSchema(
  organizationId: string,
  schema: CustomerFieldSchema[]
): Promise<{ data: CustomerFieldSchema[] | null; error: string | null }> {
  const supabase = await createClient();

  const { data: currentData, error: fetchError } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError.message };
  }

  const currentSettings = (currentData?.settings as Record<string, unknown>) || {};
  const newSettings = { ...currentSettings, customer_field_schema: schema };

  const { data: updated, error: updateError } = await supabase
    .from('organizations')
    .update({ settings: newSettings, updated_at: new Date().toISOString() })
    .eq('id', organizationId)
    .select('settings')
    .single();

  if (updateError) {
    return { data: null, error: updateError.message };
  }

  revalidatePath('/settings');
  revalidatePath('/customers');
  const result = (updated?.settings as Record<string, unknown>)?.customer_field_schema as CustomerFieldSchema[];
  return { data: result || [], error: null };
}

// ============================================
// 機能フラグ設定（テナントごとのON/OFF）
// ============================================

export async function getOrganizationFeatures(organizationId: string): Promise<{
  data: OrganizationFeatures;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organizations')
    .select('features')
    .eq('id', organizationId)
    .single();

  if (error) {
    return { data: DEFAULT_ORGANIZATION_FEATURES, error: error.message };
  }

  const saved = (data?.features as Partial<OrganizationFeatures>) || {};
  return {
    data: { ...DEFAULT_ORGANIZATION_FEATURES, ...saved },
    error: null,
  };
}

export async function updateOrganizationFeatures(
  organizationId: string,
  features: OrganizationFeatures
): Promise<{ data: OrganizationFeatures | null; error: string | null }> {
  const supabase = getAdminClient();

  const { data: updated, error } = await supabase
    .from('organizations')
    .update({ features, updated_at: new Date().toISOString() })
    .eq('id', organizationId)
    .select('features')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  revalidatePath('/settings/features');
  const result = updated?.features as OrganizationFeatures;
  return { data: { ...DEFAULT_ORGANIZATION_FEATURES, ...result }, error: null };
}



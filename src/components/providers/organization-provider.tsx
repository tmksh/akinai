'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CustomFieldType } from '@/components/products/custom-fields';

// 商品スキーマフィールドの定義（値なし・全商品共通テンプレート）
export interface ProductFieldSchemaItem {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
}

// コンテンツスキーマフィールドの定義（値なし・コンテンツタイプ別テンプレート）
export interface ContentFieldSchemaItem {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
}

// タイプ別コンテンツスキーマ（key = コンテンツタイプ名）
export type ContentFieldSchemaByType = Record<string, ContentFieldSchemaItem[]>;

// 代理店カスタムフィールドスキーマ
export interface AgentFieldSchemaItem {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'boolean' | 'url' | 'email' | 'phone';
  options?: string[];
  required?: boolean;
}

// 顧客カスタムフィールドスキーマ
export interface CustomerFieldSchemaItem {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'textarea' | 'number' | 'boolean';
  options?: string[];
  required?: boolean;
  placeholder?: string;
  roles?: ('personal' | 'buyer' | 'supplier')[];
}

// 組織の型定義
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  frontendUrl: string | null;
  frontendApiKey: string | null;
  plan: 'starter' | 'pro' | 'enterprise';
  settings: Record<string, unknown>;
  productFieldSchema: ProductFieldSchemaItem[];
  contentFieldSchema: ContentFieldSchemaByType;
  customerFieldSchema: CustomerFieldSchemaItem[];
  agentFieldSchema: AgentFieldSchemaItem[];
  ownerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 現在ログイン中のユーザー（表示用）
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

// コンテキストの型
interface OrganizationContextType {
  organization: Organization | null;
  currentUser: CurrentUser | null;
  isLoading: boolean;
  error: Error | null;
  setOrganization: (org: Organization | null) => void;
  refetch: () => Promise<void>;
}

// デフォルト値
const defaultContext: OrganizationContextType = {
  organization: null,
  currentUser: null,
  isLoading: true,
  error: null,
  setOrganization: () => {},
  refetch: async () => {},
};

// コンテキスト作成
const OrganizationContext = createContext<OrganizationContextType>(defaultContext);

// DBからの型をフロントエンド用に変換
function transformOrganization(row: Record<string, unknown>): Organization {
  const settings = (row.settings as Record<string, unknown>) || {};
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    logo: row.logo as string | null,
    email: row.email as string | null,
    phone: row.phone as string | null,
    website: row.website as string | null,
    address: row.address as string | null,
    frontendUrl: row.frontend_url as string | null,
    frontendApiKey: row.frontend_api_key as string | null,
    plan: row.plan as 'starter' | 'pro' | 'enterprise',
    settings,
    productFieldSchema: (settings.product_field_schema as ProductFieldSchemaItem[]) || [],
    contentFieldSchema: (() => {
      const raw = settings.content_field_schema;
      if (!raw) return {};
      // 旧形式（配列）の場合は gallery タイプに自動移行
      if (Array.isArray(raw)) {
        return raw.length > 0 ? { gallery: raw as ContentFieldSchemaItem[] } : {};
      }
      return raw as ContentFieldSchemaByType;
    })(),
    customerFieldSchema: (settings.customer_field_schema as CustomerFieldSchemaItem[]) || [],
    agentFieldSchema: (settings.agent_field_schema as AgentFieldSchemaItem[]) || [],
    ownerId: row.owner_id as string | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// プロバイダーコンポーネント（SSRで初期データを受け取り可能）
interface OrganizationProviderProps {
  children: ReactNode;
  initialOrganization?: Organization | null;
  initialUser?: CurrentUser | null;
}

export function OrganizationProvider({
  children,
  initialOrganization,
  initialUser,
}: OrganizationProviderProps) {
  const [organization, setOrganization] = useState<Organization | null>(initialOrganization ?? null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(initialUser ?? null);
  const [isLoading, setIsLoading] = useState(!initialOrganization);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganization = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setOrganization(null);
        setCurrentUser(null);
        return;
      }

      const [profileRes, membershipRes] = await Promise.all([
        supabase
          .from('users')
          .select('name, avatar')
          .eq('id', user.id)
          .single(),
        supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single(),
      ]);

      setCurrentUser({
        id: user.id,
        email: user.email ?? '',
        name: (profileRes.data?.name as string) ?? user.user_metadata?.name ?? user.email ?? 'ユーザー',
        avatar: (profileRes.data?.avatar as string) ?? user.user_metadata?.avatar_url ?? null,
      });

      if (membershipRes.error && membershipRes.error.code !== 'PGRST116') {
        throw membershipRes.error;
      }

      if (!membershipRes.data) {
        setOrganization(null);
        return;
      }

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, logo, email, phone, website, address, frontend_url, frontend_api_key, plan, settings, owner_id, is_active, created_at, updated_at')
        .eq('id', membershipRes.data.organization_id)
        .single();

      if (orgError) throw orgError;

      setOrganization(transformOrganization(org));
    } catch (err) {
      console.error('Failed to fetch organization:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch organization'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初期データがある場合はクライアントフェッチをスキップ
  useEffect(() => {
    if (!initialOrganization) {
      fetchOrganization();
    }
  }, [fetchOrganization, initialOrganization]);

  const value = useMemo(
    () => ({
      organization,
      currentUser,
      isLoading,
      error,
      setOrganization,
      refetch: fetchOrganization,
    }),
    [organization, currentUser, isLoading, error, fetchOrganization]
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

// フック
export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

// フロントエンドURLを取得するヘルパーフック
export function useFrontendUrl() {
  const { organization } = useOrganization();
  return organization?.frontendUrl || null;
}






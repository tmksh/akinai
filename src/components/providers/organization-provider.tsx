'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  ownerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// コンテキストの型
interface OrganizationContextType {
  organization: Organization | null;
  isLoading: boolean;
  error: Error | null;
  setOrganization: (org: Organization | null) => void;
  refetch: () => Promise<void>;
}

// デフォルト値
const defaultContext: OrganizationContextType = {
  organization: null,
  isLoading: true,
  error: null,
  setOrganization: () => {},
  refetch: async () => {},
};

// コンテキスト作成
const OrganizationContext = createContext<OrganizationContextType>(defaultContext);

// モック組織データ（開発用）
const mockOrganization: Organization = {
  id: 'org_123',
  name: '商い サンプルストア',
  slug: 'sample-store',
  logo: null,
  email: 'contact@sample-store.jp',
  phone: '03-1234-5678',
  website: 'https://sample-store.jp',
  address: '東京都渋谷区神宮前1-2-3',
  frontendUrl: null, // 未設定状態をデフォルトに
  frontendApiKey: 'sk_live_xxxxxxxxxxxxxxxxxxxx',
  plan: 'pro',
  settings: {},
  ownerId: 'user_1',
  isActive: true,
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

// プロバイダーコンポーネント
export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganization = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: 実際のAPI呼び出しに置き換え
      // const { data, error } = await supabase
      //   .from('organizations')
      //   .select('*')
      //   .eq('id', currentOrganizationId)
      //   .single();

      // 開発中はモックデータを使用
      await new Promise((resolve) => setTimeout(resolve, 100)); // 模擬遅延
      setOrganization(mockOrganization);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch organization'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, []);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        isLoading,
        error,
        setOrganization,
        refetch: fetchOrganization,
      }}
    >
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





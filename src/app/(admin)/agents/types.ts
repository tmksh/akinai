/** 代理店一覧・カード・テーブル・フォーム用の表示型（camelCase） */
export type AgentDisplay = {
  id: string;
  code: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  commissionRate: number;
  status: 'active' | 'inactive' | 'pending';
  totalSales: number;
  totalCommission: number;
  ordersCount: number;
  joinedAt: string;
  lastOrderAt?: string;
};

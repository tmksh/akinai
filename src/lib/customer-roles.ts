/** 会員種別ラベルの型定義とデフォルト値（'use server' 非依存）*/

export interface CustomerRoleLabels {
  personal: string;
  buyer: string;
  supplier: string;
}

export const DEFAULT_CUSTOMER_ROLE_LABELS: CustomerRoleLabels = {
  personal: '個人会員',
  buyer: 'バイヤー',
  supplier: 'サプライヤー',
};

export interface CustomerRoleEnabled {
  personal: boolean;
  buyer: boolean;
  supplier: boolean;
}

export const DEFAULT_CUSTOMER_ROLE_ENABLED: CustomerRoleEnabled = {
  personal: true,
  buyer: true,
  supplier: true,
};

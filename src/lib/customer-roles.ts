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

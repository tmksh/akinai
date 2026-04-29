/**
 * Customer Subscription Plans
 *
 * テナント（組織）が顧客（customers）向けに任意のサブスクリプションプランを定義できる仕組み。
 * Stripe Connect 上の Product / Price と紐づけ、organizations.settings に保存する。
 *
 * 「サプライヤー専用」のような特定ロール固定ではなく、targetRole に任意の
 * customers.role 値（personal / buyer / supplier）を指定する汎用設計。
 */

export type CustomerRoleKey = 'personal' | 'buyer' | 'supplier';
export type SubscriptionInterval = 'month' | 'year';

/** 1つのプラン定義 */
export interface CustomerSubscriptionPlan {
  /** プランID（Akinai 側で生成する UUID） */
  id: string;
  /** 対象会員種別（customers.role に対応） */
  targetRole: CustomerRoleKey;
  /** プラン名（テナントが自由に命名） */
  name: string;
  /** 説明 */
  description: string;
  /** 料金（最小単位ではなく「円」単位で保存） */
  amount: number;
  /** 通貨 */
  currency: string;
  /** 課金周期 */
  interval: SubscriptionInterval;
  /** Stripe Product ID（Connected Account 上） */
  stripeProductId: string;
  /** Stripe Price ID（Connected Account 上） */
  stripePriceId: string;
  /** 特典（箇条書き表示用） */
  features: string[];
  /** 有効/無効フラグ */
  isActive: boolean;
  /** 表示順 */
  sortOrder: number;
  /** 作成日時（ISO 8601） */
  createdAt: string;
  /** 更新日時（ISO 8601） */
  updatedAt: string;
}

/** organizations.settings.customer_subscription_plans に格納する全体構造 */
export interface CustomerSubscriptionPlansSettings {
  enabled: boolean;
  plans: CustomerSubscriptionPlan[];
}

export const DEFAULT_CUSTOMER_SUBSCRIPTION_PLANS_SETTINGS: CustomerSubscriptionPlansSettings = {
  enabled: false,
  plans: [],
};

/** customers.custom_fields.subscription に格納する個別契約情報 */
export interface CustomerSubscriptionInfo {
  /** 契約中のプランID（CustomerSubscriptionPlan.id） */
  planId: string;
  /** Stripe Subscription ID */
  stripeSubscriptionId: string;
  /** Stripe Customer ID（Connected Account 上） */
  stripeCustomerId: string;
  /** Stripe 上の状態 */
  status:
    | 'trialing'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'unpaid'
    | 'paused';
  /** 現在の課金期間終了日（ISO 8601） */
  currentPeriodEnd: string | null;
  /** 期間終了時に解約予定か */
  cancelAtPeriodEnd: boolean;
  /** 契約開始日（ISO 8601） */
  startedAt: string;
  /** 最終更新日（ISO 8601） */
  updatedAt: string;
}

/** customer_subscription_plans 設定を organizations.settings から取り出す */
export function readPlansSettings(
  settings: Record<string, unknown> | null | undefined
): CustomerSubscriptionPlansSettings {
  const raw = settings?.customer_subscription_plans as Partial<CustomerSubscriptionPlansSettings> | undefined;
  if (!raw) return { ...DEFAULT_CUSTOMER_SUBSCRIPTION_PLANS_SETTINGS };
  return {
    enabled: raw.enabled === true,
    plans: Array.isArray(raw.plans) ? raw.plans : [],
  };
}

/** customers.custom_fields.subscription を取り出す */
export function readSubscriptionInfo(
  customFields: Record<string, unknown> | null | undefined
): CustomerSubscriptionInfo | null {
  const sub = customFields?.subscription as CustomerSubscriptionInfo | undefined;
  return sub || null;
}

/** プランの最小単位金額を返す（JPY なら整数） */
export function toStripeUnitAmount(amount: number, currency: string): number {
  // JPY などのゼロ小数通貨はそのまま、それ以外は ×100
  const zeroDecimal = ['jpy', 'krw', 'vnd'];
  if (zeroDecimal.includes(currency.toLowerCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

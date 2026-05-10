/**
 * Customer One-Time Services
 *
 * テナント（組織）が顧客向けに単発払いの無形サービスを定義できる仕組み。
 * Stripe Connect 上の Product / one-time Price と紐づけ、organizations.settings に保存する。
 *
 * 例: 特集記事掲載、LP作成代行、コンサルティング など
 */

/** 1つのサービス定義 */
export interface CustomerOneTimeService {
  /** サービスID（Akinai 側で生成する UUID） */
  id: string;
  /** サービス名 */
  name: string;
  /** 説明 */
  description: string;
  /** 料金（円単位） */
  amount: number;
  /** 通貨 */
  currency: string;
  /** Stripe Product ID（Connected Account 上） */
  stripeProductId: string;
  /** Stripe Price ID（Connected Account 上） */
  stripePriceId: string;
  /** 特典・内容（箇条書き表示用） */
  features: string[];
  /** 有効/無効フラグ */
  isActive: boolean;
  /** 管理画面での表示順（並べ替え用） */
  sortOrder: number;
  /**
   * 外部TOP表示の優先度。
   * - 小さい正の整数ほど優先的に表示される。
   * - 0 または未設定の場合は外部TOPに非表示。
   */
  displayOrder?: number;
  /** サービスのサムネイル画像URL（公開API用） */
  imageUrl?: string;
  /**
   * 対象会員種別。
   * - 'supplier' : サプライヤー向け
   * - 'buyer'    : バイヤー向け
   * - 'both'     : 両方
   * - undefined  : 指定なし（任意項目）
   */
  targetRole?: 'supplier' | 'buyer' | 'both';
  /**
   * 統一カテゴリ。外部TOPでのグルーピング表示などに利用する任意項目。
   * 値は CUSTOMER_SERVICE_CATEGORIES のいずれか。
   */
  category?: CustomerServiceCategory;
  /** 受注後に顧客へ案内する Google フォーム等のURL（サプライヤー向け、任意） */
  googleFormUrl?: string;
  /** バイヤー向けに案内する Google フォーム等のURL（任意） */
  buyerGoogleFormUrl?: string;
  /** 作成日時（ISO 8601） */
  createdAt: string;
  /** 更新日時（ISO 8601） */
  updatedAt: string;
}

/** targetRole として有効な値 */
export const CUSTOMER_SERVICE_TARGET_ROLES = ['supplier', 'buyer', 'both'] as const;
export type CustomerServiceTargetRole = (typeof CUSTOMER_SERVICE_TARGET_ROLES)[number];

/** 任意の値を受け取り、有効な targetRole なら返す。それ以外は undefined */
export function normalizeTargetRole(value: unknown): CustomerServiceTargetRole | undefined {
  if (typeof value !== 'string') return undefined;
  return (CUSTOMER_SERVICE_TARGET_ROLES as readonly string[]).includes(value)
    ? (value as CustomerServiceTargetRole)
    : undefined;
}

/** category として有効な値（統一カテゴリ） */
export const CUSTOMER_SERVICE_CATEGORIES = [
  '商品の魅力を形にする',
  '情報を発信する',
  '販路を開く',
  'ビジネスの土台をサポート',
] as const;
export type CustomerServiceCategory = (typeof CUSTOMER_SERVICE_CATEGORIES)[number];

/** 任意の値を受け取り、有効な category なら返す。それ以外は undefined */
export function normalizeCategory(value: unknown): CustomerServiceCategory | undefined {
  if (typeof value !== 'string') return undefined;
  return (CUSTOMER_SERVICE_CATEGORIES as readonly string[]).includes(value)
    ? (value as CustomerServiceCategory)
    : undefined;
}

/** 任意の値を受け取り、有効な URL 文字列ならトリムして返す。それ以外は undefined */
export function normalizeGoogleFormUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return trimmed;
  } catch {
    return undefined;
  }
}

/** organizations.settings.customer_one_time_services に格納する全体構造 */
export interface CustomerOneTimeServicesSettings {
  enabled: boolean;
  services: CustomerOneTimeService[];
}

export const DEFAULT_CUSTOMER_ONE_TIME_SERVICES_SETTINGS: CustomerOneTimeServicesSettings = {
  enabled: false,
  services: [],
};

/** customer_one_time_services 設定を organizations.settings から取り出す */
export function readOneTimeServicesSettings(
  settings: Record<string, unknown> | null | undefined
): CustomerOneTimeServicesSettings {
  const raw = settings?.customer_one_time_services as
    | Partial<CustomerOneTimeServicesSettings>
    | undefined;
  if (!raw) return { ...DEFAULT_CUSTOMER_ONE_TIME_SERVICES_SETTINGS };
  return {
    enabled: raw.enabled === true,
    services: Array.isArray(raw.services) ? raw.services : [],
  };
}

/** プランの最小単位金額を返す（JPY なら整数） */
export function toStripeUnitAmount(amount: number, currency: string): number {
  const zeroDecimal = ['jpy', 'krw', 'vnd'];
  if (zeroDecimal.includes(currency.toLowerCase())) {
    return Math.round(amount);
  }
  return Math.round(amount * 100);
}

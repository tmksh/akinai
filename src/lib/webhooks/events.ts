// ============================================
// Webhookイベント定義
// ============================================

// イベントタイプ一覧
export const WEBHOOK_EVENTS = {
  // 注文関連
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',

  // 見積関連
  QUOTE_CREATED: 'quote.created',
  QUOTE_SENT: 'quote.sent',
  QUOTE_ACCEPTED: 'quote.accepted',
  QUOTE_REJECTED: 'quote.rejected',
  QUOTE_EXPIRED: 'quote.expired',

  // 商品関連
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted',
  PRODUCT_PUBLISHED: 'product.published',

  // 顧客関連
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',

  // 在庫関連
  INVENTORY_LOW_STOCK: 'inventory.low_stock',
  INVENTORY_OUT_OF_STOCK: 'inventory.out_of_stock',
  INVENTORY_UPDATED: 'inventory.updated',

  // 請求関連（Phase 3で追加予定）
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_OVERDUE: 'invoice.overdue',
} as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS];

// イベントカテゴリ
export const EVENT_CATEGORIES = {
  order: {
    label: '注文',
    events: [
      { type: WEBHOOK_EVENTS.ORDER_CREATED, label: '注文作成' },
      { type: WEBHOOK_EVENTS.ORDER_UPDATED, label: '注文更新' },
      { type: WEBHOOK_EVENTS.ORDER_SHIPPED, label: '出荷完了' },
      { type: WEBHOOK_EVENTS.ORDER_DELIVERED, label: '配達完了' },
      { type: WEBHOOK_EVENTS.ORDER_CANCELLED, label: '注文キャンセル' },
    ],
  },
  quote: {
    label: '見積',
    events: [
      { type: WEBHOOK_EVENTS.QUOTE_CREATED, label: '見積作成' },
      { type: WEBHOOK_EVENTS.QUOTE_SENT, label: '見積送信' },
      { type: WEBHOOK_EVENTS.QUOTE_ACCEPTED, label: '見積承認' },
      { type: WEBHOOK_EVENTS.QUOTE_REJECTED, label: '見積却下' },
      { type: WEBHOOK_EVENTS.QUOTE_EXPIRED, label: '見積期限切れ' },
    ],
  },
  product: {
    label: '商品',
    events: [
      { type: WEBHOOK_EVENTS.PRODUCT_CREATED, label: '商品作成' },
      { type: WEBHOOK_EVENTS.PRODUCT_UPDATED, label: '商品更新' },
      { type: WEBHOOK_EVENTS.PRODUCT_DELETED, label: '商品削除' },
      { type: WEBHOOK_EVENTS.PRODUCT_PUBLISHED, label: '商品公開' },
    ],
  },
  customer: {
    label: '顧客',
    events: [
      { type: WEBHOOK_EVENTS.CUSTOMER_CREATED, label: '顧客登録' },
      { type: WEBHOOK_EVENTS.CUSTOMER_UPDATED, label: '顧客更新' },
    ],
  },
  inventory: {
    label: '在庫',
    events: [
      { type: WEBHOOK_EVENTS.INVENTORY_LOW_STOCK, label: '在庫僅少' },
      { type: WEBHOOK_EVENTS.INVENTORY_OUT_OF_STOCK, label: '在庫切れ' },
      { type: WEBHOOK_EVENTS.INVENTORY_UPDATED, label: '在庫更新' },
    ],
  },
} as const;

// Webhookペイロードの基本構造
export interface WebhookPayload<T = unknown> {
  id: string;
  event: WebhookEventType;
  created_at: string;
  organization_id: string;
  data: T;
}

// 各イベントのペイロード型
export interface OrderEventData {
  order_id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  status: string;
  payment_status: string;
  total: number;
  items: Array<{
    product_id: string | null;
    variant_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface QuoteEventData {
  quote_id: string;
  quote_number: string;
  customer_id: string | null;
  customer_name: string;
  status: string;
  total: number;
  valid_until: string;
  items: Array<{
    product_id: string | null;
    variant_id: string | null;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface ProductEventData {
  product_id: string;
  name: string;
  slug: string;
  status: string;
  variants: Array<{
    variant_id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
  }>;
}

export interface CustomerEventData {
  customer_id: string;
  type: 'individual' | 'business';
  name: string;
  email: string;
  company: string | null;
}

export interface InventoryEventData {
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_name: string;
  sku: string;
  current_stock: number;
  threshold: number;
}

// イベントラベルを取得
export function getEventLabel(eventType: string): string {
  for (const category of Object.values(EVENT_CATEGORIES)) {
    const event = category.events.find((e) => e.type === eventType);
    if (event) {
      return event.label;
    }
  }
  return eventType;
}

// すべてのイベントタイプを取得
export function getAllEventTypes(): WebhookEventType[] {
  return Object.values(WEBHOOK_EVENTS);
}

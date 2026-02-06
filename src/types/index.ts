// ============================================
// 商い（アキナイ）CMS - 型定義
// ============================================

// ----- 共通型 -----
export type ID = string;
export type Timestamp = string; // ISO 8601 format

export interface BaseEntity {
  id: ID;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ----- ユーザー・認証 -----
export type UserRole = 'admin' | 'manager' | 'editor' | 'viewer';

export interface User extends BaseEntity {
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Timestamp;
}

export interface Permission {
  module: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

// ----- 商品管理 -----
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface ProductImage {
  id: ID;
  url: string;
  alt: string;
  order: number;
}

export interface ProductVariant {
  id: ID;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  options: Record<string, string>;
}

// ----- カスタムフィールド -----
export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'url'
  | 'email'
  | 'phone'
  | 'color'
  | 'rating'
  | 'image_url'
  | 'list'
  | 'select'
  | 'json';

export interface CustomField {
  id: string;
  key: string;
  label: string;
  value: string;
  type: CustomFieldType;
  options?: string[];
}

export interface Product extends BaseEntity {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  status: ProductStatus;
  images: ProductImage[];
  variants: ProductVariant[];
  categoryIds: ID[];
  tags: string[];
  customFields: CustomField[];
  seoTitle?: string;
  seoDescription?: string;
  featured: boolean;
  publishedAt?: Timestamp;
}

export interface Category extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  parentId?: ID;
  order: number;
  image?: string;
}

// ----- 在庫管理 -----
export type StockMovementType = 'in' | 'out' | 'adjustment';

export interface StockMovement extends BaseEntity {
  productId: ID;
  variantId: ID;
  type: StockMovementType;
  quantity: number;
  reason: string;
  userId: ID;
}

export interface InventorySummary {
  productId: ID;
  variantId: ID;
  productName: string;
  variantName: string;
  sku: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  lowStockThreshold: number;
  isLowStock: boolean;
}

// ----- コンテンツ管理 -----
export type ContentType = 'article' | 'news' | 'page' | 'feature';
export type ContentStatus = 'draft' | 'review' | 'published' | 'archived';

export interface ContentBlock {
  id: ID;
  type: 'text' | 'image' | 'product' | 'html' | 'quote' | 'video';
  content: Record<string, unknown>;
  order: number;
}

export interface Content extends BaseEntity {
  type: ContentType;
  title: string;
  slug: string;
  excerpt?: string;
  blocks: ContentBlock[];
  status: ContentStatus;
  authorId: ID;
  featuredImage?: string;
  categoryIds: ID[];
  tags: string[];
  relatedProductIds: ID[];
  seoTitle?: string;
  seoDescription?: string;
  publishedAt?: Timestamp;
  scheduledAt?: Timestamp;
}

export interface ContentCategory extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  type: ContentType;
  parentId?: ID;
  order: number;
}

// ----- 注文管理 -----
export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  id: ID;
  productId: ID;
  variantId: ID;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Address {
  postalCode: string;
  prefecture: string;
  city: string;
  line1: string;
  line2?: string;
  phone: string;
}

export interface Order extends BaseEntity {
  orderNumber: string;
  customerId: ID;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  shippingAddress: Address;
  billingAddress?: Address;
  notes?: string;
  trackingNumber?: string;
  shippedAt?: Timestamp;
  deliveredAt?: Timestamp;
}

// ----- 見積管理（B2B） -----
export type QuoteStatus = 
  | 'draft' 
  | 'sent' 
  | 'negotiating' 
  | 'accepted' 
  | 'rejected' 
  | 'expired' 
  | 'ordered';

export interface QuoteItem {
  id: ID;
  productId: ID;
  variantId: ID;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  notes?: string;
}

export interface Quote extends BaseEntity {
  quoteNumber: string;
  customerId: ID;
  customerName: string;
  customerCompany: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: QuoteStatus;
  validUntil: Timestamp;
  notes?: string;
  terms?: string;
  orderId?: ID;
}

// ----- 顧客管理 -----
export type CustomerType = 'individual' | 'business';

export interface Customer extends BaseEntity {
  type: CustomerType;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  addresses: Address[];
  defaultAddressIndex: number;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  tags: string[];
}

// ----- ダッシュボード -----
export interface DashboardStats {
  totalRevenue: number;
  revenueChange: number;
  totalOrders: number;
  ordersChange: number;
  totalProducts: number;
  productsChange: number;
  totalCustomers: number;
  customersChange: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  id: ID;
  name: string;
  image?: string;
  sales: number;
  revenue: number;
}

export interface RecentOrder {
  id: ID;
  orderNumber: string;
  customerName: string;
  total: number;
  status: OrderStatus;
  createdAt: Timestamp;
}

// ----- 設定・機能フラグ -----
export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  module: string;
}

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  logo?: string;
  favicon?: string;
  primaryColor: string;
  currency: string;
  timezone: string;
  defaultLanguage: string;
  taxRate: number;
  shippingSettings: {
    freeShippingThreshold?: number;
    defaultShippingCost: number;
  };
}

// ----- ショップテーマ設定 -----
export type ShopSectionId = 
  | 'hero'
  | 'concept'
  | 'featured'
  | 'category'
  | 'articles'
  | 'popular'
  | 'business'
  | 'news'
  | 'instagram'
  | 'brand';

export interface ShopSection {
  id: ShopSectionId;
  name: string;
  enabled: boolean;
  order: number;
}

export type FontFamily = 
  | 'noto-sans'      // Noto Sans JP（ゴシック）
  | 'noto-serif'     // Noto Serif JP（明朝）
  | 'zen-kaku'       // Zen Kaku Gothic（ゴシック）
  | 'zen-maru'       // Zen Maru Gothic（丸ゴシック）
  | 'shippori-mincho'; // しっぽり明朝

export type FontSize = 'small' | 'medium' | 'large';

export interface ShopThemeColors {
  primary: string;      // プライマリカラー（ボタン、リンクなど）
  secondary: string;    // セカンダリカラー
  background: string;   // メイン背景色
  surface: string;      // カード・セクション背景色
  text: string;         // メインテキスト色
  textMuted: string;    // サブテキスト色
  accent: string;       // アクセントカラー
  border: string;       // ボーダー色
}

export interface ShopThemeFonts {
  heading: FontFamily;
  body: FontFamily;
  size: FontSize;
}

export interface ShopThemeHeader {
  logoText: string;
  bannerText: string;
  bannerEnabled: boolean;
  bannerBackgroundColor: string;
  bannerTextColor: string;
}

export interface ShopThemeFooter {
  copyrightText: string;
  showNewsletter: boolean;
  showSocialLinks: boolean;
}

export interface ShopThemeSettings {
  sections: ShopSection[];
  colors: ShopThemeColors;
  fonts: ShopThemeFonts;
  header: ShopThemeHeader;
  footer: ShopThemeFooter;
}

// デフォルトテーマ設定
export const DEFAULT_SHOP_THEME: ShopThemeSettings = {
  sections: [
    { id: 'hero', name: 'ヒーロー', enabled: true, order: 0 },
    { id: 'concept', name: 'コンセプト', enabled: true, order: 1 },
    { id: 'featured', name: '注目製品', enabled: true, order: 2 },
    { id: 'category', name: 'カテゴリー', enabled: true, order: 3 },
    { id: 'articles', name: '読みもの', enabled: true, order: 4 },
    { id: 'popular', name: '人気製品', enabled: true, order: 5 },
    { id: 'business', name: '法人向け', enabled: true, order: 6 },
    { id: 'news', name: 'ニュース', enabled: true, order: 7 },
    { id: 'instagram', name: 'Instagram', enabled: true, order: 8 },
    { id: 'brand', name: 'ブランドイメージ', enabled: true, order: 9 },
  ],
  colors: {
    primary: '#f59e0b',
    secondary: '#ea580c',
    background: '#ffffff',
    surface: '#faf8f5',
    text: '#1e293b',
    textMuted: '#64748b',
    accent: '#f59e0b',
    border: '#e2e8f0',
  },
  fonts: {
    heading: 'noto-sans',
    body: 'noto-sans',
    size: 'medium',
  },
  header: {
    logoText: 'AKINAI',
    bannerText: 'ご注文金額¥5,000以上で送料無料',
    bannerEnabled: true,
    bannerBackgroundColor: '#f5efe8',
    bannerTextColor: '#475569',
  },
  footer: {
    copyrightText: '© AKINAI All rights reserved.',
    showNewsletter: true,
    showSocialLinks: true,
  },
};

// ----- API レスポンス -----
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}







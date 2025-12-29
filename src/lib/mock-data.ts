// ============================================
// 商い（アキナイ）CMS - モックデータ
// ============================================

import type {
  User,
  Product,
  Category,
  Content,
  Order,
  Customer,
  Quote,
  DashboardStats,
  RevenueData,
  TopProduct,
  RecentOrder,
  InventorySummary,
  FeatureFlag,
} from '@/types';

// ----- ユーザー -----
export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'admin@akinai.jp',
    name: '管理者',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    role: 'admin',
    isActive: true,
    lastLoginAt: '2024-01-15T09:00:00Z',
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'user-2',
    email: 'editor@akinai.jp',
    name: '編集者',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=editor',
    role: 'editor',
    isActive: true,
    lastLoginAt: '2024-01-14T14:30:00Z',
    createdAt: '2023-08-15T00:00:00Z',
    updatedAt: '2024-01-14T14:30:00Z',
  },
  {
    id: 'user-3',
    email: 'manager@akinai.jp',
    name: 'マネージャー',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=manager',
    role: 'manager',
    isActive: true,
    createdAt: '2023-07-20T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
];

export const currentUser = mockUsers[0];

// ----- カテゴリー -----
export const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'アパレル',
    slug: 'apparel',
    description: 'ファッションアイテム',
    order: 1,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2023-06-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    name: 'アクセサリー',
    slug: 'accessories',
    description: 'ジュエリー・小物',
    order: 2,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2023-06-01T00:00:00Z',
  },
  {
    id: 'cat-3',
    name: 'ホームグッズ',
    slug: 'home-goods',
    description: '生活雑貨',
    order: 3,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2023-06-01T00:00:00Z',
  },
  {
    id: 'cat-4',
    name: 'フード',
    slug: 'food',
    description: '食品・飲料',
    order: 4,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2023-06-01T00:00:00Z',
  },
];

// ----- 商品 -----
export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'オーガニックコットンTシャツ',
    slug: 'organic-cotton-tshirt',
    description: '環境に優しいオーガニックコットン100%使用。肌触りが良く、着心地抜群のTシャツです。',
    shortDescription: 'オーガニックコットン100%の上質Tシャツ',
    status: 'published',
    images: [
      { id: 'img-1', url: 'https://picsum.photos/seed/tshirt1/800/800', alt: 'Tシャツ正面', order: 0 },
      { id: 'img-2', url: 'https://picsum.photos/seed/tshirt2/800/800', alt: 'Tシャツ背面', order: 1 },
    ],
    variants: [
      { id: 'var-1', name: 'ホワイト / S', sku: 'OCT-WH-S', price: 4980, stock: 25, options: { color: 'ホワイト', size: 'S' } },
      { id: 'var-2', name: 'ホワイト / M', sku: 'OCT-WH-M', price: 4980, stock: 30, options: { color: 'ホワイト', size: 'M' } },
      { id: 'var-3', name: 'ホワイト / L', sku: 'OCT-WH-L', price: 4980, stock: 20, options: { color: 'ホワイト', size: 'L' } },
      { id: 'var-4', name: 'ネイビー / M', sku: 'OCT-NV-M', price: 4980, stock: 15, options: { color: 'ネイビー', size: 'M' } },
    ],
    categoryIds: ['cat-1'],
    tags: ['オーガニック', 'Tシャツ', 'サステナブル'],
    featured: true,
    publishedAt: '2024-01-01T00:00:00Z',
    createdAt: '2023-12-15T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'prod-2',
    name: '手作り革財布',
    slug: 'handmade-leather-wallet',
    description: '職人が一つ一つ丁寧に作り上げた本革財布。使い込むほどに味が出ます。',
    shortDescription: '職人手作りの本革財布',
    status: 'published',
    images: [
      { id: 'img-3', url: 'https://picsum.photos/seed/wallet1/800/800', alt: '財布正面', order: 0 },
    ],
    variants: [
      { id: 'var-5', name: 'ブラウン', sku: 'HLW-BR', price: 18000, compareAtPrice: 22000, stock: 8, options: { color: 'ブラウン' } },
      { id: 'var-6', name: 'ブラック', sku: 'HLW-BK', price: 18000, compareAtPrice: 22000, stock: 5, options: { color: 'ブラック' } },
    ],
    categoryIds: ['cat-2'],
    tags: ['革製品', '財布', 'ハンドメイド'],
    featured: true,
    publishedAt: '2024-01-05T00:00:00Z',
    createdAt: '2023-12-20T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
  },
  {
    id: 'prod-3',
    name: '陶器マグカップ',
    slug: 'ceramic-mug',
    description: '伝統的な技法で作られた陶器のマグカップ。温かみのある風合いが特徴です。',
    shortDescription: '伝統陶器のマグカップ',
    status: 'published',
    images: [
      { id: 'img-4', url: 'https://picsum.photos/seed/mug1/800/800', alt: 'マグカップ', order: 0 },
    ],
    variants: [
      { id: 'var-7', name: '白釉', sku: 'CM-WH', price: 3200, stock: 40, options: { color: '白釉' } },
      { id: 'var-8', name: '青釉', sku: 'CM-BL', price: 3200, stock: 35, options: { color: '青釉' } },
    ],
    categoryIds: ['cat-3'],
    tags: ['陶器', 'マグカップ', '伝統工芸'],
    featured: false,
    publishedAt: '2024-01-02T00:00:00Z',
    createdAt: '2023-12-18T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'prod-4',
    name: '特選日本茶セット',
    slug: 'premium-japanese-tea-set',
    description: '厳選された茶葉を使用した日本茶のギフトセット。煎茶、ほうじ茶、玄米茶の3種入り。',
    shortDescription: '厳選日本茶3種セット',
    status: 'published',
    images: [
      { id: 'img-5', url: 'https://picsum.photos/seed/tea1/800/800', alt: '日本茶セット', order: 0 },
    ],
    variants: [
      { id: 'var-9', name: '通常セット', sku: 'JTS-STD', price: 5500, stock: 50, options: { type: '通常' } },
      { id: 'var-10', name: 'ギフトボックス', sku: 'JTS-GFT', price: 6800, stock: 25, options: { type: 'ギフト' } },
    ],
    categoryIds: ['cat-4'],
    tags: ['日本茶', 'ギフト', '茶葉'],
    featured: true,
    publishedAt: '2024-01-03T00:00:00Z',
    createdAt: '2023-12-22T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
  {
    id: 'prod-5',
    name: 'リネンブラウス',
    slug: 'linen-blouse',
    description: '上質なリネン素材を使用したブラウス。涼しげで夏にぴったりのアイテム。',
    shortDescription: '上質リネンのブラウス',
    status: 'draft',
    images: [
      { id: 'img-6', url: 'https://picsum.photos/seed/blouse1/800/800', alt: 'ブラウス', order: 0 },
    ],
    variants: [
      { id: 'var-11', name: 'ベージュ / F', sku: 'LB-BG-F', price: 12800, stock: 12, options: { color: 'ベージュ', size: 'F' } },
    ],
    categoryIds: ['cat-1'],
    tags: ['リネン', 'ブラウス', '夏物'],
    featured: false,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
  },
];

// ----- コンテンツ -----
export const mockContents: Content[] = [
  {
    id: 'content-1',
    type: 'article',
    title: '職人の手仕事 — 革財布ができるまで',
    slug: 'craftsman-leather-wallet-story',
    excerpt: '一つの革財布が完成するまでの工程を、職人のインタビューとともにお届けします。',
    blocks: [
      { id: 'block-1', type: 'text', content: { text: '熟練の職人が一針一針、丁寧に縫い上げる革財布。その製作工程には、長年培われた技術と想いが込められています。' }, order: 0 },
      { id: 'block-2', type: 'image', content: { url: 'https://picsum.photos/seed/craft1/1200/600', alt: '職人の作業風景' }, order: 1 },
      { id: 'block-3', type: 'product', content: { productId: 'prod-2' }, order: 2 },
    ],
    status: 'published',
    authorId: 'user-2',
    featuredImage: 'https://picsum.photos/seed/craft1/1200/600',
    categoryIds: [],
    tags: ['職人', 'ストーリー', '革製品'],
    relatedProductIds: ['prod-2'],
    publishedAt: '2024-01-08T00:00:00Z',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
  },
  {
    id: 'content-2',
    type: 'news',
    title: '新春セール開催のお知らせ',
    slug: 'new-year-sale-2024',
    excerpt: '2024年新春セールを開催いたします。期間限定の特別価格をお見逃しなく。',
    blocks: [
      { id: 'block-4', type: 'text', content: { text: '日頃のご愛顧に感謝を込めて、新春セールを開催いたします。' }, order: 0 },
    ],
    status: 'published',
    authorId: 'user-1',
    categoryIds: [],
    tags: ['セール', 'お知らせ'],
    relatedProductIds: [],
    publishedAt: '2024-01-01T00:00:00Z',
    createdAt: '2023-12-28T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'content-3',
    type: 'feature',
    title: '春の新作コレクション 2024',
    slug: 'spring-collection-2024',
    excerpt: '春を彩る新作アイテムを一挙にご紹介。',
    blocks: [
      { id: 'block-5', type: 'text', content: { text: '2024年春の新作コレクションが登場。' }, order: 0 },
    ],
    status: 'draft',
    authorId: 'user-2',
    featuredImage: 'https://picsum.photos/seed/spring1/1200/600',
    categoryIds: [],
    tags: ['特集', '新作', '春物'],
    relatedProductIds: ['prod-1', 'prod-5'],
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
  },
];

// ----- 顧客 -----
export const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    type: 'individual',
    name: '山田 太郎',
    email: 'yamada@example.com',
    phone: '090-1234-5678',
    addresses: [
      { postalCode: '100-0001', prefecture: '東京都', city: '千代田区', line1: '丸の内1-1-1', phone: '090-1234-5678' },
    ],
    defaultAddressIndex: 0,
    totalOrders: 5,
    totalSpent: 45000,
    tags: ['リピーター'],
    createdAt: '2023-08-01T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'cust-2',
    type: 'business',
    name: '田中 花子',
    email: 'tanaka@company.co.jp',
    phone: '03-1234-5678',
    company: '株式会社サンプル',
    addresses: [
      { postalCode: '150-0001', prefecture: '東京都', city: '渋谷区', line1: '渋谷2-2-2', line2: 'サンプルビル3F', phone: '03-1234-5678' },
    ],
    defaultAddressIndex: 0,
    notes: '法人取引先。請求書払い対応。',
    totalOrders: 12,
    totalSpent: 280000,
    tags: ['法人', 'VIP'],
    createdAt: '2023-06-15T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
  },
];

// ----- 注文 -----
export const mockOrders: Order[] = [
  {
    id: 'order-1',
    orderNumber: 'AK-2024-0001',
    customerId: 'cust-1',
    customerName: '山田 太郎',
    customerEmail: 'yamada@example.com',
    items: [
      { id: 'oi-1', productId: 'prod-1', variantId: 'var-2', productName: 'オーガニックコットンTシャツ', variantName: 'ホワイト / M', sku: 'OCT-WH-M', quantity: 2, unitPrice: 4980, totalPrice: 9960 },
      { id: 'oi-2', productId: 'prod-3', variantId: 'var-7', productName: '陶器マグカップ', variantName: '白釉', sku: 'CM-WH', quantity: 1, unitPrice: 3200, totalPrice: 3200 },
    ],
    subtotal: 13160,
    shippingCost: 550,
    tax: 1316,
    total: 15026,
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'クレジットカード',
    shippingAddress: { postalCode: '100-0001', prefecture: '東京都', city: '千代田区', line1: '丸の内1-1-1', phone: '090-1234-5678' },
    trackingNumber: '1234567890',
    shippedAt: '2024-01-10T10:00:00Z',
    deliveredAt: '2024-01-12T14:00:00Z',
    createdAt: '2024-01-08T15:30:00Z',
    updatedAt: '2024-01-12T14:00:00Z',
  },
  {
    id: 'order-2',
    orderNumber: 'AK-2024-0002',
    customerId: 'cust-2',
    customerName: '田中 花子',
    customerEmail: 'tanaka@company.co.jp',
    items: [
      { id: 'oi-3', productId: 'prod-2', variantId: 'var-5', productName: '手作り革財布', variantName: 'ブラウン', sku: 'HLW-BR', quantity: 3, unitPrice: 18000, totalPrice: 54000 },
    ],
    subtotal: 54000,
    shippingCost: 0,
    tax: 5400,
    total: 59400,
    status: 'processing',
    paymentStatus: 'paid',
    paymentMethod: '請求書払い',
    shippingAddress: { postalCode: '150-0001', prefecture: '東京都', city: '渋谷区', line1: '渋谷2-2-2', line2: 'サンプルビル3F', phone: '03-1234-5678' },
    notes: '法人ギフト用。のし掛け希望。',
    createdAt: '2024-01-12T10:00:00Z',
    updatedAt: '2024-01-12T10:00:00Z',
  },
  {
    id: 'order-3',
    orderNumber: 'AK-2024-0003',
    customerId: 'cust-1',
    customerName: '山田 太郎',
    customerEmail: 'yamada@example.com',
    items: [
      { id: 'oi-4', productId: 'prod-4', variantId: 'var-10', productName: '特選日本茶セット', variantName: 'ギフトボックス', sku: 'JTS-GFT', quantity: 1, unitPrice: 6800, totalPrice: 6800 },
    ],
    subtotal: 6800,
    shippingCost: 550,
    tax: 680,
    total: 8030,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'コンビニ払い',
    shippingAddress: { postalCode: '100-0001', prefecture: '東京都', city: '千代田区', line1: '丸の内1-1-1', phone: '090-1234-5678' },
    createdAt: '2024-01-14T09:00:00Z',
    updatedAt: '2024-01-14T09:00:00Z',
  },
];

// ----- 見積 -----
export const mockQuotes: Quote[] = [
  {
    id: 'quote-1',
    quoteNumber: 'QT-2024-0001',
    customerId: 'cust-2',
    customerName: '田中 花子',
    customerCompany: '株式会社サンプル',
    items: [
      { id: 'qi-1', productId: 'prod-1', variantId: 'var-2', productName: 'オーガニックコットンTシャツ', variantName: 'ホワイト / M', quantity: 50, unitPrice: 4980, discount: 10, totalPrice: 224100 },
    ],
    subtotal: 249000,
    discount: 24900,
    tax: 22410,
    total: 246510,
    status: 'sent',
    validUntil: '2024-02-15T00:00:00Z',
    notes: '社員用ユニフォームとして検討中',
    terms: '納期：ご注文から2週間以内\n支払条件：月末締め翌月末払い',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
];

// ----- ダッシュボード -----
export const mockDashboardStats: DashboardStats = {
  totalRevenue: 2580000,
  revenueChange: 12.5,
  totalOrders: 156,
  ordersChange: 8.2,
  totalProducts: 48,
  productsChange: 4,
  totalCustomers: 89,
  customersChange: 15.3,
};

export const mockRevenueData: RevenueData[] = [
  { date: '2024-01-08', revenue: 125000, orders: 8 },
  { date: '2024-01-09', revenue: 98000, orders: 6 },
  { date: '2024-01-10', revenue: 156000, orders: 10 },
  { date: '2024-01-11', revenue: 134000, orders: 9 },
  { date: '2024-01-12', revenue: 178000, orders: 12 },
  { date: '2024-01-13', revenue: 89000, orders: 5 },
  { date: '2024-01-14', revenue: 112000, orders: 7 },
];

export const mockTopProducts: TopProduct[] = [
  { id: 'prod-1', name: 'オーガニックコットンTシャツ', image: 'https://picsum.photos/seed/tshirt1/100/100', sales: 45, revenue: 224100 },
  { id: 'prod-2', name: '手作り革財布', image: 'https://picsum.photos/seed/wallet1/100/100', sales: 23, revenue: 414000 },
  { id: 'prod-4', name: '特選日本茶セット', image: 'https://picsum.photos/seed/tea1/100/100', sales: 38, revenue: 234600 },
  { id: 'prod-3', name: '陶器マグカップ', image: 'https://picsum.photos/seed/mug1/100/100', sales: 52, revenue: 166400 },
];

export const mockRecentOrders: RecentOrder[] = [
  { id: 'order-3', orderNumber: 'AK-2024-0003', customerName: '山田 太郎', total: 8030, status: 'pending', createdAt: '2024-01-14T09:00:00Z' },
  { id: 'order-2', orderNumber: 'AK-2024-0002', customerName: '田中 花子', total: 59400, status: 'processing', createdAt: '2024-01-12T10:00:00Z' },
  { id: 'order-1', orderNumber: 'AK-2024-0001', customerName: '山田 太郎', total: 15026, status: 'delivered', createdAt: '2024-01-08T15:30:00Z' },
];

// ----- 在庫 -----
export const mockInventorySummary: InventorySummary[] = [
  { productId: 'prod-1', variantId: 'var-1', productName: 'オーガニックコットンTシャツ', variantName: 'ホワイト / S', sku: 'OCT-WH-S', currentStock: 25, reservedStock: 2, availableStock: 23, lowStockThreshold: 10, isLowStock: false },
  { productId: 'prod-1', variantId: 'var-2', productName: 'オーガニックコットンTシャツ', variantName: 'ホワイト / M', sku: 'OCT-WH-M', currentStock: 30, reservedStock: 5, availableStock: 25, lowStockThreshold: 10, isLowStock: false },
  { productId: 'prod-2', variantId: 'var-5', productName: '手作り革財布', variantName: 'ブラウン', sku: 'HLW-BR', currentStock: 8, reservedStock: 3, availableStock: 5, lowStockThreshold: 10, isLowStock: true },
  { productId: 'prod-2', variantId: 'var-6', productName: '手作り革財布', variantName: 'ブラック', sku: 'HLW-BK', currentStock: 5, reservedStock: 0, availableStock: 5, lowStockThreshold: 10, isLowStock: true },
];

// ----- 機能フラグ -----
export const mockFeatureFlags: FeatureFlag[] = [
  { key: 'quotes', name: '見積機能', description: 'B2B向け見積フローを有効化', enabled: true, module: 'sales' },
  { key: 'inventory_advanced', name: '高度な在庫管理', description: 'ロット管理・取引先別在庫を有効化', enabled: false, module: 'inventory' },
  { key: 'content_scheduling', name: 'コンテンツ予約公開', description: '記事・ニュースの予約公開機能', enabled: true, module: 'content' },
  { key: 'ai_assist', name: 'AI支援機能', description: '文章生成・校正などのAI機能', enabled: false, module: 'ai' },
  { key: 'multi_currency', name: '多通貨対応', description: '複数通貨での価格設定・表示', enabled: false, module: 'settings' },
];

// ----- 設定 -----
export const mockSettings = {
  enableGuestCheckout: true,
  enableEstimates: true,
  enableAdvancedInventory: false,
  enableAgentManagement: true,
};


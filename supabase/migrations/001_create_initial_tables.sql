-- ============================================
-- アキナイCMS 初期テーブル作成
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ユーザーテーブル
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'editor', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. カテゴリテーブル（商品用）
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. 商品テーブル
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  tags TEXT[] DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  featured BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 商品カテゴリ中間テーブル
CREATE TABLE product_categories (
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

-- ============================================
-- 4. 商品画像テーブル
-- ============================================
CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. 商品バリアントテーブル
-- ============================================
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  stock INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  options JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. 顧客テーブル
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'business')),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  company TEXT,
  notes TEXT,
  total_orders INT DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. 顧客住所テーブル
-- ============================================
CREATE TABLE customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  postal_code TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  city TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  phone TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. 注文テーブル
-- ============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  shipping_cost DECIMAL(10, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT,
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  notes TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. 注文明細テーブル
-- ============================================
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. 見積テーブル
-- ============================================
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_company TEXT,
  subtotal DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'negotiating', 'accepted', 'rejected', 'expired', 'ordered')),
  valid_until TIMESTAMPTZ NOT NULL,
  notes TEXT,
  terms TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. 見積明細テーブル
-- ============================================
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  total_price DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. 在庫移動履歴テーブル
-- ============================================
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'transfer')),
  quantity INT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  reason TEXT,
  reference TEXT,
  lot_number TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. コンテンツカテゴリテーブル
-- ============================================
CREATE TABLE content_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('article', 'news', 'page', 'feature')),
  parent_id UUID REFERENCES content_categories(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. コンテンツテーブル
-- ============================================
CREATE TABLE contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('article', 'news', 'page', 'feature')),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  blocks JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  featured_image TEXT,
  tags TEXT[] DEFAULT '{}',
  related_product_ids UUID[] DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- コンテンツカテゴリ中間テーブル
CREATE TABLE content_category_relations (
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  category_id UUID REFERENCES content_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, category_id)
);

-- ============================================
-- インデックス作成
-- ============================================
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_contents_type ON contents(type);
CREATE INDEX idx_contents_status ON contents(status);
CREATE INDEX idx_stock_movements_variant_id ON stock_movements(variant_id);

-- ============================================
-- 更新日時自動更新トリガー
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contents_updated_at BEFORE UPDATE ON contents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_content_categories_updated_at BEFORE UPDATE ON content_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- マルチテナント対応マイグレーション
-- SaaS向け組織・テナント分離
-- ============================================

-- ============================================
-- 1. 組織（テナント）テーブル
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  -- フロントエンド連携用
  frontend_url TEXT,
  frontend_api_key TEXT,
  -- プラン情報
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  plan_started_at TIMESTAMPTZ DEFAULT NOW(),
  -- Stripe連携
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  -- 設定
  settings JSONB DEFAULT '{}',
  -- オーナー
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- メタデータ
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. 組織メンバーテーブル（ユーザー↔組織の関連）
-- ============================================
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'manager', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- 3. 招待テーブル
-- ============================================
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'editor', 'viewer')),
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. 既存テーブルにorganization_id追加
-- ============================================

-- users テーブル: current_organization_id追加（現在選択中の組織）
ALTER TABLE users ADD COLUMN current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- categories
ALTER TABLE categories ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- products
ALTER TABLE products ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- customers
ALTER TABLE customers ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
-- customers.emailはorganization内でユニークに変更
ALTER TABLE customers DROP CONSTRAINT customers_email_key;
ALTER TABLE customers ADD CONSTRAINT customers_email_org_unique UNIQUE (organization_id, email);

-- orders
ALTER TABLE orders ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- quotes
ALTER TABLE quotes ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- contents
ALTER TABLE contents ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- content_categories
ALTER TABLE content_categories ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================
-- 5. インデックス追加
-- ============================================
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_invitations_token ON organization_invitations(token);
CREATE INDEX idx_org_invitations_email ON organization_invitations(email);

CREATE INDEX idx_categories_org ON categories(organization_id);
CREATE INDEX idx_products_org ON products(organization_id);
CREATE INDEX idx_customers_org ON customers(organization_id);
CREATE INDEX idx_orders_org ON orders(organization_id);
CREATE INDEX idx_quotes_org ON quotes(organization_id);
CREATE INDEX idx_contents_org ON contents(organization_id);
CREATE INDEX idx_content_categories_org ON content_categories(organization_id);

-- ============================================
-- 6. 更新トリガー追加
-- ============================================
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_org_members_updated_at BEFORE UPDATE ON organization_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 7. RLS（Row Level Security）有効化
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_category_relations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. ヘルパー関数
-- ============================================

-- 現在のユーザーが所属する組織IDを取得
CREATE OR REPLACE FUNCTION get_user_organization_ids()
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT organization_id 
    FROM organization_members 
    WHERE user_id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 現在のユーザーの選択中の組織IDを取得
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT current_organization_id INTO org_id
  FROM users
  WHERE id = auth.uid();
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ユーザーが指定組織で指定ロール以上か確認
CREATE OR REPLACE FUNCTION has_organization_role(org_id UUID, required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND is_active = true
      AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. RLSポリシー定義
-- ============================================

-- organizations
CREATE POLICY "Users can view organizations they belong to"
  ON organizations FOR SELECT
  USING (id = ANY(get_user_organization_ids()));

CREATE POLICY "Owners and admins can update their organization"
  ON organizations FOR UPDATE
  USING (has_organization_role(id, ARRAY['owner', 'admin']));

-- organization_members
CREATE POLICY "Members can view other members in their organizations"
  ON organization_members FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Admins can manage members"
  ON organization_members FOR ALL
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin']));

-- organization_invitations
CREATE POLICY "Admins can manage invitations"
  ON organization_invitations FOR ALL
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin']));

-- categories (組織スコープ)
CREATE POLICY "Users can view categories in their organization"
  ON categories FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Editors+ can manage categories"
  ON categories FOR ALL
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin', 'manager', 'editor']));

-- products (組織スコープ)
CREATE POLICY "Users can view products in their organization"
  ON products FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Editors+ can manage products"
  ON products FOR ALL
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin', 'manager', 'editor']));

-- product_variants (親商品経由)
CREATE POLICY "Users can view variants"
  ON product_variants FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_variants.product_id 
    AND products.organization_id = ANY(get_user_organization_ids())
  ));

CREATE POLICY "Editors+ can manage variants"
  ON product_variants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_variants.product_id 
    AND has_organization_role(products.organization_id, ARRAY['owner', 'admin', 'manager', 'editor'])
  ));

-- product_images (親商品経由)
CREATE POLICY "Users can view images"
  ON product_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.organization_id = ANY(get_user_organization_ids())
  ));

CREATE POLICY "Editors+ can manage images"
  ON product_images FOR ALL
  USING (EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND has_organization_role(products.organization_id, ARRAY['owner', 'admin', 'manager', 'editor'])
  ));

-- product_categories (親商品経由)
CREATE POLICY "Users can view product_categories"
  ON product_categories FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_categories.product_id 
    AND products.organization_id = ANY(get_user_organization_ids())
  ));

CREATE POLICY "Editors+ can manage product_categories"
  ON product_categories FOR ALL
  USING (EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_categories.product_id 
    AND has_organization_role(products.organization_id, ARRAY['owner', 'admin', 'manager', 'editor'])
  ));

-- customers (組織スコープ)
CREATE POLICY "Users can view customers in their organization"
  ON customers FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Editors+ can manage customers"
  ON customers FOR ALL
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin', 'manager', 'editor']));

-- customer_addresses (親顧客経由)
CREATE POLICY "Users can view addresses"
  ON customer_addresses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM customers 
    WHERE customers.id = customer_addresses.customer_id 
    AND customers.organization_id = ANY(get_user_organization_ids())
  ));

CREATE POLICY "Editors+ can manage addresses"
  ON customer_addresses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM customers 
    WHERE customers.id = customer_addresses.customer_id 
    AND has_organization_role(customers.organization_id, ARRAY['owner', 'admin', 'manager', 'editor'])
  ));

-- orders (組織スコープ)
CREATE POLICY "Users can view orders in their organization"
  ON orders FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Managers+ can manage orders"
  ON orders FOR ALL
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin', 'manager']));

-- order_items (親注文経由)
CREATE POLICY "Users can view order items"
  ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.organization_id = ANY(get_user_organization_ids())
  ));

CREATE POLICY "Managers+ can manage order items"
  ON order_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND has_organization_role(orders.organization_id, ARRAY['owner', 'admin', 'manager'])
  ));

-- quotes (組織スコープ)
CREATE POLICY "Users can view quotes in their organization"
  ON quotes FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Managers+ can manage quotes"
  ON quotes FOR ALL
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin', 'manager']));

-- quote_items (親見積経由)
CREATE POLICY "Users can view quote items"
  ON quote_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND quotes.organization_id = ANY(get_user_organization_ids())
  ));

CREATE POLICY "Managers+ can manage quote items"
  ON quote_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM quotes 
    WHERE quotes.id = quote_items.quote_id 
    AND has_organization_role(quotes.organization_id, ARRAY['owner', 'admin', 'manager'])
  ));

-- stock_movements (親商品経由)
CREATE POLICY "Users can view stock movements"
  ON stock_movements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = stock_movements.product_id 
    AND products.organization_id = ANY(get_user_organization_ids())
  ));

CREATE POLICY "Managers+ can manage stock movements"
  ON stock_movements FOR ALL
  USING (EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = stock_movements.product_id 
    AND has_organization_role(products.organization_id, ARRAY['owner', 'admin', 'manager'])
  ));

-- contents (組織スコープ)
CREATE POLICY "Users can view contents in their organization"
  ON contents FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Editors+ can manage contents"
  ON contents FOR ALL
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin', 'manager', 'editor']));

-- content_categories (組織スコープ)
CREATE POLICY "Users can view content categories in their organization"
  ON content_categories FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Editors+ can manage content categories"
  ON content_categories FOR ALL
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin', 'manager', 'editor']));

-- content_category_relations (親コンテンツ経由)
CREATE POLICY "Users can view content category relations"
  ON content_category_relations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM contents 
    WHERE contents.id = content_category_relations.content_id 
    AND contents.organization_id = ANY(get_user_organization_ids())
  ));

CREATE POLICY "Editors+ can manage content category relations"
  ON content_category_relations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM contents 
    WHERE contents.id = content_category_relations.content_id 
    AND has_organization_role(contents.organization_id, ARRAY['owner', 'admin', 'manager', 'editor'])
  ));

-- ============================================
-- 10. 公開API用ポリシー（フロントエンド連携）
-- ============================================

-- 公開商品表示用（認証不要・公開商品のみ）
CREATE POLICY "Public can view published products"
  ON products FOR SELECT
  USING (status = 'published')
  WITH CHECK (false);  -- 挿入・更新は不可

-- 公開コンテンツ表示用
CREATE POLICY "Public can view published contents"
  ON contents FOR SELECT
  USING (status = 'published')
  WITH CHECK (false);

-- ============================================
-- 完了
-- ============================================





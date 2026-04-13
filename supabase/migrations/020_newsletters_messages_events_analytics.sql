-- ============================================================
-- Migration 020: Newsletter / Messages / Events / Analytics
-- ============================================================

-- ① 商品お気に入り（メルマガ送信対象）
CREATE TABLE IF NOT EXISTS product_favorites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,  -- ログイン会員
  session_id      TEXT,                                              -- 非ログイン
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, customer_id),
  UNIQUE(product_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_product_favorites_org     ON product_favorites(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_favorites_product ON product_favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_product_favorites_customer ON product_favorites(customer_id);

-- ② メルマガ送信履歴
CREATE TABLE IF NOT EXISTS newsletter_sends (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  subject         TEXT NOT NULL,
  body            TEXT NOT NULL,
  sent_count      INTEGER DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending / sent / failed
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_org ON newsletter_sends(organization_id);

-- ③ メッセージ（サプライヤー→バイヤー）
CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  to_customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,  -- NULL = 全員配信
  target            TEXT NOT NULL DEFAULT 'all',  -- 'all' | 'customer'
  subject           TEXT NOT NULL,
  body              TEXT NOT NULL,
  is_read           BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_org        ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_to         ON messages(to_customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_from       ON messages(from_customer_id);

-- ④ イベント告知（バイヤー→サプライヤー募集）
CREATE TABLE IF NOT EXISTS events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  buyer_id        UUID REFERENCES customers(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  event_date      DATE,
  venue           TEXT,
  body            TEXT,
  genres          TEXT[] DEFAULT '{}',
  regions         TEXT[] DEFAULT '{}',
  notified_count  INTEGER DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'draft',  -- draft / published / cancelled
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_org    ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_buyer  ON events(buyer_id);

-- ⑤ アナリティクス: ページビュー
CREATE TABLE IF NOT EXISTS page_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  session_id      TEXT,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  referrer        TEXT,
  viewed_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_views_org         ON page_views(organization_id);
CREATE INDEX IF NOT EXISTS idx_page_views_product     ON page_views(product_id);
CREATE INDEX IF NOT EXISTS idx_page_views_supplier    ON page_views(supplier_id);
CREATE INDEX IF NOT EXISTS idx_page_views_viewed_at   ON page_views(viewed_at);

-- ⑥ アナリティクス: 商品クリック
CREATE TABLE IF NOT EXISTS product_clicks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
  supplier_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  session_id      TEXT,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  click_type      TEXT DEFAULT 'detail',  -- detail / buy / inquiry
  clicked_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_clicks_org       ON product_clicks(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_clicks_product   ON product_clicks(product_id);
CREATE INDEX IF NOT EXISTS idx_product_clicks_supplier  ON product_clicks(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_clicks_clicked_at ON product_clicks(clicked_at);

-- ⑦ プラン機能フラグ（organizations に追加）
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan            TEXT NOT NULL DEFAULT 'free',  -- free / starter / growth / enterprise
  ADD COLUMN IF NOT EXISTS features        JSONB NOT NULL DEFAULT '{}';   -- 有料機能フラグ

-- machimogu は analytics をデフォルト有効化
UPDATE organizations
SET features = jsonb_set(COALESCE(features, '{}'), '{analytics}', 'true')
WHERE slug = 'machimogu';

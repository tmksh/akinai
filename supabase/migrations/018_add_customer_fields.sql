-- ============================================
-- customersテーブルへの追加フィールド
-- prefecture   : 都道府県（産地・所在地）
-- business_type: 業種
-- custom_fields: 組織ごとのカスタムフィールド値 (JSONB)
-- ============================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS prefecture    TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_customers_prefecture    ON customers (organization_id, prefecture);
CREATE INDEX IF NOT EXISTS idx_customers_business_type ON customers (organization_id, business_type);

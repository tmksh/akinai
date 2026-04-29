-- ============================================================
-- Migration 029: サプライヤーお気に入り（フォロー）テーブル
-- ------------------------------------------------------------
-- 既存の product_favorites（商品単位）に加え、
-- サプライヤー単位のフォロー関係を管理するテーブルを追加する。
--
-- バイヤー（ログイン済み） → customer_id を使用
-- 非ログインセッション    → session_id を使用
-- ============================================================

CREATE TABLE IF NOT EXISTS supplier_favorites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,   -- ログイン会員
  session_id      TEXT,                                               -- 非ログイン
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  -- 同一バイヤーは同一サプライヤーを一度だけフォロー可能
  UNIQUE(supplier_id, customer_id),
  UNIQUE(supplier_id, session_id),
  -- customer_id と session_id どちらか一方は必須
  CONSTRAINT supplier_favorites_requires_identifier
    CHECK (customer_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_supplier_favorites_org
  ON supplier_favorites(organization_id);
CREATE INDEX IF NOT EXISTS idx_supplier_favorites_supplier
  ON supplier_favorites(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_favorites_customer
  ON supplier_favorites(customer_id);

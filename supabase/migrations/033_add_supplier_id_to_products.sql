-- ============================================================
-- Migration 033: products に supplier_id を追加
-- ------------------------------------------------------------
-- 商品とサプライヤー（customers.role = 'supplier'）の紐付け。
-- page_views / product_clicks の supplier_id 自動解決と
-- サプライヤー別アナリティクス API の集計に使用する。
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_supplier
  ON products(supplier_id)
  WHERE supplier_id IS NOT NULL;

-- 既存イベントの supplier_id を商品から補完
UPDATE page_views pv
SET supplier_id = p.supplier_id
FROM products p
WHERE pv.product_id = p.id
  AND pv.supplier_id IS NULL
  AND p.supplier_id IS NOT NULL;

UPDATE product_clicks pc
SET supplier_id = p.supplier_id
FROM products p
WHERE pc.product_id = p.id
  AND pc.supplier_id IS NULL
  AND p.supplier_id IS NOT NULL;

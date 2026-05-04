-- ============================================================
-- Migration 030: product_favorites に supplier_id を追加
-- ------------------------------------------------------------
-- 商品お気に入り登録時にサプライヤーを直接記録することで、
-- 「この商品をお気に入りした → そのサプライヤーのフォロワー」
-- という関係を2段階JOINなしで解決できるようにする。
--
-- 既存レコードの supplier_id は products.supplier_id から補完を試みる
-- （supplier_id が NULL の商品は NULL のまま）。
-- ============================================================

ALTER TABLE product_favorites
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- 既存レコードを products.supplier_id で補完
-- products に supplier_id カラムが存在する場合のみ実行
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'products'
      AND column_name = 'supplier_id'
  ) THEN
    UPDATE product_favorites pf
    SET supplier_id = p.supplier_id
    FROM products p
    WHERE pf.product_id = p.id
      AND pf.supplier_id IS NULL
      AND p.supplier_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_favorites_supplier
  ON product_favorites(supplier_id)
  WHERE supplier_id IS NOT NULL;

-- ============================================================
-- Migration 044: products.supplier_id を ON DELETE CASCADE に変更
-- ------------------------------------------------------------
-- 変更前: ON DELETE SET NULL（顧客削除後も商品が残り続ける）
-- 変更後: ON DELETE CASCADE（サプライヤー顧客削除時に商品も自動削除）
--
-- 影響範囲: 削除時のみ。登録・更新・取得は変わらない。
-- product_variants / product_images / product_categories は
-- 既存の ON DELETE CASCADE で products 削除時に連鎖削除される。
-- ============================================================

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_supplier_id_fkey;

ALTER TABLE products
  ADD CONSTRAINT products_supplier_id_fkey
  FOREIGN KEY (supplier_id)
  REFERENCES customers(id)
  ON DELETE CASCADE;

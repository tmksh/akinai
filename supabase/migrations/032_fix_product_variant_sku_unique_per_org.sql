-- ============================================================
-- Migration 032: product_variants.sku のユニーク制約を組織スコープに変更
-- ------------------------------------------------------------
-- 現状: sku TEXT UNIQUE NOT NULL（グローバル一意）
--   → 異なる組織が同じSKUを使うとINSERTが失敗する問題がある
--
-- 対応: グローバルユニーク制約を削除し、
--       組織ごとのSKU重複はアプリ側でチェックする。
--       さらに organization_id カラムを追加して
--       (organization_id, sku) のユニーク制約に変更する。
-- ============================================================

-- 1. グローバルユニーク制約を削除
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_sku_key;

-- 2. organization_id カラムを追加（products から denormalize）
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 3. 既存レコードの organization_id を products から補完
UPDATE product_variants pv
SET organization_id = p.organization_id
FROM products p
WHERE pv.product_id = p.id
  AND pv.organization_id IS NULL;

-- 4. 組織スコープの (organization_id, sku) ユニーク制約を追加
--    ただし organization_id が NULL のレコードは除外（移行安全のため）
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_sku_per_org
  ON product_variants (organization_id, sku)
  WHERE organization_id IS NOT NULL;

-- 5. 今後 products に紐付く際に organization_id を自動セットするトリガー
CREATE OR REPLACE FUNCTION set_variant_organization_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.product_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM products WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_variant_organization_id ON product_variants;
CREATE TRIGGER trg_set_variant_organization_id
  BEFORE INSERT OR UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION set_variant_organization_id();

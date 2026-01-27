-- ============================================
-- stock_movementsテーブルに追加カラムを追加
-- organization_id: マルチテナント対応
-- product_name, variant_name, sku: 履歴の可読性向上
-- ============================================

-- organization_idカラムを追加
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 商品情報カラムを追加（履歴として保存）
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS product_name TEXT;

ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS variant_name TEXT;

ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS sku TEXT;

-- 既存データにorganization_idを設定（商品から取得）
UPDATE stock_movements sm
SET organization_id = p.organization_id
FROM products p
WHERE sm.product_id = p.id
  AND sm.organization_id IS NULL;

-- 既存データにproduct_name, variant_name, skuを設定
UPDATE stock_movements sm
SET 
  product_name = p.name,
  variant_name = pv.name,
  sku = pv.sku
FROM products p
JOIN product_variants pv ON pv.product_id = p.id
WHERE sm.product_id = p.id
  AND sm.variant_id = pv.id
  AND sm.product_name IS NULL;

-- organization_idにインデックスを追加
CREATE INDEX IF NOT EXISTS idx_stock_movements_organization_id 
ON stock_movements(organization_id);

-- created_atにインデックスを追加（履歴の時系列クエリ用）
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at 
ON stock_movements(created_at DESC);

-- typeにインデックスを追加（フィルタリング用）
CREATE INDEX IF NOT EXISTS idx_stock_movements_type 
ON stock_movements(type);

-- RLSポリシーを更新（organization_idを使用）
DROP POLICY IF EXISTS "Users can view stock movements" ON stock_movements;
DROP POLICY IF EXISTS "Managers+ can manage stock movements" ON stock_movements;

-- 新しいRLSポリシー（organization_idベース）
CREATE POLICY "Users can view stock movements in their organization"
  ON stock_movements FOR SELECT
  USING (organization_id = ANY(get_user_organization_ids()));

CREATE POLICY "Managers+ can manage stock movements"
  ON stock_movements FOR ALL
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin', 'manager']));








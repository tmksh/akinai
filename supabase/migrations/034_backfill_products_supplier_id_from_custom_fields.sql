-- ============================================================
-- Migration 034: products.supplier_id を custom_fields から補完
-- ------------------------------------------------------------
-- 連携先（まちもぐ等）は商品の所有サプライヤーを専用カラムではなく
-- custom_fields の [{ "key": "supplier_id", "value": "<uuid>" }] に保存している。
-- 一方で migration 033 で追加した products.supplier_id 列は未投入のままで、
-- サプライヤー別アナリティクス API（products.supplier_id で集計）が
-- 全サプライヤーで 0 を返していた。
--
-- ここで custom_fields の supplier_id を専用カラムへ移送し、
-- 併せて page_views / product_clicks の supplier_id も商品の値で補完する。
-- ============================================================

-- ① 商品マスタ: custom_fields の supplier_id を専用カラムへ
UPDATE products p
SET supplier_id = cf.value::uuid
FROM (
  SELECT
    pr.id AS product_id,
    (elem ->> 'value') AS value
  FROM products pr
  CROSS JOIN LATERAL jsonb_array_elements(pr.custom_fields) AS elem
  WHERE jsonb_typeof(pr.custom_fields) = 'array'
    AND elem ->> 'key' = 'supplier_id'
    AND (elem ->> 'value') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
) cf
WHERE p.id = cf.product_id
  AND p.supplier_id IS NULL
  -- 実在する customers のみ（FK 違反を避ける）
  AND EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = cf.value::uuid
      AND c.organization_id = p.organization_id
  );

-- ② イベント側 supplier_id を商品の supplier_id で補完
UPDATE page_views pv
SET supplier_id = p.supplier_id
FROM products p
WHERE pv.product_id = p.id
  AND p.supplier_id IS NOT NULL
  AND (pv.supplier_id IS NULL OR pv.supplier_id <> p.supplier_id);

UPDATE product_clicks pc
SET supplier_id = p.supplier_id
FROM products p
WHERE pc.product_id = p.id
  AND p.supplier_id IS NOT NULL
  AND (pc.supplier_id IS NULL OR pc.supplier_id <> p.supplier_id);

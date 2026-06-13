-- ============================================
-- 商品取得 API のパフォーマンス最適化用インデックス
-- - 一覧 API の filter(organization_id, status) + sort(created_at) + COUNT(*) を高速化
-- - 既存は単一カラム index のみ（idx_products_org / idx_products_status）だったため
--   複合インデックスで filter + order + count を 1 本でカバーする
-- ============================================

-- 既定クエリ: WHERE organization_id = ? AND status = 'published' ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_products_org_status_created
  ON products(organization_id, status, created_at DESC);

-- sort=name 利用時の最適化
CREATE INDEX IF NOT EXISTS idx_products_org_status_name
  ON products(organization_id, status, name);

-- NOTE: 大規模テーブルでロックを避けたい場合は、本番では下記を手動実行する:
--   CREATE INDEX CONCURRENTLY ...
-- （CONCURRENTLY はトランザクション内で実行できないため、マイグレーションでは通常版を使用）

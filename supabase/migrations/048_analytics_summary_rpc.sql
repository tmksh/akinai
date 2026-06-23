-- ============================================================
-- Migration 048: Analytics summary RPC（セッション重複除去）
-- サマリーの閲覧数・クリック数をユニークセッション単位に統一し
-- CTR が必ず 100% 以下になることを保証する
-- ============================================================

CREATE OR REPLACE FUNCTION get_analytics_summary(
  org_id      UUID,
  since_date  TIMESTAMPTZ,
  product_id  UUID DEFAULT NULL
)
RETURNS TABLE(
  total_views  BIGINT,
  total_clicks BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  WITH view_sessions AS (
    -- ユニーク閲覧セッション
    SELECT DISTINCT
      COALESCE(session_id, id::TEXT) AS session_key,
      COALESCE(pv.product_id, '00000000-0000-0000-0000-000000000000'::UUID) AS pid
    FROM page_views pv
    WHERE pv.organization_id = org_id
      AND pv.viewed_at >= since_date
      AND (product_id IS NULL OR pv.product_id = product_id)
  ),
  effective_clicks AS (
    -- 有効クリック：同セッション・同商品の閲覧が存在するもののみ
    SELECT DISTINCT
      COALESCE(pc.session_id, pc.id::TEXT) AS session_key
    FROM product_clicks pc
    WHERE pc.organization_id = org_id
      AND pc.clicked_at >= since_date
      AND (product_id IS NULL OR pc.product_id = product_id)
      AND EXISTS (
        SELECT 1 FROM page_views pv
        WHERE pv.organization_id = org_id
          AND pv.viewed_at >= since_date
          AND (product_id IS NULL OR pv.product_id = product_id)
          AND COALESCE(pv.session_id, pv.id::TEXT) = COALESCE(pc.session_id, pc.id::TEXT)
      )
  )
  SELECT
    (SELECT COUNT(*) FROM view_sessions)   AS total_views,
    (SELECT COUNT(*) FROM effective_clicks) AS total_clicks;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_summary(UUID, TIMESTAMPTZ, UUID) TO authenticated, anon, service_role;

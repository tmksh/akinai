-- ============================================================
-- Migration 047: CTR > 100% 修正
-- クリック数が閲覧数を超えないよう、「詳細を閲覧したセッションのクリックのみ」を有効クリックとして集計
-- ============================================================

CREATE OR REPLACE FUNCTION get_product_ranking(
  org_id       UUID,
  since_date   TIMESTAMPTZ,
  limit_count  INT DEFAULT 50
)
RETURNS TABLE(
  product_id   UUID,
  product_name TEXT,
  views        BIGINT,
  clicks       BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  WITH view_sessions AS (
    -- 閲覧セッション（一意）
    SELECT
      product_id,
      COALESCE(session_id, id::TEXT) AS session_key
    FROM page_views
    WHERE organization_id = org_id
      AND viewed_at >= since_date
      AND product_id IS NOT NULL
  ),
  click_sessions AS (
    -- 有効クリック：page_viewsに同じsession_id+product_idが存在するクリックのみ
    -- → 閲覧を伴わない一覧クリックを除外し、CTR ≤ 100% を保証する
    SELECT DISTINCT
      pc.product_id,
      COALESCE(pc.session_id, pc.id::TEXT) AS session_key
    FROM product_clicks pc
    WHERE pc.organization_id = org_id
      AND pc.clicked_at >= since_date
      AND pc.product_id IS NOT NULL
      -- 同セッション・同商品の閲覧が存在するクリックのみカウント
      AND EXISTS (
        SELECT 1 FROM page_views pv
        WHERE pv.organization_id = org_id
          AND pv.product_id = pc.product_id
          AND pv.viewed_at >= since_date
          AND COALESCE(pv.session_id, pv.id::TEXT) = COALESCE(pc.session_id, pc.id::TEXT)
      )
  )
  SELECT
    vs.product_id,
    p.name                        AS product_name,
    COUNT(DISTINCT vs.session_key) AS views,
    COUNT(DISTINCT cs.session_key) AS clicks
  FROM view_sessions vs
  JOIN products p ON p.id = vs.product_id
  LEFT JOIN click_sessions cs
    ON cs.product_id = vs.product_id
    AND cs.session_key = vs.session_key
  GROUP BY vs.product_id, p.name
  ORDER BY views DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION get_product_ranking(UUID, TIMESTAMPTZ, INT) TO authenticated, anon, service_role;

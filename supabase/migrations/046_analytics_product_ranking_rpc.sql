-- ============================================================
-- Migration 046: Analytics product ranking RPC
-- JS側でlimit(2000)を超えると集計が打ち切られる問題をDB集計で解決
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
  SELECT
    pv.product_id,
    p.name                                  AS product_name,
    COUNT(DISTINCT COALESCE(pv.session_id, pv.id::TEXT)) AS views,
    COALESCE(pc.clicks, 0)                  AS clicks
  FROM page_views pv
  JOIN products p ON p.id = pv.product_id
  LEFT JOIN (
    SELECT
      product_id,
      COUNT(DISTINCT COALESCE(session_id, id::TEXT)) AS clicks
    FROM product_clicks
    WHERE organization_id = org_id
      AND clicked_at >= since_date
      AND product_id IS NOT NULL
    GROUP BY product_id
  ) pc ON pc.product_id = pv.product_id
  WHERE pv.organization_id = org_id
    AND pv.viewed_at >= since_date
    AND pv.product_id IS NOT NULL
  GROUP BY pv.product_id, p.name, pc.clicks
  ORDER BY views DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION get_product_ranking(UUID, TIMESTAMPTZ, INT) TO authenticated, anon, service_role;

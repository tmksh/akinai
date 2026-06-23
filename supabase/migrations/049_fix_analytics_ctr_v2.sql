-- ============================================================
-- Migration 049: CTR修正 v2
-- セッションIDなしのデータで047/048のセッション照合が全クリック0になる問題を修正
-- 「クリック数を閲覧数の上限にキャップ」することでCTR ≤ 100%を保証する
-- ============================================================

-- ── 商品別ランキング（クリックを閲覧数でキャップ） ───────────
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
  WITH view_counts AS (
    SELECT
      product_id,
      COUNT(DISTINCT COALESCE(session_id, id::TEXT)) AS views
    FROM page_views
    WHERE organization_id = org_id
      AND viewed_at >= since_date
      AND product_id IS NOT NULL
    GROUP BY product_id
  ),
  click_counts AS (
    SELECT
      product_id,
      COUNT(DISTINCT COALESCE(session_id, id::TEXT)) AS clicks
    FROM product_clicks
    WHERE organization_id = org_id
      AND clicked_at >= since_date
      AND product_id IS NOT NULL
    GROUP BY product_id
  )
  SELECT
    vc.product_id,
    p.name                                   AS product_name,
    vc.views,
    -- CTR ≤ 100% を保証: クリック数は閲覧数を超えない
    LEAST(COALESCE(cc.clicks, 0), vc.views)  AS clicks
  FROM view_counts vc
  JOIN products p ON p.id = vc.product_id
  LEFT JOIN click_counts cc ON cc.product_id = vc.product_id
  ORDER BY vc.views DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION get_product_ranking(UUID, TIMESTAMPTZ, INT) TO authenticated, anon, service_role;

-- ── サマリー（閲覧数・クリック数、同様にキャップ） ──────────
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
  WITH v AS (
    SELECT COUNT(DISTINCT COALESCE(session_id, id::TEXT)) AS cnt
    FROM page_views
    WHERE organization_id = org_id
      AND viewed_at >= since_date
      AND (product_id IS NULL OR page_views.product_id = get_analytics_summary.product_id)
  ),
  c AS (
    SELECT COUNT(DISTINCT COALESCE(session_id, id::TEXT)) AS cnt
    FROM product_clicks
    WHERE organization_id = org_id
      AND clicked_at >= since_date
      AND (product_id IS NULL OR product_clicks.product_id = get_analytics_summary.product_id)
  )
  SELECT
    v.cnt                   AS total_views,
    LEAST(c.cnt, v.cnt)     AS total_clicks   -- CTR ≤ 100% を保証
  FROM v, c;
$$;

GRANT EXECUTE ON FUNCTION get_analytics_summary(UUID, TIMESTAMPTZ, UUID) TO authenticated, anon, service_role;

-- ============================================
-- API パフォーマンス最適化
-- - APIキー検索インデックス
-- - O(1) カウンターベースのレート制限
-- - 認証 + レート制限を 1 RPC に統合
-- ============================================

-- APIキー検索（毎リクエスト実行）
CREATE INDEX IF NOT EXISTS idx_organizations_frontend_api_key
  ON organizations(frontend_api_key)
  WHERE frontend_api_key IS NOT NULL AND is_active = true;

-- スライディングウィンドウ用カウンター（COUNT(*) 全表スキャンを廃止）
CREATE TABLE IF NOT EXISTS api_rate_counters (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  window_key TEXT NOT NULL,
  count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, window_key)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_counters_updated
  ON api_rate_counters(updated_at);

-- 古いカウンターを削除（定期実行 or 手動）
CREATE OR REPLACE FUNCTION cleanup_api_rate_counters()
RETURNS void AS $$
BEGIN
  DELETE FROM api_rate_counters
  WHERE updated_at < NOW() - INTERVAL '2 days';
END;
$$ LANGUAGE plpgsql;

-- 認証 + レート制限を 1 往復で完了（Shopify/Stripe 系の定番パターン）
CREATE OR REPLACE FUNCTION validate_api_key_and_consume_rate_limit(p_api_key TEXT)
RETURNS JSONB AS $$
DECLARE
  org RECORD;
  limits RECORD;
  minute_key TEXT;
  day_key TEXT;
  minute_count INT;
  day_count INT;
  allowed BOOLEAN;
BEGIN
  SELECT id, name, plan
  INTO org
  FROM organizations
  WHERE frontend_api_key = p_api_key
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_key'
    );
  END IF;

  SELECT * INTO limits FROM rate_limits WHERE plan = org.plan;
  IF NOT FOUND THEN
    SELECT * INTO limits FROM rate_limits WHERE plan = 'starter';
  END IF;

  minute_key := 'm:' || to_char(NOW() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MI');
  day_key := 'd:' || to_char(NOW() AT TIME ZONE 'UTC', 'YYYYMMDD');

  INSERT INTO api_rate_counters (organization_id, window_key, count)
  VALUES (org.id, minute_key, 1)
  ON CONFLICT (organization_id, window_key)
  DO UPDATE SET
    count = api_rate_counters.count + 1,
    updated_at = NOW()
  RETURNING count INTO minute_count;

  INSERT INTO api_rate_counters (organization_id, window_key, count)
  VALUES (org.id, day_key, 1)
  ON CONFLICT (organization_id, window_key)
  DO UPDATE SET
    count = api_rate_counters.count + 1,
    updated_at = NOW()
  RETURNING count INTO day_count;

  allowed := minute_count <= limits.requests_per_minute
         AND day_count <= limits.requests_per_day;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', org.id,
    'organization_name', org.name,
    'plan', org.plan,
    'allowed', allowed,
    'minute_limit', limits.requests_per_minute,
    'minute_remaining', GREATEST(0, limits.requests_per_minute - minute_count),
    'day_limit', limits.requests_per_day,
    'day_remaining', GREATEST(0, limits.requests_per_day - day_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

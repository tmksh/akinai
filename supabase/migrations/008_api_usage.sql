-- ============================================
-- API使用量追跡・レート制限
-- ============================================

-- ============================================
-- 1. API使用量テーブル
-- ============================================
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INT,
  response_time_ms INT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- パーティション用インデックス（時間ベースのクエリを高速化）
CREATE INDEX idx_api_usage_org_created ON api_usage(organization_id, created_at DESC);
CREATE INDEX idx_api_usage_created ON api_usage(created_at DESC);

-- ============================================
-- 2. レート制限設定テーブル
-- ============================================
CREATE TABLE rate_limits (
  plan TEXT PRIMARY KEY,
  requests_per_minute INT NOT NULL,
  requests_per_day INT NOT NULL
);

-- デフォルトのレート制限値を挿入
INSERT INTO rate_limits (plan, requests_per_minute, requests_per_day) VALUES
  ('starter', 60, 10000),
  ('pro', 300, 100000),
  ('enterprise', 1000, 1000000);

-- ============================================
-- 3. API使用量サマリー（日次集計用）
-- ============================================
CREATE TABLE api_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_requests INT DEFAULT 0,
  successful_requests INT DEFAULT 0,
  failed_requests INT DEFAULT 0,
  avg_response_time_ms INT DEFAULT 0,
  endpoints JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, date)
);

CREATE INDEX idx_api_usage_daily_org_date ON api_usage_daily(organization_id, date DESC);

-- ============================================
-- 4. RLS有効化
-- ============================================
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_daily ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLSポリシー
-- ============================================

-- api_usage: 管理者のみ閲覧可能
CREATE POLICY "Admins can view api usage"
  ON api_usage FOR SELECT
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin']));

-- rate_limits: 全員が参照可能（設定値は公開）
CREATE POLICY "Anyone can view rate limits"
  ON rate_limits FOR SELECT
  USING (true);

-- api_usage_daily: 管理者のみ閲覧可能
CREATE POLICY "Admins can view daily usage"
  ON api_usage_daily FOR SELECT
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin']));

-- ============================================
-- 6. 使用量カウント関数
-- ============================================

-- 直近1分間のリクエスト数を取得
CREATE OR REPLACE FUNCTION get_requests_last_minute(org_id UUID)
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INT
    FROM api_usage
    WHERE organization_id = org_id
      AND created_at > NOW() - INTERVAL '1 minute'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 本日のリクエスト数を取得
CREATE OR REPLACE FUNCTION get_requests_today(org_id UUID)
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INT
    FROM api_usage
    WHERE organization_id = org_id
      AND created_at >= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- レート制限チェック関数
CREATE OR REPLACE FUNCTION check_rate_limit(org_id UUID, org_plan TEXT)
RETURNS JSONB AS $$
DECLARE
  limits RECORD;
  minute_count INT;
  day_count INT;
BEGIN
  -- プランのレート制限を取得
  SELECT * INTO limits FROM rate_limits WHERE plan = org_plan;

  IF limits IS NULL THEN
    -- デフォルトはstarterプラン
    SELECT * INTO limits FROM rate_limits WHERE plan = 'starter';
  END IF;

  -- 現在の使用量を取得
  minute_count := get_requests_last_minute(org_id);
  day_count := get_requests_today(org_id);

  RETURN jsonb_build_object(
    'allowed', minute_count < limits.requests_per_minute AND day_count < limits.requests_per_day,
    'minute_limit', limits.requests_per_minute,
    'minute_remaining', GREATEST(0, limits.requests_per_minute - minute_count),
    'day_limit', limits.requests_per_day,
    'day_remaining', GREATEST(0, limits.requests_per_day - day_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 日次集計更新関数
-- ============================================
CREATE OR REPLACE FUNCTION update_daily_usage()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO api_usage_daily (organization_id, date, total_requests, successful_requests, failed_requests, avg_response_time_ms)
  VALUES (
    NEW.organization_id,
    CURRENT_DATE,
    1,
    CASE WHEN NEW.status_code < 400 THEN 1 ELSE 0 END,
    CASE WHEN NEW.status_code >= 400 THEN 1 ELSE 0 END,
    COALESCE(NEW.response_time_ms, 0)
  )
  ON CONFLICT (organization_id, date) DO UPDATE SET
    total_requests = api_usage_daily.total_requests + 1,
    successful_requests = api_usage_daily.successful_requests + CASE WHEN NEW.status_code < 400 THEN 1 ELSE 0 END,
    failed_requests = api_usage_daily.failed_requests + CASE WHEN NEW.status_code >= 400 THEN 1 ELSE 0 END,
    avg_response_time_ms = (
      (api_usage_daily.avg_response_time_ms * api_usage_daily.total_requests + COALESCE(NEW.response_time_ms, 0))
      / (api_usage_daily.total_requests + 1)
    )::INT,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_usage
  AFTER INSERT ON api_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_usage();

-- ============================================
-- 8. 古いデータのクリーンアップ関数
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_api_usage()
RETURNS void AS $$
BEGIN
  -- 30日以上前の詳細データを削除
  DELETE FROM api_usage WHERE created_at < NOW() - INTERVAL '30 days';

  -- 1年以上前の日次集計を削除
  DELETE FROM api_usage_daily WHERE date < CURRENT_DATE - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 完了
-- ============================================

-- ============================================
-- Webhookシステム
-- ============================================

-- ============================================
-- 1. Webhookテーブル
-- ============================================
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  retry_count INT DEFAULT 3,
  timeout_ms INT DEFAULT 30000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_org ON webhooks(organization_id);
CREATE INDEX idx_webhooks_active ON webhooks(organization_id, is_active) WHERE is_active = true;

-- ============================================
-- 2. Webhook配信履歴テーブル
-- ============================================
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  response_headers JSONB,
  attempt INT DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(webhook_id, response_status);

-- ============================================
-- 3. RLS有効化
-- ============================================
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLSポリシー
-- ============================================

-- webhooks: 管理者のみ管理可能
CREATE POLICY "Admins can manage webhooks"
  ON webhooks FOR ALL
  USING (has_organization_role(organization_id, ARRAY['owner', 'admin']));

-- webhook_deliveries: 管理者のみ閲覧可能
CREATE POLICY "Admins can view webhook deliveries"
  ON webhook_deliveries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM webhooks
    WHERE webhooks.id = webhook_deliveries.webhook_id
    AND has_organization_role(webhooks.organization_id, ARRAY['owner', 'admin'])
  ));

-- ============================================
-- 5. 更新トリガー
-- ============================================
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 6. Webhook統計取得関数
-- ============================================
CREATE OR REPLACE FUNCTION get_webhook_stats(webhook_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_deliveries', COUNT(*),
    'successful_deliveries', COUNT(*) FILTER (WHERE response_status >= 200 AND response_status < 300),
    'failed_deliveries', COUNT(*) FILTER (WHERE response_status IS NULL OR response_status >= 400),
    'avg_duration_ms', COALESCE(AVG(duration_ms)::INT, 0),
    'last_delivery_at', MAX(created_at)
  )
  INTO result
  FROM webhook_deliveries
  WHERE webhook_id = webhook_uuid
    AND created_at > NOW() - INTERVAL '30 days';

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 古い配信履歴のクリーンアップ
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_webhook_deliveries()
RETURNS void AS $$
BEGIN
  -- 90日以上前の配信履歴を削除
  DELETE FROM webhook_deliveries WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 完了
-- ============================================

-- ============================================================
-- Migration 021: Feature Flags - Per-Tenant Feature Settings
-- ============================================================
-- organizations.features JSONB は 020 で追加済み
-- ここでは機能フラグに必要な追加テーブル・カラムを定義する

-- ① 通知BOXテーブル
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'general',
  -- 種別: message_received / review_posted / product_approved / event_announced / general
  title           TEXT NOT NULL,
  body            TEXT,
  related_id      UUID,   -- 関連レコードID（message.id / event.id 等）
  related_type    TEXT,   -- 'message' | 'event' | 'product' | 'review'
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_org      ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_customer ON notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread   ON notifications(customer_id, is_read) WHERE is_read = FALSE;

-- ③ 紹介コード: customers に referral_code カラムを追加
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS referral_code    TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT;  -- 登録時に使用した紹介コード

CREATE INDEX IF NOT EXISTS idx_customers_referral_code ON customers(referral_code) WHERE referral_code IS NOT NULL;

-- ⑥ 商品審査フロー: products に approval_status カラムを追加
-- approval_status: null（審査フロー未使用） / 'pending'（審査中） / 'approved'（承認済み） / 'rejected'（否認）
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_products_approval_status ON products(organization_id, approval_status) WHERE approval_status IS NOT NULL;

-- machimogu アカウントに全機能フラグを有効化
UPDATE organizations
SET features = features
  || '{"notification_box": true}'::jsonb
  || '{"event_notification": true}'::jsonb
  || '{"referral_code": false}'::jsonb
  || '{"newsletter_frequency_limit": null}'::jsonb
  || '{"message_monthly_limit": null}'::jsonb
  || '{"product_approval_flow": false}'::jsonb
WHERE slug = 'machimogu';

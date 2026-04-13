-- ============================================
-- organizations テーブルへのメールドメイン管理カラム追加
-- Shopify 方式: Resend にドメインを登録し CNAME 認証
-- ============================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS mail_from_domain     TEXT,        -- 認証済みの送信ドメイン（例: machimogu.jp）
  ADD COLUMN IF NOT EXISTS mail_from_address    TEXT,        -- fromアドレス（例: info@machimogu.jp）
  ADD COLUMN IF NOT EXISTS resend_domain_id     TEXT,        -- Resend 側のドメインID
  ADD COLUMN IF NOT EXISTS mail_domain_verified BOOLEAN DEFAULT FALSE,  -- 認証完了フラグ
  ADD COLUMN IF NOT EXISTS mail_domain_records  JSONB;       -- CNAMEレコード情報（Resendが返す）

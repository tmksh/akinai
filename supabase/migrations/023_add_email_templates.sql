-- ============================================
-- メールテンプレート設定カラムの追加
-- ============================================
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS email_templates JSONB DEFAULT '{}'::jsonb;

-- テナントごとの Stripe テストモード対応
-- 既存テナントは stripe_test_mode = false のまま動作し続ける

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_test_mode            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_test_account_id      text,
  ADD COLUMN IF NOT EXISTS stripe_test_account_status  text,
  ADD COLUMN IF NOT EXISTS stripe_test_onboarding_complete boolean NOT NULL DEFAULT false;

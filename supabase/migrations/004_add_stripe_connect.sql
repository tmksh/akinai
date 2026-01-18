-- Stripe Connect用のカラムを追加
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'not_connected',
ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT FALSE;

-- コメント追加
COMMENT ON COLUMN organizations.stripe_account_id IS 'Stripe Connect のアカウントID (acct_xxx)';
COMMENT ON COLUMN organizations.stripe_account_status IS 'Stripe接続状態: not_connected, pending, active, restricted';
COMMENT ON COLUMN organizations.stripe_onboarding_complete IS 'Stripeのオンボーディング（本人確認等）が完了しているか';



-- customers テーブルにエンドユーザー認証用カラムを追加
-- password_hash: bcrypt ハッシュ済みパスワード（NULL = パスワード未設定）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- email_verified: メール確認フラグ（将来の確認メール機能用）
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- last_login_at: 最終ログイン日時
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- インデックス: ログイン時の organization_id + email 検索を高速化
-- （既存の UNIQUE 制約 customers_email_org_unique が index として機能するため追加不要）

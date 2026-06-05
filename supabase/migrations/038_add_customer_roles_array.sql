-- 顧客マルチロール対応
-- customers.roles TEXT[] を追加し、既存の role カラムからバックフィル
-- role カラムは後方互換のため残す（プライマリロール = roles[1]）

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';

-- 既存レコードをバックフィル
UPDATE customers SET roles = ARRAY[role] WHERE array_length(roles, 1) IS NULL OR roles = '{}';

-- GIN インデックス（@> 演算子による高速絞り込み）
CREATE INDEX IF NOT EXISTS idx_customers_roles ON customers USING GIN (roles);

-- roles が空の場合は role から同期する関数とトリガー
CREATE OR REPLACE FUNCTION sync_customer_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- roles が空なら role から補完
  IF NEW.roles IS NULL OR array_length(NEW.roles, 1) IS NULL THEN
    NEW.roles := ARRAY[NEW.role];
  END IF;
  -- role が roles の先頭と異なれば roles[1] で上書き（role を正とする）
  IF NEW.role IS DISTINCT FROM NEW.roles[1] AND array_length(NEW.roles, 1) > 0 THEN
    NEW.role := NEW.roles[1];
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_customer_roles ON customers;
CREATE TRIGGER trg_sync_customer_roles
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION sync_customer_roles();

-- roles 内の各値が有効かチェック
ALTER TABLE customers
  DROP CONSTRAINT IF EXISTS customers_roles_check;

ALTER TABLE customers
  ADD CONSTRAINT customers_roles_check CHECK (
    roles <@ ARRAY['personal', 'buyer', 'supplier']::TEXT[]
  );

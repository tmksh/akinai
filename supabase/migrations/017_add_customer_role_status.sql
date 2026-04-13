-- 会員種別・ステータス・追加情報フィールドの追加
-- role  : 会員種別（personal / buyer / supplier）
-- status: 審査・利用ステータス（pending / active / suspended）
-- metadata: 種別ごとの追加情報（JSONB）

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS role    TEXT NOT NULL DEFAULT 'personal'
    CHECK (role IN ('personal', 'buyer', 'supplier')),
  ADD COLUMN IF NOT EXISTS status  TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended')),
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ステータス絞り込み用インデックス
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_customers_role   ON customers (organization_id, role);

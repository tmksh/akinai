-- ============================================
-- 代理店テーブル追加
-- ============================================

-- 代理店テーブル
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL,  -- 代理店コード（組織内ユニーク）
  company TEXT NOT NULL,  -- 会社名
  name TEXT NOT NULL,  -- 担当者名
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  commission_rate DECIMAL(5, 2) DEFAULT 10.00,  -- コミッション率（%）
  total_sales DECIMAL(12, 2) DEFAULT 0,  -- 累計売上
  total_commission DECIMAL(12, 2) DEFAULT 0,  -- 累計コミッション
  notes TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 代理店コードのユニーク制約（組織内で一意）
CREATE UNIQUE INDEX idx_agents_org_code ON agents(organization_id, code);

-- 代理店メールのユニーク制約（組織内で一意）
CREATE UNIQUE INDEX idx_agents_org_email ON agents(organization_id, email);

-- 検索用インデックス
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_organization ON agents(organization_id);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_agents_updated_at 
  BEFORE UPDATE ON agents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLSを有効化
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- 組織メンバーのみアクセス可能
CREATE POLICY "agents_select_policy" ON agents
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "agents_insert_policy" ON agents
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "agents_update_policy" ON agents
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY "agents_delete_policy" ON agents
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
      AND role IN ('owner', 'admin')
    )
  );





-- ============================================
-- 注文テーブルに代理店IDを追加
-- ============================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agent_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agent_commission_rate DECIMAL(5, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS agent_commission_amount DECIMAL(12, 2);

CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON orders(agent_id);

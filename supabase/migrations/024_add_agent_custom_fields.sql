-- agents テーブルにカスタムフィールドカラムを追加
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- ============================================
-- コンテンツ カスタムフィールド + 柔軟なタイプ対応
-- ============================================

-- 1. contents テーブルに custom_fields カラム追加
ALTER TABLE contents ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]';
CREATE INDEX IF NOT EXISTS idx_contents_custom_fields ON contents USING GIN (custom_fields);

-- 2. contents.type の CHECK 制約を緩和（自由なタイプ名を許可）
-- まず既存の制約を削除して、新しい制約なしで再作成
ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_type_check;

-- 3. content_categories.type の CHECK 制約も緩和
ALTER TABLE content_categories DROP CONSTRAINT IF EXISTS content_categories_type_check;

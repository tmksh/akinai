-- ============================================
-- 商品カスタムフィールド機能追加
-- products テーブルに custom_fields JSONB カラムを追加
-- 
-- 構造: [{ "key": "素材", "value": "コットン100%", "type": "text" }, ...]
-- 対応する型: text, number, boolean, date, url, color
-- ============================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]';

-- カスタムフィールドの検索用GINインデックス
CREATE INDEX IF NOT EXISTS idx_products_custom_fields ON products USING GIN (custom_fields);

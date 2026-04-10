-- ============================================
-- バリアントごとの画像URLを追加
-- ============================================
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================
-- Storage バケット設定
-- ============================================

-- productsバケットを作成（商品画像用）
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- contentsバケットを作成（コンテンツ画像用）
INSERT INTO storage.buckets (id, name, public)
VALUES ('contents', 'contents', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage ポリシー設定
-- ============================================

-- productsバケット: 公開読み取り
CREATE POLICY "Public read access for products"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- productsバケット: 認証ユーザーのアップロード
CREATE POLICY "Authenticated users can upload to products"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

-- productsバケット: 認証ユーザーの更新
CREATE POLICY "Authenticated users can update products"
ON storage.objects FOR UPDATE
USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- productsバケット: 認証ユーザーの削除
CREATE POLICY "Authenticated users can delete from products"
ON storage.objects FOR DELETE
USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- contentsバケット: 公開読み取り
CREATE POLICY "Public read access for contents"
ON storage.objects FOR SELECT
USING (bucket_id = 'contents');

-- contentsバケット: 認証ユーザーのアップロード
CREATE POLICY "Authenticated users can upload to contents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contents' AND auth.role() = 'authenticated');

-- contentsバケット: 認証ユーザーの更新
CREATE POLICY "Authenticated users can update contents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'contents' AND auth.role() = 'authenticated');

-- contentsバケット: 認証ユーザーの削除
CREATE POLICY "Authenticated users can delete from contents"
ON storage.objects FOR DELETE
USING (bucket_id = 'contents' AND auth.role() = 'authenticated');


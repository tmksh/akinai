-- ============================================
-- 注文添付ファイルテーブル
-- ============================================

CREATE TABLE IF NOT EXISTS order_attachments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_id         uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  file_name        text        NOT NULL,
  file_size        integer     NOT NULL,
  content_type     text        NOT NULL DEFAULT 'application/octet-stream',
  storage_path     text        NOT NULL,
  url              text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_attachments_order_id
  ON order_attachments(order_id);

CREATE INDEX IF NOT EXISTS idx_order_attachments_organization_id
  ON order_attachments(organization_id);

ALTER TABLE order_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- order-attachments ストレージバケット
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('order-attachments', 'order-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access for order-attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'order-attachments');

CREATE POLICY "Authenticated users can upload to order-attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'order-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete from order-attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'order-attachments' AND auth.role() = 'authenticated');

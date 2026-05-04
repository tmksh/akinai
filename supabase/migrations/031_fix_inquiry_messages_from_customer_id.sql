-- ============================================================
-- Migration 031: inquiry_messages.from_customer_id の NOT NULL 制約を削除
-- ------------------------------------------------------------
-- 028 で from_customer_id を NOT NULL + ON DELETE SET NULL と定義したが、
-- 顧客削除時に Postgres が NULL をセットしようとして NOT NULL 制約違反が
-- 発生するため、NOT NULL 制約を外す。
-- ============================================================

ALTER TABLE inquiry_messages
  ALTER COLUMN from_customer_id DROP NOT NULL;

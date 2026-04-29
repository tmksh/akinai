-- ============================================================
-- Migration 028: 1対1メッセージ（問い合わせ機能）
-- ------------------------------------------------------------
-- 既存の `messages` テーブル（マーケ用一斉配信）とは別に、
-- 顧客同士の1対1スレッド（DM/問い合わせ）を扱う2テーブルを追加する。
--   - inquiry_threads  : スレッド（参加者2名・商品紐付け・状態）
--   - inquiry_messages : スレッド内のメッセージ（添付・既読フラグ）
-- ============================================================

-- スレッド本体
CREATE TABLE IF NOT EXISTS inquiry_threads (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id               UUID REFERENCES products(id) ON DELETE SET NULL,
  -- 参加者（2名）
  initiator_customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,  -- 問い合わせ開始者
  recipient_customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,  -- 受信者
  subject                  TEXT NOT NULL DEFAULT '',
  status                   TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  -- 一覧表示用キャッシュ
  last_message_at          TIMESTAMPTZ,
  last_message_preview     TEXT,
  last_message_from_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  -- 各参加者の未読数
  initiator_unread_count   INTEGER NOT NULL DEFAULT 0,
  recipient_unread_count   INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inquiry_threads_distinct_participants
    CHECK (initiator_customer_id <> recipient_customer_id)
);

CREATE INDEX IF NOT EXISTS idx_inquiry_threads_org
  ON inquiry_threads(organization_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_threads_initiator
  ON inquiry_threads(initiator_customer_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_threads_recipient
  ON inquiry_threads(recipient_customer_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_threads_product
  ON inquiry_threads(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_threads_status
  ON inquiry_threads(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_inquiry_threads_last_message_at
  ON inquiry_threads(last_message_at DESC NULLS LAST);


-- スレッド内のメッセージ
CREATE TABLE IF NOT EXISTS inquiry_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id         UUID NOT NULL REFERENCES inquiry_threads(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE SET NULL,
  body              TEXT NOT NULL,
  attachments       JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- attachments の要素は { url, name, size, mimeType } の形式
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_messages_thread
  ON inquiry_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_org
  ON inquiry_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_inquiry_messages_from
  ON inquiry_messages(from_customer_id);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION inquiry_threads_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inquiry_threads_updated_at ON inquiry_threads;
CREATE TRIGGER trg_inquiry_threads_updated_at
  BEFORE UPDATE ON inquiry_threads
  FOR EACH ROW
  EXECUTE FUNCTION inquiry_threads_set_updated_at();

-- RLS は API 経由（service-role-key）で操作するため無効のままで OK。
-- 必要なら将来 RLS を追加してテナント間アクセスを物理的に分離する。

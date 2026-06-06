-- ============================================================
-- Migration 040: 紹介数集計をカスタムフィールドにも対応させる
-- ============================================================
-- 背景:
--   紹介元コードが標準カラム referred_by_code ではなく、
--   custom_fields（手動追加された「紹介元コード」フィールド）に
--   保存されているケースがあり、紹介数が 0 のままになっていた。
--
-- 対応:
--   被紹介者の「紹介元コード」を以下のいずれかから判定する。
--     1. referred_by_code カラム（標準機能）
--     2. custom_fields（object 形式）の任意の値
--     3. custom_fields（array 形式 [{key,value}]）の value
--   これらが紹介者の referral_code と一致すればカウントする。
--   キー名に依存しないため、どのカスタムフィールド名でも集計される。
--
-- 安全性:
--   referral_code は全体で UNIQUE のため、被紹介者自身の紹介コードが
--   他人の referral_code と一致して誤カウントされることはない。

DROP VIEW IF EXISTS customers_with_referral_count;

CREATE VIEW customers_with_referral_count AS
SELECT
  c.*,
  (
    SELECT COUNT(*)
    FROM customers r
    WHERE r.organization_id = c.organization_id
      AND r.id <> c.id
      AND c.referral_code IS NOT NULL
      AND (
        -- 1. 標準カラム
        r.referred_by_code = c.referral_code
        -- 2. custom_fields が object 形式 { "key": "value" }
        OR (
          jsonb_typeof(r.custom_fields) = 'object'
          AND EXISTS (
            SELECT 1
            FROM jsonb_each_text(r.custom_fields) AS kv(k, v)
            WHERE kv.v = c.referral_code
          )
        )
        -- 3. custom_fields が array 形式 [{ "key": ..., "value": ... }]
        OR (
          jsonb_typeof(r.custom_fields) = 'array'
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(r.custom_fields) AS elem
            WHERE elem->>'value' = c.referral_code
          )
        )
      )
  ) AS referral_count
FROM customers c;

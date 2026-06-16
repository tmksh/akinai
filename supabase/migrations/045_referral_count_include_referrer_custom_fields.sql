-- ============================================================
-- Migration 045: 紹介数集計を紹介者側のカスタムフィールドにも対応させる
-- ============================================================
-- 背景:
--   管理画面から作成した顧客は referral_code DB カラムが自動生成されず、
--   カスタムフィールド（key='referral_code'）にのみ紹介コードが設定される
--   ケースがある。Migration 040 では被紹介者側のカスタムフィールドを
--   対応させたが、紹介者側の「実効コード」がカスタムフィールドにある場合
--   は c.referral_code IS NOT NULL が false になり紹介数が 0 のままだった。
--
-- 対応:
--   紹介者（c）の「実効紹介コード」を以下の優先順で取得する。
--     1. referral_code DB カラム（標準機能）
--     2. custom_fields が object 形式: c.custom_fields->>'referral_code'
--     3. custom_fields が array 形式:  key='referral_code' の要素の value
--   この実効コードが NULL でない場合に被紹介者をカウントする。
--
-- 被紹介者側（r）の判定は Migration 040 の仕様を維持:
--     1. referred_by_code DB カラム
--     2. custom_fields (object) の任意の value
--     3. custom_fields (array)  の任意の elem->>'value'

DROP VIEW IF EXISTS customers_with_referral_count;

CREATE VIEW customers_with_referral_count AS
SELECT
  c.*,
  (
    SELECT COUNT(*)
    FROM customers r
    CROSS JOIN LATERAL (
      SELECT COALESCE(
        -- 1. DB カラム優先
        c.referral_code,
        -- 2. object 形式: {"referral_code": "REF-XXXX"}
        CASE
          WHEN jsonb_typeof(c.custom_fields) = 'object'
          THEN c.custom_fields->>'referral_code'
          ELSE NULL
        END,
        -- 3. array 形式: [{"key":"referral_code","value":"REF-XXXX",...}]
        CASE
          WHEN jsonb_typeof(c.custom_fields) = 'array'
          THEN (
            SELECT elem->>'value'
            FROM jsonb_array_elements(c.custom_fields) AS elem
            WHERE elem->>'key' = 'referral_code'
            LIMIT 1
          )
          ELSE NULL
        END
      ) AS effective_code
    ) AS eff
    WHERE r.organization_id = c.organization_id
      AND r.id <> c.id
      AND eff.effective_code IS NOT NULL
      AND (
        -- 被紹介者側 1: DB カラム
        r.referred_by_code = eff.effective_code
        -- 被紹介者側 2: custom_fields が object 形式
        OR (
          jsonb_typeof(r.custom_fields) = 'object'
          AND EXISTS (
            SELECT 1
            FROM jsonb_each_text(r.custom_fields) AS kv(k, v)
            WHERE kv.v = eff.effective_code
          )
        )
        -- 被紹介者側 3: custom_fields が array 形式
        OR (
          jsonb_typeof(r.custom_fields) = 'array'
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(r.custom_fields) AS elem
            WHERE elem->>'value' = eff.effective_code
          )
        )
      )
  ) AS referral_count
FROM customers c;

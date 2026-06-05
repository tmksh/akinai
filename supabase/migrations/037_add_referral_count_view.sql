-- ============================================================
-- Migration 037: customers_with_referral_count ビュー
-- ============================================================
-- customers テーブルの全カラム + 紹介数（referral_count）を
-- 都度集計するビュー。スキーマ変更なし。
-- referral_count: 自分の referral_code を referred_by_code として
--                 使用して登録した顧客数（同一テナント内）

CREATE OR REPLACE VIEW customers_with_referral_count AS
SELECT
  c.*,
  COUNT(r.id) AS referral_count
FROM customers c
LEFT JOIN customers r
  ON r.referred_by_code = c.referral_code
  AND r.organization_id  = c.organization_id
GROUP BY c.id;

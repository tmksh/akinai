-- Migration 038 で追加した roles カラムをビューに反映させるため再作成
-- CREATE OR REPLACE はカラム順変更を許容しないため DROP → CREATE で対応

DROP VIEW IF EXISTS customers_with_referral_count;

CREATE VIEW customers_with_referral_count AS
SELECT
  c.*,
  COUNT(r.id) AS referral_count
FROM customers c
LEFT JOIN customers r
  ON r.referred_by_code = c.referral_code
  AND r.organization_id  = c.organization_id
GROUP BY c.id;

-- ============================================
-- レート制限の引き上げ
-- - starter プランの日次上限 10,000 → 50,000 / 分次 60 → 120
-- - 商品取得 API の利用増・ユーザー増を見据えた緩和
-- - rate_limits は migration 008 で seed 済みのため UPDATE で更新する
-- ============================================

UPDATE rate_limits
SET requests_per_minute = 120,
    requests_per_day = 50000
WHERE plan = 'starter';

-- 未登録環境向けのフォールバック（008 未適用などで行が無い場合）
INSERT INTO rate_limits (plan, requests_per_minute, requests_per_day)
VALUES ('starter', 120, 50000)
ON CONFLICT (plan) DO UPDATE
SET requests_per_minute = EXCLUDED.requests_per_minute,
    requests_per_day = EXCLUDED.requests_per_day;

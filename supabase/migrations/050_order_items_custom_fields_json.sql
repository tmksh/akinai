-- order_items.custom_fields の型を JSONB から JSON に変更
-- JSONB はキーの挿入順序を保証しないため、送信側が指定した並び順が失われる。
-- JSON 型はテキスト表現をそのまま保持するため、挿入時のキー順序が維持される。
ALTER TABLE order_items
  ALTER COLUMN custom_fields TYPE JSON USING custom_fields::TEXT::JSON;

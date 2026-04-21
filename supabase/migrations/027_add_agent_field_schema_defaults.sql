-- ============================================
-- 代理店スキーマに「預かり案内」フィールドを追加
-- 決済（field_mo4in95t）と同じくスキーマレベルの
-- 全代理店共通フィールドとして登録する
-- ============================================

UPDATE organizations
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{agent_field_schema}',
  COALESCE(settings->'agent_field_schema', '[]'::jsonb) ||
  '[{"id": "field_mo4kompu", "key": "field_mo4kompu", "label": "預かり案内", "type": "boolean", "required": false}]'::jsonb
)
WHERE NOT (
  COALESCE(settings->'agent_field_schema', '[]'::jsonb)
  @> '[{"key": "field_mo4kompu"}]'::jsonb
);

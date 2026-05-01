#!/usr/bin/env node
/**
 * machimogu@example.com テナントの商品カスタムフィールドスキーマを更新する
 *
 * 1. 不要な既存フィールドを削除
 * 2. tags / allergy_required / allergy_recommended を multi_select 化＋選択肢設定
 *
 * 実行: node scripts/migrate-product-fields.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// .env.local を雑にロード
const envText = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL / SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const TARGET_EMAIL = 'machimogu@example.com';
const DRY_RUN = process.argv.includes('--dry-run');

// 削除対象キー
const KEYS_TO_DELETE = [
  'origin_detail',
  'ingredients',
  'nutrition',
  'selling_points',
  'awards',
  'manufacturer_name',
  'manufacturer_address',
  'seller_name',
  'pesticide_free',
  'organic_jas',
  'haccp',
];

// 編集対象（multi_select 化）
const MULTI_SELECT_OVERRIDES = {
  tags: {
    label: '商品タグ',
    options: [
      '無添加', 'オーガニック', 'グルテンフリー', '砂糖不使用', '着色料不使用',
      '保存料不使用', '国産原料', 'ヴィーガン対応', 'アレルギー配慮', '低糖質',
      '糖質制限', 'こだわり製法', '手作り', '職人仕上げ', '数量限定', '季節限定',
      '新商品', 'ギフト対応', 'まとめ買い対応', 'ふるさと納税返礼品',
      '受賞歴あり', 'SDGs', '環境配慮',
    ],
  },
  allergy_required: {
    label: 'アレルギー表示義務',
    options: ['えび', 'かに', 'くるみ', '小麦', 'そば', '卵', '乳', '落花生（ピーナッツ）'],
  },
  allergy_recommended: {
    label: 'アレルギー表示推奨',
    options: [
      'アーモンド', 'あわび', 'いか', 'いくら', 'オレンジ', 'カシューナッツ',
      'キウイフルーツ', '牛肉', 'ごま', 'さけ', 'さば', '大豆', '鶏肉', 'バナナ',
      '豚肉', 'マカダミアナッツ', 'もも', 'やまいも', 'りんご', 'ゼラチン',
    ],
  },
};

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`[migrate-product-fields] DRY_RUN=${DRY_RUN}`);
  console.log(`[migrate-product-fields] target email: ${TARGET_EMAIL}`);

  // 1. ユーザー検索（auth.users から）
  const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;
  const user = usersList?.users?.find((u) => u.email === TARGET_EMAIL);
  if (!user) {
    throw new Error(`User not found: ${TARGET_EMAIL}`);
  }
  console.log(`[migrate-product-fields] user id: ${user.id}`);

  // 2. 所属組織を取得
  const { data: members, error: memberErr } = await supabase
    .from('organization_members')
    .select('organization_id, role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true);
  if (memberErr) throw memberErr;
  if (!members || members.length === 0) {
    throw new Error('No organization membership found');
  }

  for (const m of members) {
    console.log(`\n=== Organization: ${m.organization_id} (role=${m.role}) ===`);
    await processOrganization(m.organization_id);
  }
}

async function processOrganization(orgId) {
  const { data: org, error: fetchErr } = await supabase
    .from('organizations')
    .select('id, name, slug, settings')
    .eq('id', orgId)
    .single();
  if (fetchErr) throw fetchErr;

  console.log(`org name: ${org.name} / slug: ${org.slug}`);

  const settings = org.settings ?? {};
  const schema = Array.isArray(settings.product_field_schema)
    ? settings.product_field_schema
    : [];

  console.log(`current schema fields: ${schema.length}`);
  for (const f of schema) {
    console.log(`  - ${f.key} (${f.type})${f.options ? ` [${f.options.length}opt]` : ''} -> ${f.label}`);
  }

  // 削除
  const afterDelete = schema.filter((f) => !KEYS_TO_DELETE.includes(f.key));
  const deletedKeys = schema
    .filter((f) => KEYS_TO_DELETE.includes(f.key))
    .map((f) => f.key);
  console.log(`\nto delete (${deletedKeys.length}): ${deletedKeys.join(', ') || '(none)'}`);
  const notFoundForDelete = KEYS_TO_DELETE.filter((k) => !schema.some((f) => f.key === k));
  if (notFoundForDelete.length > 0) {
    console.log(`  ※ 既に存在しない: ${notFoundForDelete.join(', ')}`);
  }

  // 編集（multi_select 化）
  const updatedKeys = [];
  const newSchema = afterDelete.map((f) => {
    const ov = MULTI_SELECT_OVERRIDES[f.key];
    if (!ov) return f;
    updatedKeys.push(f.key);
    return {
      ...f,
      type: 'multi_select',
      label: f.label || ov.label,
      options: ov.options,
    };
  });

  // ユーザー指定キーが現スキーマに存在しない場合は新規追加
  for (const [key, ov] of Object.entries(MULTI_SELECT_OVERRIDES)) {
    if (!newSchema.some((f) => f.key === key)) {
      console.log(`  ※ ${key} が存在しなかったため新規追加します`);
      newSchema.push({
        id: `schema-${key}-${Date.now()}`,
        key,
        label: ov.label,
        type: 'multi_select',
        options: ov.options,
      });
      updatedKeys.push(key);
    }
  }

  console.log(`to update (${updatedKeys.length}): ${updatedKeys.join(', ') || '(none)'}`);

  console.log(`\nresult schema fields: ${newSchema.length}`);
  for (const f of newSchema) {
    console.log(`  - ${f.key} (${f.type})${f.options ? ` [${f.options.length}opt]` : ''} -> ${f.label}`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] skip update');
    return;
  }

  const newSettings = { ...settings, product_field_schema: newSchema };
  const { error: updateErr } = await supabase
    .from('organizations')
    .update({ settings: newSettings, updated_at: new Date().toISOString() })
    .eq('id', orgId);
  if (updateErr) throw updateErr;

  console.log('\n✅ updated.');
}

main().catch((err) => {
  console.error('\n❌ ERROR:', err);
  process.exit(1);
});

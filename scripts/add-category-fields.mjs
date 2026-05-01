#!/usr/bin/env node
/**
 * machimogu@example.com テナントの商品カスタムフィールドにカテゴリ系3フィールドを追加/更新する
 *
 *  - category         （大カテゴリ）: 選択肢 4
 *  - middle_category  （中カテゴリ）: 選択肢 14
 *  - subcategory      （小カテゴリ）: 選択肢 55
 *
 * - 既存に同名キーがある場合は type / options / label を上書き
 * - 無ければ新規追加（最後尾）
 *
 * 実行: node scripts/add-category-fields.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

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

// 追加/更新するカテゴリ系フィールド定義
// 順序: 大カテゴリ → 中カテゴリ → 小カテゴリ
const CATEGORY_FIELDS = [
  {
    key: 'category',
    label: '大カテゴリ',
    type: 'select',
    options: ['生鮮・一次産品', '加工食品', '飲料・酒類', '健康食品'],
  },
  {
    key: 'middle_category',
    label: '中カテゴリ',
    type: 'select',
    options: [
      '青果・農産物', '畜産・肉', '水産', '麺',
      'パン・ベーカリー', '米・穀物加工', '調味料',
      '漬物・発酵食品', '惣菜・煮物', 'レトルト・保存食',
      '菓子', '飲料', '酒類', '健康食品',
    ],
  },
  {
    key: 'subcategory',
    label: '小カテゴリ',
    type: 'select',
    options: [
      '野菜', '果物', 'きのこ・山菜',
      '牛肉', '豚肉', '鶏肉', 'ジビエ', '加工肉',
      '鮮魚・貝', '干物・塩干', '練り物',
      'そば', 'うどん', 'ラーメン',
      'パン・スイーツパン', '工房パン', 'ピザ・フォカッチャ',
      '米菓・餅', 'せんべい', 'おこわ・赤飯・たこ焼き',
      '醤油', '味噌', 'みりん', 'たれ・ドレッシング',
      '鍋スープ', '香辛料・スパイス', 'かつおぶし',
      '漬物', 'ご飯のお供', '発酵食品', '甘味噌・麹',
      '惣菜', '郷土料理',
      '炊き込みご飯の素', 'レトルトカレー',
      'ハヤシライス・シチュー', 'パスタソース',
      'ミートソース', '味噌汁', '缶詰', '瓶詰め・ジャム',
      '和菓子', '洋菓子', 'スナック・せんべい',
      'お茶・緑茶', 'ジュース・果汁', 'コーヒー・ココア',
      '炭酸・その他',
      '日本酒', '焼酎', 'ワイン・果実酒', 'クラフトビール',
      '梅酒・かし酒',
      '機能性食品', 'サプリ・健康飲料',
    ],
  },
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`[add-category-fields] DRY_RUN=${DRY_RUN}`);
  console.log(`[add-category-fields] target email: ${TARGET_EMAIL}`);

  const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;
  const user = usersList?.users?.find((u) => u.email === TARGET_EMAIL);
  if (!user) throw new Error(`User not found: ${TARGET_EMAIL}`);
  console.log(`[add-category-fields] user id: ${user.id}`);

  const { data: members, error: memberErr } = await supabase
    .from('organization_members')
    .select('organization_id, role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true);
  if (memberErr) throw memberErr;
  if (!members || members.length === 0) throw new Error('No organization membership found');

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

  console.log(`org name: ${org.name}`);

  const settings = org.settings ?? {};
  const schema = Array.isArray(settings.product_field_schema)
    ? [...settings.product_field_schema]
    : [];

  console.log(`\ncurrent schema fields: ${schema.length}`);

  const newSchema = [...schema];
  const summary = { added: [], updated: [], unchanged: [] };

  for (const def of CATEGORY_FIELDS) {
    const idx = newSchema.findIndex((f) => f.key === def.key);
    if (idx === -1) {
      newSchema.push({
        id: `schema-${def.key}-${Date.now()}`,
        key: def.key,
        label: def.label,
        type: def.type,
        options: def.options,
      });
      summary.added.push(def.key);
    } else {
      const existing = newSchema[idx];
      const sameType = existing.type === def.type;
      const sameOptions = JSON.stringify(existing.options ?? []) === JSON.stringify(def.options);
      const sameLabel = existing.label === def.label;
      if (sameType && sameOptions && sameLabel) {
        summary.unchanged.push(def.key);
      } else {
        newSchema[idx] = {
          ...existing,
          label: def.label || existing.label,
          type: def.type,
          options: def.options,
        };
        summary.updated.push(def.key);
      }
    }
  }

  console.log(`added    (${summary.added.length}): ${summary.added.join(', ') || '(none)'}`);
  console.log(`updated  (${summary.updated.length}): ${summary.updated.join(', ') || '(none)'}`);
  console.log(`unchanged(${summary.unchanged.length}): ${summary.unchanged.join(', ') || '(none)'}`);

  console.log(`\nresult schema fields: ${newSchema.length}`);
  for (const f of newSchema) {
    console.log(`  - ${f.key} (${f.type})${f.options ? ` [${f.options.length}opt]` : ''} -> ${f.label}`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] skip update');
    return;
  }

  if (summary.added.length === 0 && summary.updated.length === 0) {
    console.log('\nno changes to apply.');
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

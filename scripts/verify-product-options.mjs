#!/usr/bin/env node
/**
 * machimogu@example.com テナントの商品カスタムフィールドについて
 * 「期待する選択肢」と現在のDBの選択肢が一致しているかを検証する。
 * 不一致があれば --apply を付けて反映できる。
 *
 * 実行:
 *   node scripts/verify-product-options.mjs           # チェックのみ
 *   node scripts/verify-product-options.mjs --apply   # 不一致を上書き反映
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TARGET_EMAIL = 'machimogu@example.com';
const APPLY = process.argv.includes('--apply');

// 期待する選択肢
const EXPECTED = [
  { key: 'priceType',   label: '価格種別',     options: ['直接入力', 'オープン', '時価'] },
  { key: 'expiry_type', label: '期限種別',     options: ['賞味期限', '消費期限'] },
  { key: 'salesForm',   label: '販売形態',     options: ['小売用', '業務用', '小売・業務用'] },
  { key: 'export',      label: '国外輸出可否', options: ['相談可', '不可'] },
  { key: 'webSales',    label: 'WEBサイト販売',options: ['自社サイト', '他社サイト', 'なし'] },
  { key: 'category',    label: '大カテゴリ',   options: ['生鮮・一次産品', '加工食品', '飲料・酒類', '健康食品'] },
];

const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
const user = usersList?.users?.find((u) => u.email === TARGET_EMAIL);
const { data: members } = await supabase
  .from('organization_members')
  .select('organization_id')
  .eq('user_id', user.id)
  .eq('is_active', true);

for (const m of members) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, settings')
    .eq('id', m.organization_id)
    .single();

  console.log(`\n=== ${org.name} ===`);
  const settings = org.settings ?? {};
  const schema = Array.isArray(settings.product_field_schema) ? [...settings.product_field_schema] : [];

  let mutated = false;
  const ok = [];
  const ng = [];
  const missing = [];

  for (const exp of EXPECTED) {
    const idx = schema.findIndex(f => f.key === exp.key);
    if (idx === -1) {
      missing.push(exp.key);
      continue;
    }
    const cur = schema[idx];
    const same = JSON.stringify(cur.options ?? null) === JSON.stringify(exp.options);
    if (same) {
      ok.push(`${exp.key} (${exp.label}) ✅ [${exp.options.join(' / ')}]`);
    } else {
      ng.push({
        key: exp.key,
        label: exp.label,
        current: cur.options,
        expected: exp.options,
      });
      if (APPLY) {
        schema[idx] = { ...cur, options: exp.options };
        mutated = true;
      }
    }
  }

  console.log(`\n[OK 一致 ${ok.length}/${EXPECTED.length}]`);
  for (const line of ok) console.log(`  - ${line}`);

  if (ng.length > 0) {
    console.log(`\n[NG 不一致 ${ng.length}]`);
    for (const x of ng) {
      console.log(`  - ${x.key} (${x.label})`);
      console.log(`      現在: [${(x.current ?? []).join(' / ')}]`);
      console.log(`      期待: [${x.expected.join(' / ')}]`);
    }
  }
  if (missing.length > 0) {
    console.log(`\n[MISSING ${missing.length}] ${missing.join(', ')}`);
  }

  if (APPLY && mutated) {
    const newSettings = { ...settings, product_field_schema: schema };
    const { error: updateErr } = await supabase
      .from('organizations')
      .update({ settings: newSettings, updated_at: new Date().toISOString() })
      .eq('id', org.id);
    if (updateErr) throw updateErr;
    console.log('\n✅ 不一致を反映しました');
  } else if (ng.length === 0 && missing.length === 0) {
    console.log('\n🎉 全件一致。修正不要。');
  } else if (!APPLY && ng.length > 0) {
    console.log('\n（--apply を付けて再実行すると上書き反映します）');
  }
}

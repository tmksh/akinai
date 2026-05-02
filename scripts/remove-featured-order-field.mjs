#!/usr/bin/env node
/**
 * machimogu@example.com テナントの商品カスタムフィールドスキーマから
 * 未使用の "featuredOrder"（TOPページ表示順）フィールドを削除する。
 *
 * コードベースで一切参照されていない孤立フィールドのため削除。
 * 既存商品の custom_fields データに値が入っているものは念のため報告する。
 *
 * 実行: node scripts/remove-featured-order-field.mjs [--dry-run]
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
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing env vars'); process.exit(1); }

const TARGET_EMAIL = 'machimogu@example.com';
const TARGET_KEY = 'featuredOrder';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`[remove-featured-order] DRY_RUN=${DRY_RUN}`);

  const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = usersList?.users?.find((u) => u.email === TARGET_EMAIL);
  if (!user) throw new Error(`User not found: ${TARGET_EMAIL}`);

  const { data: members } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true);

  for (const m of members) {
    console.log(`\n=== Organization: ${m.organization_id} ===`);
    await processOrganization(m.organization_id);
  }
}

async function processOrganization(orgId) {
  const { data: org, error: fetchErr } = await supabase
    .from('organizations')
    .select('id, name, settings')
    .eq('id', orgId)
    .single();
  if (fetchErr) throw fetchErr;
  console.log(`org: ${org.name}`);

  const settings = org.settings ?? {};
  const schema = Array.isArray(settings.product_field_schema)
    ? [...settings.product_field_schema]
    : [];

  const idx = schema.findIndex((f) => f.key === TARGET_KEY);
  if (idx === -1) {
    console.log(`  スキーマ: "${TARGET_KEY}" は存在しない（既に削除済み）`);
    return;
  }

  const target = schema[idx];
  console.log(`  スキーマ: "${TARGET_KEY}" (${target.type}) "${target.label}" を削除`);

  // 既存商品にデータが入っていないか確認
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, custom_fields')
    .eq('organization_id', orgId)
    .not('custom_fields', 'is', null);
  if (prodErr) throw prodErr;

  const withData = (products ?? []).filter((p) => {
    const cf = Array.isArray(p.custom_fields) ? p.custom_fields : [];
    const f = cf.find((x) => x.key === TARGET_KEY);
    return f && f.value !== null && f.value !== undefined && f.value !== '';
  });

  if (withData.length > 0) {
    console.log(`  ⚠️  以下の商品に "${TARGET_KEY}" の値が入っています（削除後も products テーブルのデータは残ります）:`);
    for (const p of withData) {
      const cf = Array.isArray(p.custom_fields) ? p.custom_fields : [];
      const val = cf.find((x) => x.key === TARGET_KEY)?.value;
      console.log(`    - ${p.id} "${p.name}": value="${val}"`);
    }
  } else {
    console.log(`  既存商品 ${(products ?? []).length}件中 "${TARGET_KEY}" に値あり: 0件（安全に削除可能）`);
  }

  const newSchema = schema.filter((f) => f.key !== TARGET_KEY);
  console.log(`  スキーマ: ${schema.length} → ${newSchema.length} フィールド`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] 変更なし');
    return;
  }

  const newSettings = { ...settings, product_field_schema: newSchema };
  const { error } = await supabase
    .from('organizations')
    .update({ settings: newSettings, updated_at: new Date().toISOString() })
    .eq('id', orgId);
  if (error) throw error;

  console.log('  ✅ スキーマから削除しました');
}

main().catch((err) => {
  console.error('\n❌ ERROR:', err);
  process.exit(1);
});

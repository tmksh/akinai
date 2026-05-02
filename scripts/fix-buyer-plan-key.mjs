#!/usr/bin/env node
/**
 * machimogu@example.com テナントのバイヤー「プラン」フィールドを修正する
 *
 * 1. 顧客カスタムフィールドスキーマの buyer プラン key を
 *      field_mof8dp8f → plan に変更
 * 2. 既存のバイヤー顧客レコード（customers テーブル）の
 *    custom_fields 内でも同キーをリネーム（データ移行）
 *
 * 実行: node scripts/fix-buyer-plan-key.mjs [--dry-run]
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
const OLD_KEY = 'field_mof8dp8f';
const NEW_KEY = 'plan';
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`[fix-buyer-plan-key] DRY_RUN=${DRY_RUN}`);
  console.log(`[fix-buyer-plan-key] ${OLD_KEY} → ${NEW_KEY}`);

  // ユーザー・組織を特定
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
  const schema = Array.isArray(settings.customer_field_schema)
    ? [...settings.customer_field_schema]
    : [];

  // ---- 1. スキーマのキーをリネーム ----
  const schemaIdx = schema.findIndex(
    (f) => f.key === OLD_KEY && Array.isArray(f.roles) && f.roles.includes('buyer')
  );
  if (schemaIdx === -1) {
    console.log(`  スキーマ: "${OLD_KEY}"(buyer) は存在しないかすでにリネーム済みです`);
  } else {
    const before = schema[schemaIdx];
    console.log(`  スキーマ: "${OLD_KEY}" → "${NEW_KEY}" (label="${before.label}", type="${before.type}")`);
    if (!DRY_RUN) {
      schema[schemaIdx] = { ...before, key: NEW_KEY };
      const newSettings = { ...settings, customer_field_schema: schema };
      const { error } = await supabase
        .from('organizations')
        .update({ settings: newSettings, updated_at: new Date().toISOString() })
        .eq('id', orgId);
      if (error) throw error;
      console.log(`  ✅ スキーマを更新しました`);
    }
  }

  // ---- 2. 既存顧客データのキーをリネーム ----
  // バイヤー会員でcustom_fields に OLD_KEY が含まれているものを取得
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('id, name, role, custom_fields')
    .eq('organization_id', orgId)
    .eq('role', 'buyer');
  if (custErr) throw custErr;

  const targets = (customers ?? []).filter((c) => {
    const cf = Array.isArray(c.custom_fields) ? c.custom_fields : [];
    return cf.some((f) => f.key === OLD_KEY);
  });

  console.log(`\n  既存バイヤー会員: ${(customers ?? []).length}件中 ${targets.length}件 に "${OLD_KEY}" あり`);

  if (targets.length === 0) {
    console.log('  データ移行: 対象なし');
  } else {
    for (const c of targets) {
      const oldCf = Array.isArray(c.custom_fields) ? c.custom_fields : [];
      const newCf = oldCf.map((f) => f.key === OLD_KEY ? { ...f, key: NEW_KEY } : f);
      const oldVal = oldCf.find((f) => f.key === OLD_KEY)?.value ?? '(空)';
      console.log(`  - customer ${c.id} (${c.name}): ${OLD_KEY}="${oldVal}" → ${NEW_KEY}="${oldVal}"`);
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('customers')
          .update({ custom_fields: newCf, updated_at: new Date().toISOString() })
          .eq('id', c.id);
        if (error) throw error;
      }
    }
    if (!DRY_RUN) {
      console.log(`  ✅ ${targets.length}件の顧客データを移行しました`);
    } else {
      console.log(`  [DRY RUN] 上記 ${targets.length}件 を移行予定`);
    }
  }

  if (DRY_RUN) console.log('\n[DRY RUN] 変更なし');
}

main().catch((err) => {
  console.error('\n❌ ERROR:', err);
  process.exit(1);
});

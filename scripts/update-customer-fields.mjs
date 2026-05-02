#!/usr/bin/env node
/**
 * machimogu@example.com テナントの顧客カスタムフィールドを更新する
 *
 * 【1】不足フィールドの追加
 *   - 全種別共通: referral_code
 *   - サプライヤー: representative / address / businessCategory / pr / siteUrl
 *   - バイヤー    : representative / address / pr
 *
 * 【2】既存フィールドの選択肢修正
 *   - サプライヤー「プラン」: free / simple / rich / premium
 *   - バイヤー「会社規模」  : 6段階
 *   - 個人会員「性別」      : 男性 / 女性 / その他 / 回答しない
 *   - 個人会員「興味ジャンル」: 14個
 *
 * 既存キーは field_xxxxx と正規キー（plan/company_size 等）が混在しているため、
 * 既存フィールドの判定は以下の優先順で行う:
 *   1) matchKey + matchRole で完全一致
 *   2) matchLabel + matchRole でラベル一致
 *
 * 実行: node scripts/update-customer-fields.mjs [--dry-run]
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

// ============================================================
// 追加フィールド定義
// roles: undefined => 全種別共通（all）
// ============================================================
const FIELD_ADDITIONS = [
  // 全種別共通
  {
    key: 'referral_code',
    label: '紹介コード',
    type: 'text',
    placeholder: '自動発行（REF-XXXX形式）',
    roles: undefined,
  },

  // サプライヤー
  { key: 'representative',   label: '代表者名',         type: 'text',     roles: ['supplier'] },
  { key: 'address',          label: '住所',             type: 'text',     roles: ['supplier'] },
  { key: 'businessCategory', label: '取扱商品カテゴリ', type: 'text',     roles: ['supplier'] },
  { key: 'pr',               label: 'PR文',             type: 'textarea', roles: ['supplier'] },
  { key: 'siteUrl',          label: '公式サイトURL',    type: 'text',     roles: ['supplier'] },

  // バイヤー
  { key: 'representative',   label: '代表者名',         type: 'text',     roles: ['buyer'] },
  { key: 'address',          label: '住所',             type: 'text',     roles: ['buyer'] },
  { key: 'pr',               label: 'PR文',             type: 'textarea', roles: ['buyer'] },
];

// ============================================================
// 選択肢の上書き対象
// matchKey or matchLabel を使って既存フィールドを特定し、options を上書き
// ============================================================
const OPTION_UPDATES = [
  {
    matchKey: 'plan',
    matchRole: 'supplier',
    label: 'プラン',
    options: ['free', 'simple', 'rich', 'premium'],
  },
  {
    matchKey: 'company_size',
    matchRole: 'buyer',
    label: '会社規模',
    options: ['1〜9名', '10〜49名', '50〜99名', '100〜299名', '300〜999名', '1000名以上'],
  },
  {
    matchLabel: '性別',
    matchRole: 'personal',
    label: '性別',
    options: ['男性', '女性', 'その他', '回答しない'],
  },
  {
    matchLabel: '興味ジャンル',
    matchRole: 'personal',
    label: '興味ジャンル',
    options: [
      '農産物・野菜', '果物', '海産物・魚介類', '肉類', '乳製品',
      '調味料・ソース', '漬物・発酵食品', 'お茶・飲料', 'お菓子・スイーツ',
      '麺・パスタ', 'レトルト・缶詰', '健康食品', 'ギフト・お土産', 'その他',
    ],
  },
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function rolesEqual(a, b) {
  const norm = (r) => {
    if (!Array.isArray(r) || r.length === 0) return [];
    return [...r].sort();
  };
  const aa = norm(a);
  const bb = norm(b);
  if (aa.length !== bb.length) return false;
  return aa.every((v, i) => v === bb[i]);
}

function fieldRolesIncludes(field, role) {
  // ロール未指定（または空配列）は全員共通＝all
  if (!Array.isArray(field.roles) || field.roles.length === 0) {
    return role === 'all';
  }
  return field.roles.includes(role);
}

async function main() {
  console.log(`[update-customer-fields] DRY_RUN=${DRY_RUN}`);
  console.log(`[update-customer-fields] target email: ${TARGET_EMAIL}`);

  const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;
  const user = usersList?.users?.find((u) => u.email === TARGET_EMAIL);
  if (!user) throw new Error(`User not found: ${TARGET_EMAIL}`);
  console.log(`[update-customer-fields] user id: ${user.id}`);

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
    .select('id, name, settings')
    .eq('id', orgId)
    .single();
  if (fetchErr) throw fetchErr;

  console.log(`org name: ${org.name}`);

  const settings = org.settings ?? {};
  const schema = Array.isArray(settings.customer_field_schema)
    ? [...settings.customer_field_schema]
    : [];

  console.log(`current customer fields: ${schema.length}`);

  const summary = {
    optionsUpdated: [],
    optionsUnchanged: [],
    optionsNotFound: [],
    added: [],
    addSkippedDup: [],
  };

  // ---- 1) 選択肢の上書き ----
  for (const upd of OPTION_UPDATES) {
    const idx = schema.findIndex((f) => {
      if (!fieldRolesIncludes(f, upd.matchRole)) return false;
      if (upd.matchKey && f.key === upd.matchKey) return true;
      if (upd.matchLabel && f.label === upd.matchLabel) return true;
      return false;
    });

    if (idx === -1) {
      summary.optionsNotFound.push(`${upd.matchKey ?? upd.matchLabel}@${upd.matchRole}`);
      continue;
    }

    const existing = schema[idx];
    const same = JSON.stringify(existing.options ?? null) === JSON.stringify(upd.options);
    if (same) {
      summary.optionsUnchanged.push(`${existing.key}(${existing.label})`);
    } else {
      schema[idx] = { ...existing, options: upd.options };
      summary.optionsUpdated.push(`${existing.key}(${existing.label}) [${(existing.options ?? []).length}->${upd.options.length}]`);
    }
  }

  // ---- 2) 不足フィールドの追加 ----
  for (const add of FIELD_ADDITIONS) {
    // (key, roles) の組み合わせで既存重複チェック
    const existsIdx = schema.findIndex((f) => {
      if (f.key !== add.key) return false;
      return rolesEqual(f.roles, add.roles);
    });
    if (existsIdx !== -1) {
      summary.addSkippedDup.push(`${add.key}@${(add.roles ?? ['all']).join(',')}`);
      continue;
    }
    schema.push({
      id: `cf-${add.key}-${(add.roles ?? ['all']).join('_')}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      key: add.key,
      label: add.label,
      type: add.type,
      ...(add.placeholder ? { placeholder: add.placeholder } : {}),
      ...(add.roles ? { roles: add.roles } : {}),
    });
    summary.added.push(`${add.key}@${(add.roles ?? ['all']).join(',')}`);
  }

  // ---- summary ----
  console.log('\n--- summary ---');
  console.log(`options updated   (${summary.optionsUpdated.length}): ${summary.optionsUpdated.join(', ') || '(none)'}`);
  console.log(`options unchanged (${summary.optionsUnchanged.length}): ${summary.optionsUnchanged.join(', ') || '(none)'}`);
  console.log(`options NOT FOUND (${summary.optionsNotFound.length}): ${summary.optionsNotFound.join(', ') || '(none)'}`);
  console.log(`added             (${summary.added.length}): ${summary.added.join(', ') || '(none)'}`);
  console.log(`add skipped (dup) (${summary.addSkippedDup.length}): ${summary.addSkippedDup.join(', ') || '(none)'}`);

  // ---- result preview (group by role) ----
  console.log(`\nresult customer fields: ${schema.length}`);
  const groups = { all: [], personal: [], buyer: [], supplier: [] };
  for (const f of schema) {
    const roles = Array.isArray(f.roles) && f.roles.length > 0 ? f.roles : ['all'];
    for (const r of roles) {
      if (groups[r]) groups[r].push(f);
    }
  }
  for (const [role, fields] of Object.entries(groups)) {
    console.log(`\n  [${role}] ${fields.length} fields`);
    for (const f of fields) {
      const opts = Array.isArray(f.options) ? ` opts(${f.options.length})=[${f.options.join(' / ')}]` : '';
      console.log(`    - ${f.key} (${f.type}) -> ${f.label}${opts}`);
    }
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] skip update');
    return;
  }

  const hasChanges =
    summary.optionsUpdated.length > 0 ||
    summary.added.length > 0;
  if (!hasChanges) {
    console.log('\nno changes to apply.');
    return;
  }

  const newSettings = { ...settings, customer_field_schema: schema };
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

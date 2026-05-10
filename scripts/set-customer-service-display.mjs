#!/usr/bin/env node
/**
 * 指定テナントの customer_one_time_services に
 * imageUrl / displayOrder を一括設定する。
 *
 * 実行例:
 *   node scripts/set-customer-service-display.mjs --email machimogu@example.com --dry-run
 *   node scripts/set-customer-service-display.mjs --email machimogu@example.com
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

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const emailIdx = args.indexOf('--email');
const TARGET_EMAIL = emailIdx >= 0 ? args[emailIdx + 1] : null;
if (!TARGET_EMAIL) {
  console.error('--email <user@example.com> を指定してください');
  process.exit(1);
}

/**
 * サービス名（完全一致）→ 設定値 のマップ。
 * 同名サービスが複数あるテナント運用は想定しない（あれば最初の1件のみ更新）。
 */
const TARGETS = [
  { name: 'ロゴ制作', imageUrl: '/images/service-logo.jpg', displayOrder: 1 },
  { name: '補助金申請書作成代行', imageUrl: '/images/service-hojokin.jpg', displayOrder: 2 },
  { name: '在庫管理ツール', imageUrl: '/images/service-inventory.jpg', displayOrder: 3 },
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const { data: users } = await supabase
  .from('users')
  .select('id')
  .eq('email', TARGET_EMAIL);
if (!users?.length) {
  console.error(`ユーザーが見つかりません: ${TARGET_EMAIL}`);
  process.exit(1);
}
const { data: members } = await supabase
  .from('organization_members')
  .select('organization_id')
  .in('user_id', users.map((u) => u.id));
const orgId = members?.[0]?.organization_id;
if (!orgId) {
  console.error('organization_id が取得できませんでした');
  process.exit(1);
}

const { data: org } = await supabase
  .from('organizations')
  .select('settings')
  .eq('id', orgId)
  .single();

const settings = org?.settings ?? {};
const ots = settings.customer_one_time_services ?? {};
const services = Array.isArray(ots.services) ? ots.services : [];

const now = new Date().toISOString();
const changes = [];
const notFound = [];

const updated = services.map((svc) => {
  const target = TARGETS.find((t) => t.name === svc.name);
  if (!target) return svc;
  const before = { imageUrl: svc.imageUrl ?? '', displayOrder: svc.displayOrder ?? 0 };
  const after = { imageUrl: target.imageUrl, displayOrder: target.displayOrder };
  if (before.imageUrl === after.imageUrl && before.displayOrder === after.displayOrder) {
    changes.push({ name: svc.name, before, after, skipped: true });
    return svc;
  }
  changes.push({ name: svc.name, before, after, skipped: false });
  return { ...svc, imageUrl: after.imageUrl, displayOrder: after.displayOrder, updatedAt: now };
});

for (const t of TARGETS) {
  if (!services.find((s) => s.name === t.name)) {
    notFound.push(t.name);
  }
}

console.log(`organization_id: ${orgId}`);
console.log(`対象サービス: ${TARGETS.length} / 該当: ${changes.length} / 未存在: ${notFound.length}\n`);

for (const c of changes) {
  if (c.skipped) {
    console.log(`= ${c.name} (変更なし: imageUrl="${c.before.imageUrl}", displayOrder=${c.before.displayOrder})`);
  } else {
    console.log(`+ ${c.name}`);
    console.log(`    imageUrl: "${c.before.imageUrl}" → "${c.after.imageUrl}"`);
    console.log(`    displayOrder: ${c.before.displayOrder} → ${c.after.displayOrder}`);
  }
}

if (notFound.length > 0) {
  console.log('\n未存在 (該当サービスがありません):');
  for (const n of notFound) console.log(`  - ${n}`);
}

if (DRY_RUN) {
  console.log('\n--dry-run 指定のため実際の更新はスキップ');
  process.exit(0);
}

const willUpdate = changes.some((c) => !c.skipped);
if (!willUpdate) {
  console.log('\n変更が必要な項目はありません。終了します。');
  process.exit(0);
}

const newSettings = {
  ...settings,
  customer_one_time_services: { ...ots, services: updated },
};

const { error } = await supabase
  .from('organizations')
  .update({ settings: newSettings, updated_at: now })
  .eq('id', orgId);

if (error) {
  console.error('\n更新失敗:', error);
  process.exit(1);
}
console.log('\n完了: settings を更新しました');

#!/usr/bin/env node
/**
 * 指定テナントの customer_one_time_services 設定を一覧表示する。
 *
 * 実行例:
 *   node scripts/inspect-customer-services.mjs --email machimogu@example.com
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
const emailIdx = args.indexOf('--email');
const TARGET_EMAIL = emailIdx >= 0 ? args[emailIdx + 1] : null;
if (!TARGET_EMAIL) {
  console.error('--email <user@example.com> を指定してください');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const { data: users } = await supabase
  .from('users')
  .select('id')
  .eq('email', TARGET_EMAIL);
if (!users?.length) {
  console.error('ユーザーが見つかりません');
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
console.log(`organization_id: ${orgId}`);

const { data: org } = await supabase
  .from('organizations')
  .select('settings')
  .eq('id', orgId)
  .single();

const settings = org?.settings ?? {};
const ots = settings.customer_one_time_services ?? {};
console.log(`enabled: ${ots.enabled ?? false}`);
const services = Array.isArray(ots.services) ? ots.services : [];
console.log(`サービス数: ${services.length}\n`);

for (const s of services) {
  console.log(`- ${s.name} [id=${s.id}]`);
  console.log(`    amount: ¥${(s.amount ?? 0).toLocaleString()}`);
  console.log(`    isActive: ${s.isActive}`);
  console.log(`    sortOrder: ${s.sortOrder}`);
  console.log(`    imageUrl: ${s.imageUrl ?? '(未設定)'}`);
  console.log(`    displayOrder: ${s.displayOrder ?? '(未設定)'}`);
  console.log(`    targetRole: ${s.targetRole ?? '(指定なし)'}`);
  console.log(`    category: ${s.category ?? '(指定なし)'}`);
  console.log(`    googleFormUrl: ${s.googleFormUrl ?? '(未設定)'}`);
  console.log(`    buyerGoogleFormUrl: ${s.buyerGoogleFormUrl ?? '(未設定)'}`);
}

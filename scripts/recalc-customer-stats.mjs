#!/usr/bin/env node
/**
 * 顧客の集計値・プラン表示を一括で正しい値に修復する。
 *
 *  1. customers.total_orders / total_spent を orders から再集計
 *     （集計対象は payment_status が failed/refunded ではない order）
 *
 *  2. custom_fields.subscription.status === 'active' | 'trialing' の顧客は
 *     custom_fields.plan を該当プランの名前に同期
 *     （プランが見つからなければ変更しない）
 *
 *  3. それ以外（サブスク無し / canceled / incomplete 等）は plan を触らない
 *     （ここで free に書き換えると意図せぬ上書きになるため）
 *
 * 実行例:
 *   node scripts/recalc-customer-stats.mjs --email machimogu@example.com --dry-run
 *   node scripts/recalc-customer-stats.mjs --email machimogu@example.com
 *   node scripts/recalc-customer-stats.mjs --email machimogu@example.com --customer-email jukichi79724@gmail.com
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
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const emailIdx = args.indexOf('--email');
const TARGET_EMAIL = emailIdx >= 0 ? args[emailIdx + 1] : null;
const customerEmailIdx = args.indexOf('--customer-email');
const TARGET_CUSTOMER_EMAIL = customerEmailIdx >= 0 ? args[customerEmailIdx + 1] : null;
const customerIdIdx = args.indexOf('--customer-id');
const TARGET_CUSTOMER_ID = customerIdIdx >= 0 ? args[customerIdIdx + 1] : null;

if (!TARGET_EMAIL) {
  console.error('--email <admin@example.com>（テナント管理者の email）を指定してください');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const { data: users } = await supabase.from('users').select('id').eq('email', TARGET_EMAIL);
if (!users?.length) {
  console.error(`管理ユーザーが見つかりません: ${TARGET_EMAIL}`);
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
const plansSettings = org?.settings?.customer_subscription_plans ?? {};
const plans = Array.isArray(plansSettings?.plans) ? plansSettings.plans : [];
const planNameById = Object.fromEntries(plans.map((p) => [p.id, p.name]));

console.log(`organization_id : ${orgId}`);
console.log(`プラン定義数    : ${plans.length}`);
console.log('');

let q = supabase
  .from('customers')
  .select('id, name, email, custom_fields, total_orders, total_spent')
  .eq('organization_id', orgId);
if (TARGET_CUSTOMER_ID) q = q.eq('id', TARGET_CUSTOMER_ID);
if (TARGET_CUSTOMER_EMAIL) q = q.eq('email', TARGET_CUSTOMER_EMAIL);

const { data: customers, error: cErr } = await q;
if (cErr) {
  console.error('顧客取得失敗:', cErr);
  process.exit(1);
}
if (!customers?.length) {
  console.error('対象顧客が見つかりません');
  process.exit(1);
}

console.log(`対象顧客数: ${customers.length}\n`);

let statsUpdated = 0;
let planUpdated = 0;
let unchanged = 0;
let failed = 0;

for (const c of customers) {
  // ── 1. total_orders / total_spent 再集計 ──
  const { data: rows, error: ordersErr } = await supabase
    .from('orders')
    .select('total, payment_status')
    .eq('organization_id', orgId)
    .eq('customer_id', c.id);
  if (ordersErr) {
    console.error(`  ${c.email}: orders 取得失敗:`, ordersErr.message);
    failed++;
    continue;
  }
  const valid = (rows ?? []).filter(
    (r) => r.payment_status !== 'failed' && r.payment_status !== 'refunded'
  );
  const newTotalOrders = valid.length;
  const newTotalSpent = valid.reduce((s, r) => s + (Number(r.total) || 0), 0);

  const statsChanged =
    Number(c.total_orders ?? 0) !== newTotalOrders ||
    Number(c.total_spent ?? 0) !== newTotalSpent;

  // ── 2. custom_fields.plan 同期 ──
  const cf = c.custom_fields ?? {};
  const sub = cf.subscription ?? null;
  const subStatus = sub?.status ?? null;
  const subPlanId = sub?.planId ?? null;
  const newPlanLabel =
    (subStatus === 'active' || subStatus === 'trialing') && subPlanId
      ? planNameById[subPlanId] ?? null
      : null;
  const planChanged = newPlanLabel && cf.plan !== newPlanLabel;

  if (!statsChanged && !planChanged) {
    unchanged++;
    continue;
  }

  const updatePayload = { updated_at: new Date().toISOString() };
  const logs = [];
  if (statsChanged) {
    updatePayload.total_orders = newTotalOrders;
    updatePayload.total_spent = newTotalSpent;
    logs.push(
      `orders ${c.total_orders ?? 0}→${newTotalOrders}, spent ¥${
        c.total_spent ?? 0
      }→¥${newTotalSpent}`
    );
  }
  if (planChanged) {
    updatePayload.custom_fields = { ...cf, plan: newPlanLabel };
    logs.push(`plan "${cf.plan ?? '(なし)'}"→"${newPlanLabel}"`);
  }

  console.log(`+ ${c.email}: ${logs.join(' / ')}`);

  if (DRY_RUN) {
    if (statsChanged) statsUpdated++;
    if (planChanged) planUpdated++;
    continue;
  }

  const { error: upErr } = await supabase
    .from('customers')
    .update(updatePayload)
    .eq('id', c.id)
    .eq('organization_id', orgId);
  if (upErr) {
    console.error(`  ${c.email}: 更新失敗:`, upErr.message);
    failed++;
    continue;
  }
  if (statsChanged) statsUpdated++;
  if (planChanged) planUpdated++;
}

console.log(
  `\n結果: 集計更新 ${statsUpdated} 件 / プラン更新 ${planUpdated} 件 / 変更なし ${unchanged} 件 / 失敗 ${failed} 件`
);
if (DRY_RUN) console.log('\n--dry-run 指定のため DB 書き込みはスキップされました');

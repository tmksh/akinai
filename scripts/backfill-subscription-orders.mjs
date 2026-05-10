#!/usr/bin/env node
/**
 * 顧客サブスクの過去決済を orders テーブルに後追いで登録する救済スクリプト。
 *
 * Webhook の不具合等で `customers.custom_fields.subscription.status = 'active'`
 * なのに orders にレコードが無い顧客を探し、サブスク 1 件につき
 * 1 つの order を作成する（既に存在する場合はスキップ）。
 *
 * Stripe Connect 上のサブスクが無い場合は何もしない。
 * メール送信は行わない（過去の決済は当時送信済みの想定）。
 *
 * 実行例:
 *   # まずは dry-run で対象を確認
 *   node scripts/backfill-subscription-orders.mjs --email machimogu@example.com --dry-run
 *   # 全顧客に対して実行
 *   node scripts/backfill-subscription-orders.mjs --email machimogu@example.com
 *   # 1 顧客のみ
 *   node scripts/backfill-subscription-orders.mjs --email machimogu@example.com --customer-email jukichi79724@gmail.com
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const envText = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !STRIPE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / STRIPE_SECRET_KEY が必要です');
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
  console.error('--email <admin@example.com> （テナント管理者の email）を指定してください');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const stripe = new Stripe(STRIPE_KEY);

// ─── テナントと Stripe Connect アカウントを解決 ───
const { data: users } = await supabase
  .from('users')
  .select('id')
  .eq('email', TARGET_EMAIL);
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
  .select('stripe_account_id, settings')
  .eq('id', orgId)
  .single();
const stripeAccount = org?.stripe_account_id;
if (!stripeAccount) {
  console.error('この組織には Stripe Connect アカウントが設定されていません');
  process.exit(1);
}
const settings = org?.settings ?? {};
// organizations.settings.customer_subscription_plans が正しいキー
// （src/lib/customer-subscription-plans.ts の readPlansSettings と同じ）
const plansSettings = settings?.customer_subscription_plans ?? {};
const plans = Array.isArray(plansSettings?.plans) ? plansSettings.plans : [];
const subscriptionCreatesOrder = !!plansSettings?.subscriptionCreatesOrder;

console.log(`organization_id : ${orgId}`);
console.log(`stripe_account_id: ${stripeAccount}`);
console.log(`subscriptionCreatesOrder (現在設定): ${subscriptionCreatesOrder}`);
if (!subscriptionCreatesOrder) {
  console.log('→ 設定が無効でも救済対象には order を作成します（過去分の補填のため）');
}
console.log('');

// ─── 対象顧客リスト ───
let q = supabase
  .from('customers')
  .select('id, name, email, custom_fields')
  .eq('organization_id', orgId);
if (TARGET_CUSTOMER_ID) q = q.eq('id', TARGET_CUSTOMER_ID);
if (TARGET_CUSTOMER_EMAIL) q = q.eq('email', TARGET_CUSTOMER_EMAIL);

const { data: customers, error: customersErr } = await q;
if (customersErr) {
  console.error('顧客取得失敗:', customersErr);
  process.exit(1);
}
if (!customers?.length) {
  console.error('対象顧客が見つかりません');
  process.exit(1);
}

console.log(`対象顧客数: ${customers.length}\n`);

let created = 0;
let skipped = 0;
let noSub = 0;
let failed = 0;

for (const c of customers) {
  const cf = c.custom_fields ?? {};
  const sub = cf.subscription ?? null;
  const subId = sub?.stripeSubscriptionId ?? null;

  if (!subId) {
    console.log(`- ${c.email}: subscription 情報なし → スキップ`);
    noSub++;
    continue;
  }
  if (sub.status !== 'active' && sub.status !== 'trialing') {
    console.log(`- ${c.email}: status=${sub.status} → スキップ`);
    skipped++;
    continue;
  }

  // 既存 order の重複チェック（notes に subId が入っているもの）
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('organization_id', orgId)
    .eq('customer_id', c.id)
    .ilike('notes', `%${subId}%`)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`= ${c.email}: 既に order あり (${existing[0].id}) → スキップ`);
    skipped++;
    continue;
  }

  // Stripe からサブスクを取得して金額確認
  let stripeSub;
  try {
    stripeSub = await stripe.subscriptions.retrieve(subId, { stripeAccount });
  } catch (err) {
    console.error(`  ${c.email}: Stripe サブスク取得失敗 (${subId}):`, err.message);
    failed++;
    continue;
  }

  const planId = sub.planId ?? stripeSub.metadata?.akinai_plan_id ?? null;
  const plan = plans.find((p) => p.id === planId);
  // プラン金額 → サブスクの items 単価 → 0 の順で解決
  const itemAmount = stripeSub.items?.data?.[0]?.price?.unit_amount ?? 0;
  const amount = plan?.amount ?? itemAmount ?? 0;
  const planName = plan?.name ?? 'サブスクリプション';

  console.log(
    `+ ${c.email}: order を作成予定 amount=${amount} plan=${planName} sub=${subId}`
  );

  if (DRY_RUN) {
    created++;
    continue;
  }

  const orderNumber = generateOrderNumber();
  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
      organization_id: orgId,
      order_number: orderNumber,
      customer_id: c.id,
      customer_name: c.name ?? '',
      customer_email: c.email ?? '',
      subtotal: amount,
      shipping_cost: 0,
      tax: 0,
      total: amount,
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'subscription',
      // orders.shipping_address は NOT NULL なので空オブジェクトを入れる
      shipping_address: {},
      notes: `サブスクリプション: ${planName} (${subId}) [backfill]`,
      stripe_payment_intent_id: null,
    })
    .select('id')
    .single();

  if (orderError || !newOrder) {
    console.error(`  ${c.email}: order 作成失敗:`, orderError?.message);
    failed++;
    continue;
  }

  await supabase.from('order_items').insert({
    order_id: newOrder.id,
    product_id: null,
    variant_id: null,
    product_name: planName,
    variant_name: null,
    sku: null,
    quantity: 1,
    unit_price: amount,
    total_price: amount,
  });

  console.log(`  ${c.email}: ✓ order_id=${newOrder.id}`);
  created++;
}

console.log(
  `\n結果: 作成 ${created} 件 / スキップ ${skipped} 件 / サブスクなし ${noSub} 件 / 失敗 ${failed} 件`
);
if (DRY_RUN) console.log('\n--dry-run 指定のため DB 書き込みはスキップされました');

function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${y}${m}${d}-${r}`;
}

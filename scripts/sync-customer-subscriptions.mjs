#!/usr/bin/env node
/**
 * Stripe Connect 上の最新サブスク状態を取得し、
 * customers.custom_fields.subscription を強制同期する。
 *
 * Webhook が届かなかった等で incomplete のまま残っている顧客の救済用。
 *
 * 実行例:
 *   node scripts/sync-customer-subscriptions.mjs --email machimogu@example.com --dry-run
 *   node scripts/sync-customer-subscriptions.mjs --email machimogu@example.com
 *   # 特定の customer のみ同期する場合
 *   node scripts/sync-customer-subscriptions.mjs --email machimogu@example.com --customer-id <uuid>
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
const customerIdx = args.indexOf('--customer-id');
const TARGET_CUSTOMER_ID = customerIdx >= 0 ? args[customerIdx + 1] : null;

if (!TARGET_EMAIL) {
  console.error('--email <user@example.com>（テナント管理者の email）を指定してください');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const stripe = new Stripe(STRIPE_KEY);

// ─── 組織と Stripe Connect アカウントを解決 ───
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
  .select('stripe_account_id, settings')
  .eq('id', orgId)
  .single();

const stripeAccount = org?.stripe_account_id;
if (!stripeAccount) {
  console.error('この組織には Stripe Connect アカウントが設定されていません');
  process.exit(1);
}
console.log(`organization_id: ${orgId}`);
console.log(`stripe_account_id: ${stripeAccount}\n`);

// ─── 対象顧客リストを取得 ───
let query = supabase
  .from('customers')
  .select('id, name, email, custom_fields')
  .eq('organization_id', orgId);
if (TARGET_CUSTOMER_ID) query = query.eq('id', TARGET_CUSTOMER_ID);

const { data: customers, error: customersErr } = await query;
if (customersErr) {
  console.error('顧客取得失敗:', customersErr);
  process.exit(1);
}
if (!customers?.length) {
  console.error('対象顧客が見つかりません');
  process.exit(1);
}

console.log(`対象顧客数: ${customers.length}\n`);

let synced = 0;
let skipped = 0;
let notFound = 0;
let failed = 0;

for (const c of customers) {
  const cf = c.custom_fields ?? {};
  const sub = cf.subscription ?? null;
  const stripeCustomerId = sub?.stripeCustomerId ?? null;
  const stripeSubId = sub?.stripeSubscriptionId ?? null;

  // sub が無い場合は Stripe Customer を email で検索
  let resolvedSubId = stripeSubId;
  let resolvedCustomerId = stripeCustomerId;

  if (!resolvedSubId) {
    if (!resolvedCustomerId) {
      // email で Stripe Customer を検索
      try {
        const search = await stripe.customers.list(
          { email: c.email, limit: 1 },
          { stripeAccount }
        );
        resolvedCustomerId = search.data[0]?.id ?? null;
      } catch (err) {
        console.warn(`  [${c.email}] Stripe Customer 検索失敗:`, err.message);
      }
    }
    if (resolvedCustomerId) {
      try {
        const subs = await stripe.subscriptions.list(
          { customer: resolvedCustomerId, status: 'all', limit: 1 },
          { stripeAccount }
        );
        resolvedSubId = subs.data[0]?.id ?? null;
      } catch (err) {
        console.warn(`  [${c.email}] サブスク検索失敗:`, err.message);
      }
    }
  }

  if (!resolvedSubId) {
    console.log(`- ${c.email} : Stripe サブスクが見つかりません（スキップ）`);
    notFound++;
    continue;
  }

  let stripeSub;
  try {
    stripeSub = await stripe.subscriptions.retrieve(resolvedSubId, { stripeAccount });
  } catch (err) {
    console.warn(`  [${c.email}] サブスク取得失敗 (${resolvedSubId}):`, err.message);
    failed++;
    continue;
  }

  const newSub = {
    planId:
      stripeSub.metadata?.akinai_plan_id ??
      sub?.planId ??
      null,
    stripeSubscriptionId: stripeSub.id,
    stripeCustomerId: stripeSub.customer,
    status: stripeSub.status,
    currentPeriodEnd: stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000).toISOString()
      : null,
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end === true,
    startedAt:
      sub?.startedAt ??
      (stripeSub.start_date
        ? new Date(stripeSub.start_date * 1000).toISOString()
        : new Date().toISOString()),
    updatedAt: new Date().toISOString(),
  };

  const beforeStatus = sub?.status ?? '(なし)';
  const afterStatus = newSub.status;
  const noChange =
    sub &&
    sub.status === newSub.status &&
    sub.currentPeriodEnd === newSub.currentPeriodEnd &&
    sub.stripeSubscriptionId === newSub.stripeSubscriptionId;

  if (noChange) {
    console.log(`= ${c.email} : 変更なし (status=${afterStatus})`);
    skipped++;
    continue;
  }

  console.log(
    `+ ${c.email} : status ${beforeStatus} → ${afterStatus}, sub=${newSub.stripeSubscriptionId}`
  );

  if (DRY_RUN) {
    synced++;
    continue;
  }

  const newCustomFields = { ...cf, subscription: newSub };
  const { error: updateErr } = await supabase
    .from('customers')
    .update({
      custom_fields: newCustomFields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', c.id);
  if (updateErr) {
    console.error(`  [${c.email}] DB 更新失敗:`, updateErr.message);
    failed++;
  } else {
    synced++;
  }
}

console.log(
  `\n結果: 同期 ${synced} 件 / 変更なし ${skipped} 件 / Stripe未存在 ${notFound} 件 / 失敗 ${failed} 件`
);
if (DRY_RUN) console.log('\n--dry-run 指定のため DB 更新はスキップされました');

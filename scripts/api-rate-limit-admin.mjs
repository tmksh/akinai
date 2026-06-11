#!/usr/bin/env node
/**
 * API レートリミット管理（サポート対応用）
 *
 * 対象テナントを APIキー（全体 or 末尾）で特定し、以下を実行する:
 *   1. 日次カウンタの即時リセット（api_rate_counters の本日分 day_key を削除）
 *   2. 上限引き上げ（方式を明示フラグで選択）
 *
 * 安全策:
 *   - デフォルトは dry-run（読み取りのみ）。実際の書き込みは --apply 指定時のみ。
 *   - 引き上げ方式は副作用が異なるため、必ず明示的に指定する。
 *
 * 使い方:
 *   # 1) まずは現状確認（読み取りのみ）
 *   node scripts/api-rate-limit-admin.mjs --key=8d4934
 *
 *   # 2) リセットのみ適用
 *   node scripts/api-rate-limit-admin.mjs --key=8d4934 --reset --apply
 *
 *   # 3) リセット + 上限引き上げ（既存プランへ昇格。例: pro = 100000/日, 300/分）
 *   node scripts/api-rate-limit-admin.mjs --key=8d4934 --reset --upgrade-plan=pro --apply
 *
 *   # 4) リセット + 現プランの日次上限を変更（※同一プランの全テナントに影響）
 *   node scripts/api-rate-limit-admin.mjs --key=8d4934 --reset --plan-day-limit=30000 --apply
 *
 * 注意:
 *   - --upgrade-plan は organizations.plan を変更するため、課金/機能フラグ等の
 *     プラン依存ロジックにも影響します。
 *   - --plan-day-limit は rate_limits テーブルを更新するため、同一プランを使う
 *     すべてのテナントに影響します。単一テナントだけに恒久的な余裕を持たせたい
 *     場合は、組織ごとの上限上書き（マイグレーション + RPC 改修）の導入を推奨します。
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// .env.local を読み込む（他スクリプトと同じ方式）
const envText = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ---- 引数パース ----
function getArg(name) {
  const pref = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pref));
  return hit ? hit.slice(pref.length) : undefined;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

const KEY_INPUT = getArg('key');
const DO_RESET = hasFlag('reset');
const UPGRADE_PLAN = getArg('upgrade-plan'); // starter | pro | enterprise | <custom plan name>
const PLAN_DAY_LIMIT = getArg('plan-day-limit'); // 現プランの日次上限を変更
const PLAN_MINUTE_LIMIT = getArg('plan-minute-limit'); // 任意
const APPLY = hasFlag('apply');

if (!KEY_INPUT) {
  console.error('必須: --key=<APIキー全体 または 末尾の16進数（例: 8d4934）>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const mask = (k) => (k ? `${k.slice(0, 12)}…${k.slice(-6)}` : '(未設定)');

// UTC 暦日/分のウィンドウキー（RPC 036 と同一仕様）
const now = new Date();
const utcDay = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD (UTC)
const dayKey = `d:${utcDay}`;

async function findOrganization() {
  const isFullKey = /^sk_(live|test)_[0-9a-f]{48}$/.test(KEY_INPUT);
  const suffixMatch = KEY_INPUT.match(/([0-9a-f]{4,})\s*$/i);
  const suffix = suffixMatch ? suffixMatch[1].toLowerCase() : null;

  let query = supabase
    .from('organizations')
    .select('id, name, slug, plan, is_active, frontend_api_key');

  if (isFullKey) {
    query = query.eq('frontend_api_key', KEY_INPUT);
  } else if (suffix) {
    query = query.ilike('frontend_api_key', `%${suffix}`);
  } else {
    throw new Error(`--key の形式を認識できません: ${KEY_INPUT}`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const matches = (data ?? []).filter((o) => o.frontend_api_key);
  if (matches.length === 0) {
    throw new Error(`該当する組織が見つかりません（key=${KEY_INPUT}）。取り違え/別環境の可能性があります。`);
  }
  if (matches.length > 1) {
    console.error('複数の組織が一致しました。--key にもう少し長い末尾を指定してください:');
    for (const o of matches) {
      console.error(`  - ${o.name} (${o.slug}) id=${o.id} plan=${o.plan} active=${o.is_active} key=${mask(o.frontend_api_key)}`);
    }
    throw new Error('一意に特定できませんでした。');
  }
  return matches[0];
}

async function getPlanLimits(plan) {
  const { data, error } = await supabase
    .from('rate_limits')
    .select('plan, requests_per_minute, requests_per_day')
    .eq('plan', plan)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getDayCounter(orgId) {
  const { data, error } = await supabase
    .from('api_rate_counters')
    .select('organization_id, window_key, count, updated_at')
    .eq('organization_id', orgId)
    .eq('window_key', dayKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function main() {
  console.log('================ API レートリミット管理 ================');
  console.log(`モード      : ${APPLY ? 'APPLY (書き込み実行)' : 'DRY-RUN (読み取りのみ)'}`);
  console.log(`UTC day key : ${dayKey}  (現在UTC: ${now.toISOString()})`);
  console.log(`key入力     : ${KEY_INPUT}`);
  console.log('');

  const org = await findOrganization();
  const limits = await getPlanLimits(org.plan);
  const counter = await getDayCounter(org.id);

  console.log('--- 対象テナント ---');
  console.log(`  name      : ${org.name} (${org.slug})`);
  console.log(`  org_id    : ${org.id}`);
  console.log(`  is_active : ${org.is_active}`);
  console.log(`  api_key   : ${mask(org.frontend_api_key)}`);
  console.log(`  plan      : ${org.plan}`);
  console.log('');
  console.log('--- 現在のプラン上限 (rate_limits) ---');
  if (limits) {
    console.log(`  ${limits.plan}: ${limits.requests_per_minute}/分, ${limits.requests_per_day}/日`);
  } else {
    console.log(`  (plan="${org.plan}" の rate_limits 行なし → RPC は starter にフォールバック)`);
  }
  console.log('');
  console.log('--- 本日(UTC)の日次カウンタ ---');
  if (counter) {
    const dayLimit = limits?.requests_per_day ?? 10000;
    console.log(`  count=${counter.count} / limit=${dayLimit} (remaining=${Math.max(0, dayLimit - counter.count)})  updated_at=${counter.updated_at}`);
  } else {
    console.log('  本日分のカウンタ行はありません（消費なし or すでにリセット済み）。');
  }
  console.log('');

  // ---- 計画する操作 ----
  const actions = [];
  if (DO_RESET) actions.push(`日次カウンタ削除: api_rate_counters WHERE org=${org.id} AND window_key='${dayKey}'`);
  if (UPGRADE_PLAN) actions.push(`プラン変更: organizations.plan "${org.plan}" → "${UPGRADE_PLAN}"`);
  if (PLAN_DAY_LIMIT || PLAN_MINUTE_LIMIT) {
    actions.push(
      `プラン上限変更(rate_limits "${org.plan}"): ` +
      `${PLAN_MINUTE_LIMIT ? `${PLAN_MINUTE_LIMIT}/分 ` : ''}` +
      `${PLAN_DAY_LIMIT ? `${PLAN_DAY_LIMIT}/日` : ''}  ※同プラン全テナントに影響`,
    );
  }

  if (actions.length === 0) {
    console.log('実行する操作が指定されていません（--reset / --upgrade-plan / --plan-day-limit）。現状確認のみ。');
    return;
  }

  console.log('--- 実行予定の操作 ---');
  actions.forEach((a) => console.log(`  • ${a}`));
  console.log('');

  if (UPGRADE_PLAN) {
    const target = await getPlanLimits(UPGRADE_PLAN);
    if (!target) {
      throw new Error(`--upgrade-plan="${UPGRADE_PLAN}" は rate_limits に存在しません。先にプラン行を用意してください。`);
    }
    console.log(`  昇格後の上限: ${target.requests_per_minute}/分, ${target.requests_per_day}/日`);
    console.log('');
  }

  if (!APPLY) {
    console.log('[DRY-RUN] 変更は行っていません。実行するには --apply を付けてください。');
    return;
  }

  // ---- 書き込み実行 ----
  if (DO_RESET) {
    const { error } = await supabase
      .from('api_rate_counters')
      .delete()
      .eq('organization_id', org.id)
      .eq('window_key', dayKey);
    if (error) throw error;
    console.log('  ✅ 日次カウンタをリセットしました。');
  }

  if (UPGRADE_PLAN) {
    const { error } = await supabase
      .from('organizations')
      .update({ plan: UPGRADE_PLAN, updated_at: new Date().toISOString() })
      .eq('id', org.id);
    if (error) throw error;
    console.log(`  ✅ プランを "${UPGRADE_PLAN}" に変更しました。`);
  }

  if (PLAN_DAY_LIMIT || PLAN_MINUTE_LIMIT) {
    const patch = { plan: org.plan };
    if (PLAN_DAY_LIMIT) patch.requests_per_day = Number(PLAN_DAY_LIMIT);
    if (PLAN_MINUTE_LIMIT) patch.requests_per_minute = Number(PLAN_MINUTE_LIMIT);
    const { error } = await supabase
      .from('rate_limits')
      .update(patch)
      .eq('plan', org.plan);
    if (error) throw error;
    console.log(`  ✅ rate_limits("${org.plan}") を更新しました。`);
  }

  console.log('');
  console.log('適用後、対象キーで再リクエストすると新しいヘッダー値が返ります。');
}

main().catch((err) => {
  console.error('\n❌ ERROR:', err.message || err);
  process.exit(1);
});

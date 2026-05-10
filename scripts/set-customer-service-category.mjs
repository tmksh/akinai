#!/usr/bin/env node
/**
 * 指定テナントの customer_one_time_services の category を一括設定する。
 *
 * 値: '商品の魅力を形にする' | '情報を発信する' | '販路を開く' | 'ビジネスの土台をサポート' | null（指定なし）
 *
 * 実行例:
 *   node scripts/set-customer-service-category.mjs --email machimogu@example.com --dry-run
 *   node scripts/set-customer-service-category.mjs --email machimogu@example.com
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

const VALID_CATEGORIES = [
  '商品の魅力を形にする',
  '情報を発信する',
  '販路を開く',
  'ビジネスの土台をサポート',
];

/**
 * サービス名（DB上の正確な name と完全一致）→ category
 * 注: 「まちもぐ商品ページ文章最適化」はDB上は末尾「代行」付き
 */
const CATEGORIES = {
  // 情報を発信する
  'まちもぐ特集記事掲載': '情報を発信する',
  'プレスリリース作成代行': '情報を発信する',
  'まちもぐメルマガ原稿制作代行': '情報を発信する',
  'まちもぐ商品ページ文章最適化代行': '情報を発信する',
  'キャッチコピー開発': '情報を発信する',
  // 商品の魅力を形にする
  'ロゴ制作': '商品の魅力を形にする',
  'パッケージデザイン制作': '商品の魅力を形にする',
  '商品写真撮影代行': '商品の魅力を形にする',
  '名刺デザイン': '商品の魅力を形にする',
  // 販路を開く
  'LP作成代行': '販路を開く',
  '展示会出展資料制作': '販路を開く',
  '商談代行・バイヤー営業セッティング': '販路を開く',
  'バイヤー向けピッチシート作成': '販路を開く',
  'ECサイト作成': '販路を開く',
  // ビジネスの土台をサポート
  '補助金申請書作成代行': 'ビジネスの土台をサポート',
  '事業計画書・資金調達資料作成': 'ビジネスの土台をサポート',
  '競合商品・市場調査レポート': 'ビジネスの土台をサポート',
  '食品表示作成代行': 'ビジネスの土台をサポート',
  '在庫管理ツール': 'ビジネスの土台をサポート',
};

for (const [name, cat] of Object.entries(CATEGORIES)) {
  if (!VALID_CATEGORIES.includes(cat)) {
    console.error(`不正なカテゴリ: ${name} → ${cat}`);
    process.exit(1);
  }
}

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
const targetNames = Object.keys(CATEGORIES);
const changes = [];
const notFound = [];
const untouched = [];

const updated = services.map((svc) => {
  if (!(svc.name in CATEGORIES)) {
    untouched.push(svc.name);
    return svc;
  }
  const next = CATEGORIES[svc.name];
  const before = svc.category ?? null;
  if (before === next) {
    changes.push({ name: svc.name, before, after: next, skipped: true });
    return svc;
  }
  changes.push({ name: svc.name, before, after: next, skipped: false });
  return { ...svc, category: next, updatedAt: now };
});

for (const name of targetNames) {
  if (!services.find((s) => s.name === name)) notFound.push(name);
}

console.log(`organization_id: ${orgId}`);
console.log(
  `指定 ${targetNames.length} 件 / 該当 ${changes.length} 件 / 未存在 ${notFound.length} 件 / 対象外 ${untouched.length} 件\n`
);

let updateCount = 0;
for (const c of changes) {
  if (c.skipped) {
    console.log(`= ${c.name} (変更なし: ${c.before})`);
  } else {
    updateCount++;
    console.log(`+ ${c.name}: ${c.before ?? '(なし)'} → ${c.after}`);
  }
}

if (notFound.length > 0) {
  console.log('\n未存在 (該当サービスがありません):');
  for (const n of notFound) console.log(`  - ${n}`);
}

if (untouched.length > 0) {
  console.log('\n対象外 (今回の指定リストに含まれない既存サービス):');
  for (const n of untouched) console.log(`  - ${n}`);
}

console.log(`\n変更予定: ${updateCount} 件`);

if (DRY_RUN) {
  console.log('\n--dry-run 指定のため実際の更新はスキップ');
  process.exit(0);
}

if (updateCount === 0) {
  console.log('変更が必要な項目はありません。終了します。');
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

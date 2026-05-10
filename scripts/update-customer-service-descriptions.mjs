#!/usr/bin/env node
/**
 * 指定テナントの customer_one_time_services の description を一括更新する。
 *
 * NOTE: Stripe Connected Account 上の Product の description は同時に更新しない。
 *       管理画面・公開APIのレスポンスで使う description は DB 側を参照しているため、
 *       表示・配信用としては DB 更新のみで十分。Stripe Dashboard 側の表記が
 *       気になる場合は管理画面から個別保存し直してください（PATCH 経由で同期されます）。
 *
 * 実行例:
 *   node scripts/update-customer-service-descriptions.mjs --email machimogu@example.com --dry-run
 *   node scripts/update-customer-service-descriptions.mjs --email machimogu@example.com
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

/** サービス名（完全一致）→ 新しい description */
const DESCRIPTIONS = {
  'まちもぐ特集記事掲載':
    '商品の魅力を深掘りし、読み手の心を動かすストーリー記事を作成します。',
  'プレスリリース作成代行':
    'メディアに取り上げてもらうための戦略的なリリース原稿を、構成設計から仕上げまで作成します。',
  'まちもぐメルマガ原稿制作代行':
    '開封率を高める件名と、クリックを誘発する魅力的な本文を1本から制作します。',
  // DB上は末尾に「代行」が付いている
  'まちもぐ商品ページ文章最適化代行':
    'ECサイトなどの成約率を向上させるため、訴求力の高いライティングへリライトします。',
  'キャッチコピー開発':
    'ブランドの核を伝え、記憶に残る強力なコピーを複数の切り口で提案します。',
  'ロゴ制作':
    'ブランドアイデンティティを象徴する、長く愛されるロゴマークを制作します。',
  'パッケージデザイン制作':
    '店頭で目を引き、商品の価値を正しく伝えるパッケージをご提案します。',
  '商品写真撮影代行':
    'カタログやECで使える、商品の魅力を引き出す高品質な写真を撮影します。',
  '名刺デザイン':
    '第一印象を決める名刺を、ブランドイメージに合わせてデザインします。',
  'LP作成代行':
    '広告運用に特化した、コンバージョン重視のランディングページを制作します。',
  '補助金申請書作成代行':
    '申請要件の整理から書類作成まで、採択率を高める補助金申請書を丁寧に作成します。',
  '事業計画書・資金調達資料作成':
    '融資・補助金・投資家向けの説得力ある事業計画書・資金調達資料を作成します。',
  '競合商品・市場調査レポート':
    '競合商品・価格帯・販売チャネル・市場トレンドを調査し、自社ポジションと次の打ち手を明確にします。',
  '食品表示作成代行':
    '食品表示法に準拠した正確なラベル表示を作成し、安心して販売できる体制を整えます。',
  '展示会出展資料制作':
    '来場者の目を引くパネル・配布資料を一式まとめて制作します。',
  '商談代行・バイヤー営業セッティング':
    'バイヤーとの商談機会を創出し、成約につながる営業活動を代行します。',
  'バイヤー向けピッチシート作成':
    '商品の強みを一枚で伝える、商談で使えるバイヤー向け営業資料を制作します。',
  'ECサイト作成':
    '自社ECサイトをゼロから構築し、すぐに販売を始められる環境を整えます。',
  '在庫管理ツール':
    '食品販売に特化した在庫管理ツールをダウンロード提供します。商品別・日付別の在庫管理と発注管理が簡単に行えます。',
};

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
const targetNames = Object.keys(DESCRIPTIONS);
const changes = [];
const notFound = [];

const updated = services.map((svc) => {
  if (!(svc.name in DESCRIPTIONS)) return svc;
  const next = DESCRIPTIONS[svc.name];
  if (svc.description === next) {
    changes.push({ name: svc.name, skipped: true, before: svc.description });
    return svc;
  }
  changes.push({ name: svc.name, skipped: false, before: svc.description, after: next });
  return { ...svc, description: next, updatedAt: now };
});

for (const name of targetNames) {
  if (!services.find((s) => s.name === name)) notFound.push(name);
}

console.log(`organization_id: ${orgId}`);
console.log(`対象 ${targetNames.length} 件 / 該当 ${changes.length} 件 / 未存在 ${notFound.length} 件\n`);

let updateCount = 0;
for (const c of changes) {
  if (c.skipped) {
    console.log(`= ${c.name} (変更なし)`);
  } else {
    updateCount++;
    console.log(`+ ${c.name}`);
    const before = (c.before ?? '').slice(0, 60);
    const after = c.after.slice(0, 60);
    console.log(`    before: "${before}${(c.before ?? '').length > 60 ? '…' : ''}"`);
    console.log(`    after : "${after}${c.after.length > 60 ? '…' : ''}"`);
  }
}

if (notFound.length > 0) {
  console.log('\n未存在 (該当サービスがありません):');
  for (const n of notFound) console.log(`  - ${n}`);
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

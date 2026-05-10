#!/usr/bin/env node
/**
 * 指定テナントの customer_one_time_services の googleFormUrl / buyerGoogleFormUrl を一括設定する。
 *
 * 実行例:
 *   node scripts/set-customer-service-form-urls.mjs --email machimogu@example.com --dry-run
 *   node scripts/set-customer-service-form-urls.mjs --email machimogu@example.com
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
 * サービス名（DB上の正確な name と完全一致） →
 *   { googleFormUrl?: string, buyerGoogleFormUrl?: string }
 *
 * 注: 「まちもぐ商品ページ文章最適化」はDB上は末尾「代行」付き
 *     buyerGoogleFormUrl が指定されていないサービスは、その項目はクリアされる
 */
const FORM_URLS = {
  'まちもぐ特集記事掲載': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSd5etYHhw1lsmgq51w20cZrK-KeMJ6fVKICHvdZko-fZJBx9g/viewform',
  },
  'プレスリリース作成代行': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSdBjQaEimPLL_sWw3DSOAb-ti0DPNXy4Mup95TGWNIJo35kyg/viewform',
    buyerGoogleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSc3v_rlQB-lemPQv65nxQsc3wbEuLHal1NG6UQ2JPIiRrlU7w/viewform',
  },
  'まちもぐメルマガ原稿制作代行': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSe3OuBR9GGvdYm4v_vV_IWXvtRoy6rsxWzxfHggwKzXgHquTg/viewform',
  },
  'まちもぐ商品ページ文章最適化代行': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSf4yjTFJ9uCEiFipX7B8ZnMB78XqsEPYGIkrsJ-WKOlaZPd5g/viewform',
  },
  'キャッチコピー開発': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSe8mU9RlUG11YIbM4xzIlHuDk2YgeiGDaAyzKcqqvjpXbueaA/viewform',
    buyerGoogleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSccHhSoMm3N7bM7vnaMn0qnd12UVORzKlDFPyY-ASy5rqFWLA/viewform',
  },
  'ロゴ制作': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSeAtAJzUVoynJxOeLJGRLyM8VA3Ywpn3ihNtGsbWRxT1ru4FA/viewform',
    buyerGoogleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSeW61ZAb3fEG54vpgCNixUWfR-Vs_E50-OLQU_vaZ9Unumu_g/viewform',
  },
  'パッケージデザイン制作': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSeiCH5yDbfGiKEZXzNQfEt6y6ZXXrFd6Pn58erw9X0Yyg_dmg/viewform',
  },
  '商品写真撮影代行': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLScwQcDYkxqkvSdW5Dg83j-LTwKFLJ7gDmCMS-RQSRWXoxiVZQ/viewform',
  },
  '名刺デザイン': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSe0sMIfb5zJ-YNPiVjJg3abD9ryxwCZqytOAY2Wfc5q-619GA/viewform',
    buyerGoogleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLScNQysc6JFTva_sGYTFb8ApfFOQRtP6ZSJrMEJGItQORia-nQ/viewform',
  },
  'LP作成代行': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLScbHaFaP_waFoYLuKvcQ89NjeFo5ifYeOzQdVS8N6E_8As9lQ/viewform',
    buyerGoogleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSeX3kgMw3z3hnWMAY4RGaCMO-GnhKEPvIFHjpGxBYDm4HBXoA/viewform',
  },
  '展示会出展資料制作': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSeFOa3QVNZeoTpXeZktUk5l35mXQNJEj6A95eYuKW17rnqG8w/viewform',
  },
  '商談代行・バイヤー営業セッティング': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSe6piTHVLe7MMiEkRDrUQjrwwdhpWeY-f0aOs5MWcsjRFT2CA/viewform',
  },
  'バイヤー向けピッチシート作成': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSfxYIT5Tz23GbbD8rHYHmBOJnVs08gyApXQoRpHfzXiAdpiHw/viewform',
  },
  '補助金申請書作成代行': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSeDlH0jn_5sQ3lkhjfbfc5J_swUWl87OioFDdrEhMeEpT8qnQ/viewform',
    buyerGoogleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSehKznQR7ukfIidnnr6ltolTwYZVqJm7Vuo6UW6E5ykY1sbjg/viewform',
  },
  '事業計画書・資金調達資料作成': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLScplBbJQd28vPoJurHUsci6f5wg2Dx-O504k9XQWodZzfPNVA/viewform',
    buyerGoogleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSeRwd6pg77huam_f5wxZtI3BJgu7OxBN-NN4a--6KBt0KRP6w/viewform',
  },
  '競合商品・市場調査レポート': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSftJg0x_bMUoCzmLb6l2iXsdBn-YUiPumSE6nBayXDRvQMQPg/viewform',
  },
  '食品表示作成代行': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSdqA0esloHUmNNEP5tqkoKpofNkSaaOXvlpNNwQr9qKzgfK8g/viewform',
  },
  'ECサイト作成': {
    googleFormUrl:
      'https://docs.google.com/forms/d/e/1FAIpQLSdE8l6cSBqOcKc5PeHLZvUFeEP-fsOF4p7ZSM3pLC4jvWHSww/viewform',
  },
  '在庫管理ツール': {
    googleFormUrl:
      'https://drive.google.com/file/d/1AFpxt2ncUEGGdq9gMZjmU5QjjAvt7hT_/view?usp=drive_link',
    buyerGoogleFormUrl:
      'https://drive.google.com/file/d/1AFpxt2ncUEGGdq9gMZjmU5QjjAvt7hT_/view?usp=drive_link',
  },
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
const targetNames = Object.keys(FORM_URLS);
const changes = [];
const notFound = [];
const untouched = [];

const updated = services.map((svc) => {
  if (!(svc.name in FORM_URLS)) {
    untouched.push(svc.name);
    return svc;
  }
  const cfg = FORM_URLS[svc.name];
  const beforeSupplier = svc.googleFormUrl ?? null;
  const beforeBuyer = svc.buyerGoogleFormUrl ?? null;
  const afterSupplier = cfg.googleFormUrl ?? null;
  const afterBuyer = cfg.buyerGoogleFormUrl ?? null;

  const supplierChanged = beforeSupplier !== afterSupplier;
  const buyerChanged = beforeBuyer !== afterBuyer;
  const skipped = !supplierChanged && !buyerChanged;

  changes.push({
    name: svc.name,
    supplier: { before: beforeSupplier, after: afterSupplier, changed: supplierChanged },
    buyer: { before: beforeBuyer, after: afterBuyer, changed: buyerChanged },
    skipped,
  });

  if (skipped) return svc;

  const next = { ...svc, updatedAt: now };
  if (afterSupplier) next.googleFormUrl = afterSupplier;
  else delete next.googleFormUrl;
  if (afterBuyer) next.buyerGoogleFormUrl = afterBuyer;
  else delete next.buyerGoogleFormUrl;
  return next;
});

for (const name of targetNames) {
  if (!services.find((s) => s.name === name)) notFound.push(name);
}

console.log(`organization_id: ${orgId}`);
console.log(
  `指定 ${targetNames.length} 件 / 該当 ${changes.length} 件 / 未存在 ${notFound.length} 件 / 対象外 ${untouched.length} 件\n`
);

let updateCount = 0;
function trunc(u) {
  if (!u) return '(なし)';
  return u.length > 70 ? u.slice(0, 67) + '...' : u;
}
for (const c of changes) {
  if (c.skipped) {
    console.log(`= ${c.name} (変更なし)`);
    continue;
  }
  updateCount++;
  console.log(`+ ${c.name}`);
  if (c.supplier.changed) {
    console.log(`    supplier: ${trunc(c.supplier.before)}`);
    console.log(`         →    ${trunc(c.supplier.after)}`);
  }
  if (c.buyer.changed) {
    console.log(`    buyer:    ${trunc(c.buyer.before)}`);
    console.log(`         →    ${trunc(c.buyer.after)}`);
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

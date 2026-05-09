#!/usr/bin/env node
/**
 * stock=0 の product_variants を一律 stock=1 に更新する。
 *
 * 既定では --email で指定したテナント所属の商品のみを対象にする。
 * --all を付けると全テナント対象。
 *
 * 実行例:
 *   node scripts/set-zero-stock-to-one.mjs --email machimogu@example.com --dry-run
 *   node scripts/set-zero-stock-to-one.mjs --email machimogu@example.com
 *   node scripts/set-zero-stock-to-one.mjs --all --dry-run
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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ALL = args.includes('--all');
const emailIdx = args.indexOf('--email');
const TARGET_EMAIL = emailIdx >= 0 ? args[emailIdx + 1] : null;

if (!ALL && !TARGET_EMAIL) {
  console.error('テナント未指定。--email <user@example.com> または --all を付けてください');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let organizationIds = null;
  if (!ALL) {
    console.log(`対象テナント: ${TARGET_EMAIL}`);
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', TARGET_EMAIL);
    if (userError) {
      console.error('ユーザー取得エラー:', userError);
      process.exit(1);
    }
    if (!users || users.length === 0) {
      console.error(`ユーザーが見つかりません: ${TARGET_EMAIL}`);
      process.exit(1);
    }
    const userIds = users.map((u) => u.id);
    const { data: members, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .in('user_id', userIds);
    if (memberError) {
      console.error('organization_members 取得エラー:', memberError);
      process.exit(1);
    }
    organizationIds = Array.from(new Set((members ?? []).map((m) => m.organization_id).filter(Boolean)));
    if (organizationIds.length === 0) {
      console.error('該当ユーザーのorganization_idが空です');
      process.exit(1);
    }
    console.log(`organization_ids: ${organizationIds.join(', ')}`);
  } else {
    console.log('対象: 全テナント');
  }

  // 対象organizationの商品IDを取得
  let productIds;
  if (organizationIds) {
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id')
      .in('organization_id', organizationIds);
    if (prodError) {
      console.error('商品取得エラー:', prodError);
      process.exit(1);
    }
    productIds = (products ?? []).map((p) => p.id);
    console.log(`対象商品数: ${productIds.length}`);
    if (productIds.length === 0) {
      console.log('対象商品がありません');
      return;
    }
  }

  // stock=0 のバリエーションを取得
  let variantQuery = supabase
    .from('product_variants')
    .select('id, product_id, name, sku, stock')
    .eq('stock', 0);
  if (productIds) {
    variantQuery = variantQuery.in('product_id', productIds);
  }
  const { data: variants, error: variantError } = await variantQuery;
  if (variantError) {
    console.error('バリエーション取得エラー:', variantError);
    process.exit(1);
  }

  console.log(`stock=0 のバリエーション: ${variants?.length ?? 0} 件`);
  if (!variants || variants.length === 0) {
    console.log('対象なし。終了します。');
    return;
  }

  for (const v of variants.slice(0, 5)) {
    console.log(`  ${v.sku} (${v.name}) stock: 0 → 1`);
  }
  if (variants.length > 5) {
    console.log(`  ... 他 ${variants.length - 5} 件`);
  }

  if (DRY_RUN) {
    console.log('\n--dry-run 指定のため実際の更新はスキップ');
    return;
  }

  let success = 0;
  let failed = 0;
  const CONCURRENCY = 30;
  for (let i = 0; i < variants.length; i += CONCURRENCY) {
    const batch = variants.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map((v) =>
        supabase
          .from('product_variants')
          .update({ stock: 1 })
          .eq('id', v.id)
          .then(({ error }) => {
            if (error) {
              console.error(`更新失敗 id=${v.id}:`, error.message);
              failed++;
            } else {
              success++;
            }
          })
      )
    );
    process.stdout.write(`\r進捗: ${Math.min(i + CONCURRENCY, variants.length)}/${variants.length}`);
  }
  console.log('');
  console.log(`完了: 成功 ${success} / 失敗 ${failed}`);
}

main().catch((err) => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});

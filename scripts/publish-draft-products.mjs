#!/usr/bin/env node
/**
 * status='draft' の商品を 'published' に一括更新する。
 * published_at も現在時刻で設定。
 *
 * 実行例:
 *   node scripts/publish-draft-products.mjs --email machimogu@example.com --dry-run
 *   node scripts/publish-draft-products.mjs --email machimogu@example.com
 *   node scripts/publish-draft-products.mjs --all
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
    if (userError || !users?.length) {
      console.error('ユーザー取得失敗:', userError ?? 'not found');
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

  let query = supabase
    .from('products')
    .select('id, name, status, organization_id')
    .eq('status', 'draft');
  if (organizationIds) {
    query = query.in('organization_id', organizationIds);
  }
  const { data: drafts, error: draftError } = await query;
  if (draftError) {
    console.error('商品取得エラー:', draftError);
    process.exit(1);
  }

  console.log(`下書き商品: ${drafts?.length ?? 0} 件`);
  if (!drafts || drafts.length === 0) {
    console.log('対象なし。終了します。');
    return;
  }

  for (const p of drafts.slice(0, 5)) {
    console.log(`  ${p.name} (id=${p.id}) draft → published`);
  }
  if (drafts.length > 5) {
    console.log(`  ... 他 ${drafts.length - 5} 件`);
  }

  if (DRY_RUN) {
    console.log('\n--dry-run 指定のため実際の更新はスキップ');
    return;
  }

  const now = new Date().toISOString();
  let success = 0;
  let failed = 0;
  const CONCURRENCY = 30;
  for (let i = 0; i < drafts.length; i += CONCURRENCY) {
    const batch = drafts.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map((p) =>
        supabase
          .from('products')
          .update({ status: 'published', published_at: now })
          .eq('id', p.id)
          .then(({ error }) => {
            if (error) {
              console.error(`更新失敗 id=${p.id}:`, error.message);
              failed++;
            } else {
              success++;
            }
          })
      )
    );
    process.stdout.write(`\r進捗: ${Math.min(i + CONCURRENCY, drafts.length)}/${drafts.length}`);
  }
  console.log('');
  console.log(`完了: 成功 ${success} / 失敗 ${failed}`);
}

main().catch((err) => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});

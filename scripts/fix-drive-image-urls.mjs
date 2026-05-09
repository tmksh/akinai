#!/usr/bin/env node
/**
 * 既存の product_images.url から Google Drive 共有URLを
 * lh3.googleusercontent.com の直接画像URLに変換する。
 *
 * 例:
 *   https://drive.google.com/file/d/{ID}/view?usp=drive_link
 *     → https://lh3.googleusercontent.com/d/{ID}=w1600
 *   https://drive.google.com/thumbnail?id={ID}&sz=w1600
 *     → https://lh3.googleusercontent.com/d/{ID}=w1600
 *
 * 実行:
 *   node scripts/fix-drive-image-urls.mjs            # 全テナント対象
 *   node scripts/fix-drive-image-urls.mjs --dry-run  # プレビューのみ
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// .env.local を雑にロード
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

const DRY_RUN = process.argv.includes('--dry-run');

/** Drive 共有URL → lh3.googleusercontent.com の直接URL */
function normalize(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) {
    return url;
  }
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    return `https://lh3.googleusercontent.com/d/${fileMatch[1]}=w1600`;
  }
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return `https://lh3.googleusercontent.com/d/${idMatch[1]}=w1600`;
  }
  return url;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log(`[${DRY_RUN ? 'DRY-RUN' : 'EXECUTE'}] product_images の Drive URL を変換します`);

  const { data: images, error } = await supabase
    .from('product_images')
    .select('id, url, product_id');

  if (error) {
    console.error('product_images 取得エラー:', error);
    process.exit(1);
  }

  if (!images || images.length === 0) {
    console.log('画像がありません');
    return;
  }

  console.log(`総画像数: ${images.length}`);

  const targets = [];
  for (const img of images) {
    const next = normalize(img.url);
    if (next !== img.url) {
      targets.push({ id: img.id, before: img.url, after: next });
    }
  }

  console.log(`変換対象: ${targets.length} 件`);
  if (targets.length === 0) {
    console.log('変換対象なし。終了します。');
    return;
  }

  for (const t of targets.slice(0, 5)) {
    console.log(`  ${t.before}\n   → ${t.after}`);
  }
  if (targets.length > 5) {
    console.log(`  ... 他 ${targets.length - 5} 件`);
  }

  if (DRY_RUN) {
    console.log('\n--dry-run 指定のため実際の更新はスキップ');
    return;
  }

  let success = 0;
  let failed = 0;
  // 100件ずつ並列で更新
  const CONCURRENCY = 20;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((t) =>
        supabase
          .from('product_images')
          .update({ url: t.after })
          .eq('id', t.id)
          .then(({ error }) => {
            if (error) {
              console.error(`更新失敗 id=${t.id}:`, error.message);
              failed++;
            } else {
              success++;
            }
          })
      )
    );
    void results;
    process.stdout.write(`\r進捗: ${Math.min(i + CONCURRENCY, targets.length)}/${targets.length}`);
  }
  console.log('');
  console.log(`完了: 成功 ${success} / 失敗 ${failed}`);
}

main().catch((err) => {
  console.error('予期しないエラー:', err);
  process.exit(1);
});

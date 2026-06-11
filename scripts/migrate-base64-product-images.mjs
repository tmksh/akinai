#!/usr/bin/env node
/**
 * product_images.url に保存された base64 データURI を
 * Supabase Storage（products バケット）の公開 URL に移行する。
 *
 * 実行:
 *   node scripts/migrate-base64-product-images.mjs --dry-run
 *   node scripts/migrate-base64-product-images.mjs --apply
 *   node scripts/migrate-base64-product-images.mjs --apply --org=machimoguのショップ-mnwi7hlu
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const ORG_SLUG = (() => {
  const hit = process.argv.find((a) => a.startsWith('--org='));
  return hit ? hit.slice('--org='.length) : null;
})();

const MAIN_MAX = 1200;
const THUMB_MAX = 400;

function randomName() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseDataUri(dataUri) {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function processAndUpload(supabase, input, folder) {
  const meta = await sharp(input, { failOn: 'none' }).metadata();
  const animated = (meta.pages ?? 1) > 1;

  const encode = (max, quality) =>
    sharp(input, { failOn: 'none', animated })
      .rotate()
      .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

  const [mainBuf, thumbBuf] = await Promise.all([
    encode(MAIN_MAX, 80),
    encode(THUMB_MAX, 70),
  ]);

  const base = `${folder}/${randomName()}`;
  const mainPath = `${base}.webp`;
  const thumbPath = `${base}-thumb.webp`;

  const upload = (path, buf) =>
    supabase.storage.from('products').upload(path, buf, {
      cacheControl: '31536000',
      upsert: false,
      contentType: 'image/webp',
    });

  const [mainRes, thumbRes] = await Promise.all([
    upload(mainPath, mainBuf),
    upload(thumbPath, thumbBuf),
  ]);

  if (mainRes.error) throw mainRes.error;

  const { data: mainPublic } = supabase.storage.from('products').getPublicUrl(mainRes.data.path);
  const thumbPublicUrl = thumbRes.error
    ? mainPublic.publicUrl
    : supabase.storage.from('products').getPublicUrl(thumbRes.data.path).data.publicUrl;

  return { url: mainPublic.publicUrl, thumbnailUrl: thumbPublicUrl };
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`[migrate-base64-product-images] mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  let orgId = null;
  if (ORG_SLUG) {
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', ORG_SLUG)
      .single();
    if (error || !org) throw new Error(`Organization not found: ${ORG_SLUG}`);
    orgId = org.id;
    console.log(`対象テナント: ${org.name} (${org.slug})`);
  }

  let query = supabase
    .from('product_images')
    .select('id, url, thumbnail_url, alt, sort_order, product_id, products!inner(id, name, organization_id)')
    .ilike('url', 'data:image%');

  if (orgId) {
    query = query.eq('products.organization_id', orgId);
  }

  const { data: images, error } = await query;
  if (error) throw error;

  if (!images || images.length === 0) {
    console.log('base64 画像は見つかりませんでした。');
    return;
  }

  console.log(`対象: ${images.length} 件`);

  for (const img of images) {
    const product = img.products;
    console.log(`\n- image ${img.id}`);
    console.log(`  product: ${product?.name} (${img.product_id})`);
    console.log(`  current url length: ${img.url.length} chars`);

    const parsed = parseDataUri(img.url);
    if (!parsed) {
      console.log('  ⚠️  data URI の解析に失敗。スキップ');
      continue;
    }

    if (!APPLY) {
      console.log(`  [DRY-RUN] ${parsed.mime}, ${parsed.buffer.length} bytes → Storage にアップロード予定`);
      continue;
    }

    try {
      const processed = await processAndUpload(supabase, parsed.buffer, img.product_id);
      const { error: updateErr } = await supabase
        .from('product_images')
        .update({
          url: processed.url,
          thumbnail_url: processed.thumbnailUrl,
        })
        .eq('id', img.id);

      if (updateErr) throw updateErr;
      console.log(`  ✅ ${processed.url}`);
    } catch (e) {
      console.error(`  ❌ 失敗:`, e.message || e);
    }
  }

  if (!APPLY) {
    console.log('\n[DRY-RUN] 変更なし。実行するには --apply を付けてください。');
  }
}

main().catch((err) => {
  console.error('\n❌ ERROR:', err);
  process.exit(1);
});

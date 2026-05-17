#!/usr/bin/env node
// 市区町村マスタ（type=masta）を Akinai に一括登録するスクリプト。
//
// 使い方:
//   node scripts/import-municipalities-masta.mjs
//
// データソース: https://machimogu.jp/data/municipalities.json（1741件）
// slug: m-city-{都道府県}-{市町村}
// title: 🏘️ {都道府県} {市町村}
// status: published
// type: masta

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// .env.local を簡易読み込み
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE 環境変数が見つかりません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// municipalities.json を読み込む（アップロード済みファイルまたはネットワーク取得）
async function loadMunicipalities() {
  const uploadedPath = path.join(
    process.env.HOME || '',
    '.cursor/projects/Users-fujiwarajukito-Documents-GitHub-akinai/uploads/municipalities-0.json'
  );

  if (fs.existsSync(uploadedPath)) {
    console.log('📂 アップロード済みファイルから読み込み中...');
    const raw = fs.readFileSync(uploadedPath, 'utf-8');
    // ファイル先頭の "Source URL: ..." と "Title: ..." メタ行を除去
    const jsonStr = raw.replace(/^Source URL:.*\nTitle:.*\n\n/, '');
    return JSON.parse(jsonStr);
  }

  // フォールバック: ネットワーク取得
  console.log('🌐 municipalities.json をネットワークから取得中...');
  const res = await fetch('https://machimogu.jp/data/municipalities.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  // 1. データ読み込み
  const municipalities = await loadMunicipalities();
  console.log(`✅ 読み込み完了: ${municipalities.length}件`);

  // 2. machimogu 組織を特定
  const { data: orgs, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, slug, settings')
    .or('name.ilike.%まちもぐ%,name.ilike.%machimogu%,slug.ilike.%machimogu%');

  if (orgErr || !orgs?.length) {
    console.error('❌ まちもぐ組織が見つかりません:', orgErr?.message);
    process.exit(1);
  }

  const org = orgs[0];
  console.log(`🏢 組織: ${org.name} (${org.slug})  id=${org.id}`);

  // 3. masta タイプが enabled_content_types に含まれているか確認
  const settings = (org.settings || {});
  const enabledTypes = (settings.enabled_content_types || []);
  if (enabledTypes.length > 0 && !enabledTypes.includes('masta')) {
    console.warn('⚠️  "masta" が enabled_content_types に含まれていません。設定を更新します...');
    const customTypes = (settings.custom_content_types || []);
    const hasMasta = customTypes.some(t => t.key === 'masta');
    const newCustomTypes = hasMasta
      ? customTypes
      : [...customTypes, { key: 'masta', label: '市区町村マスタ' }];
    const newEnabledTypes = [...enabledTypes, 'masta'];
    const { error: settingsErr } = await supabase
      .from('organizations')
      .update({
        settings: {
          ...settings,
          custom_content_types: newCustomTypes,
          enabled_content_types: newEnabledTypes,
        },
      })
      .eq('id', org.id);
    if (settingsErr) {
      console.error('❌ settings 更新失敗:', settingsErr.message);
      process.exit(1);
    }
    console.log('✅ masta タイプを enabled_content_types に追加しました');
  } else {
    console.log('✅ masta タイプは有効です');
  }

  // 4. 既存の m-city-* slug を取得（登録済みをスキップ）
  const { data: existingSlugs, error: slugErr } = await supabase
    .from('contents')
    .select('slug')
    .eq('organization_id', org.id)
    .like('slug', 'm-city-%');

  if (slugErr) {
    console.error('❌ 既存 slug の取得に失敗:', slugErr.message);
    process.exit(1);
  }

  const existingSlugSet = new Set((existingSlugs || []).map(r => r.slug));
  console.log(`📋 登録済み m-city-* コンテンツ: ${existingSlugSet.size}件`);

  // 5. 登録対象をフィルタリング
  const toInsert = municipalities.filter(item => {
    const slug = `m-city-${item.prefecture}-${item.city}`;
    return !existingSlugSet.has(slug);
  });

  console.log(`📝 今回の登録対象: ${toInsert.length}件（既存${existingSlugSet.size}件をスキップ）`);

  if (toInsert.length === 0) {
    console.log('🎉 すべて登録済みです。');
    return;
  }

  // 6. バッチ登録（50件ずつ）
  const BATCH_SIZE = 50;
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);

    const rows = batch.map(item => ({
      organization_id: org.id,
      type: 'masta',
      title: `🏘️ ${item.prefecture} ${item.city}`,
      slug: `m-city-${item.prefecture}-${item.city}`,
      status: 'published',
      published_at: new Date().toISOString(),
      blocks: [],
      tags: [],
      related_product_ids: [],
      custom_fields: [
        { key: 'prefecture', label: '都道府県', type: 'text', value: item.prefecture || '' },
        { key: 'city', label: '市区町村', type: 'text', value: item.city || '' },
        { key: 'description', label: '説明', type: 'textarea', value: item.description || '' },
        { key: 'url', label: 'URL', type: 'url', value: item.url || '' },
        { key: 'image', label: '画像', type: 'image', value: item.image || '' },
      ],
    }));

    const { data, error } = await supabase
      .from('contents')
      .insert(rows)
      .select('id, slug');

    if (error) {
      // slug 重複（409相当）の場合はスキップ、それ以外はエラー
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        console.warn(`  ⚠️  バッチ ${Math.floor(i / BATCH_SIZE) + 1}: slug 重複のためスキップ`);
        skipCount += batch.length;
      } else {
        console.error(`  ❌ バッチ ${Math.floor(i / BATCH_SIZE) + 1} エラー:`, error.message);
        // 1件ずつリトライ
        for (const row of rows) {
          const { error: singleErr } = await supabase.from('contents').insert(row);
          if (singleErr) {
            if (singleErr.message.includes('duplicate') || singleErr.message.includes('unique')) {
              skipCount++;
            } else {
              console.error(`    ❌ ${row.slug}: ${singleErr.message}`);
              errorCount++;
            }
          } else {
            successCount++;
          }
        }
        continue;
      }
    } else {
      successCount += data?.length || 0;
    }

    const progress = Math.min(i + BATCH_SIZE, toInsert.length);
    const pct = Math.round((progress / toInsert.length) * 100);
    process.stdout.write(`\r  進捗: ${progress}/${toInsert.length} (${pct}%)  成功:${successCount} スキップ:${skipCount} エラー:${errorCount}`);
  }

  console.log('\n');
  console.log('========================================');
  console.log(`✅ 完了！`);
  console.log(`   登録成功: ${successCount}件`);
  console.log(`   スキップ: ${skipCount}件（重複）`);
  console.log(`   エラー  : ${errorCount}件`);
  console.log('========================================');
}

main().catch(e => {
  console.error('\n❌ 予期せぬエラー:', e);
  process.exit(1);
});

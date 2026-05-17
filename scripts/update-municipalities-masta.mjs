#!/usr/bin/env node
// 市区町村マスタ（type=masta）を正しいフォーマットに一括更新するスクリプト。
//
// 変更内容:
//   - title: "🏘️ {都道府県} {市町村}" に統一
//   - custom_fields: prefecture/city/description/url/image の名前付きキーに統一
//
// 使い方:
//   node scripts/update-municipalities-masta.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

async function loadMunicipalities() {
  const uploadedPath = path.join(
    process.env.HOME || '',
    '.cursor/projects/Users-fujiwarajukito-Documents-GitHub-akinai/uploads/municipalities-0.json'
  );
  if (fs.existsSync(uploadedPath)) {
    console.log('📂 アップロード済みファイルから読み込み中...');
    const raw = fs.readFileSync(uploadedPath, 'utf-8');
    const jsonStr = raw.replace(/^Source URL:.*\nTitle:.*\n\n/, '');
    return JSON.parse(jsonStr);
  }
  console.log('🌐 municipalities.json をネットワークから取得中...');
  const res = await fetch('https://machimogu.jp/data/municipalities.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const municipalities = await loadMunicipalities();
  console.log(`✅ 読み込み完了: ${municipalities.length}件`);

  // slug をキーにした辞書を作成
  const muniMap = {};
  for (const item of municipalities) {
    const slug = `m-city-${item.prefecture}-${item.city}`;
    muniMap[slug] = item;
  }

  const orgId = 'c664ec86-f3b7-4c94-9485-075b7a691d83';

  // 全 m-city-* コンテンツを取得（1000件上限を避けてページング）
  console.log('📋 既存コンテンツを取得中...');
  let allContents = [];
  let from = 0;
  const PAGE = 500;
  while (true) {
    const { data, error } = await supabase
      .from('contents')
      .select('id, slug, title, custom_fields')
      .eq('organization_id', orgId)
      .like('slug', 'm-city-%')
      .range(from, from + PAGE - 1);
    if (error) {
      console.error('❌ コンテンツ取得エラー:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allContents = allContents.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`📋 取得済みコンテンツ: ${allContents.length}件`);

  // 更新が必要なものを特定（title に🏘️がない、または正しい custom_fields でないもの）
  const toUpdate = allContents.filter(row => {
    const muni = muniMap[row.slug];
    if (!muni) return false;
    const expectedTitle = `🏘️ ${muni.prefecture} ${muni.city}`;
    const hasCorrectTitle = row.title === expectedTitle;
    const fields = row.custom_fields || [];
    const hasNamedKeys = fields.some(f => f.key === 'prefecture') &&
      fields.some(f => f.key === 'city') &&
      fields.some(f => f.key === 'url') &&
      fields.some(f => f.key === 'image');
    return !hasCorrectTitle || !hasNamedKeys;
  });

  console.log(`📝 更新対象: ${toUpdate.length}件`);

  if (toUpdate.length === 0) {
    console.log('🎉 すべて最新のフォーマットです。更新不要です。');
    return;
  }

  // バッチ更新（50件ずつ、個別 update）
  let successCount = 0;
  let errorCount = 0;
  const BATCH = 50;

  for (let i = 0; i < toUpdate.length; i++) {
    const row = toUpdate[i];
    const muni = muniMap[row.slug];

    const { error } = await supabase
      .from('contents')
      .update({
        title: `🏘️ ${muni.prefecture} ${muni.city}`,
        custom_fields: [
          { key: 'prefecture', label: '都道府県', type: 'text',     value: muni.prefecture   || '' },
          { key: 'city',       label: '市区町村', type: 'text',     value: muni.city         || '' },
          { key: 'description',label: '説明',     type: 'textarea', value: muni.description  || '' },
          { key: 'url',        label: 'URL',      type: 'url',      value: muni.url          || '' },
          { key: 'image',      label: '画像',     type: 'image',    value: muni.image        || '' },
        ],
      })
      .eq('id', row.id);

    if (error) {
      console.error(`\n  ❌ ${row.slug}: ${error.message}`);
      errorCount++;
    } else {
      successCount++;
    }

    // 進捗表示（50件ごと）
    if ((i + 1) % BATCH === 0 || i + 1 === toUpdate.length) {
      const pct = Math.round(((i + 1) / toUpdate.length) * 100);
      process.stdout.write(`\r  進捗: ${i + 1}/${toUpdate.length} (${pct}%)  成功:${successCount} エラー:${errorCount}`);
    }
  }

  console.log('\n');
  console.log('========================================');
  console.log('✅ 更新完了！');
  console.log(`   更新成功: ${successCount}件`);
  console.log(`   エラー  : ${errorCount}件`);
  console.log('========================================');
}

main().catch(e => {
  console.error('\n❌ 予期せぬエラー:', e);
  process.exit(1);
});

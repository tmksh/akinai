#!/usr/bin/env node
// machimogu 組織の products を実DBから直接調査して、
// API が「常に5件しか返らない」原因を切り分けるための診断スクリプト。
//
// 使い方:
//   node scripts/diagnose-machimogu-products.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

// .env.local を簡易読み込み
function loadEnv() {
  if (fs.existsSync('.env.local')) {
    const content = fs.readFileSync('.env.local', 'utf-8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE 環境変数が見つかりません');
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  // 1) machimogu 組織を特定
  const { data: orgs, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, slug, plan, is_active, frontend_api_key, features')
    .or('name.ilike.%まちもぐ%,name.ilike.%machimogu%,slug.ilike.%machimogu%');

  if (orgErr) {
    console.error('organizations 取得エラー:', orgErr);
    return;
  }

  if (!orgs || orgs.length === 0) {
    console.log('「まちもぐ / machimogu」を含む組織が見つかりません。');
    return;
  }

  for (const org of orgs) {
    console.log('\n===============================');
    console.log(`組織: ${org.name} (${org.slug})`);
    console.log(`  id           : ${org.id}`);
    console.log(`  plan         : ${org.plan}`);
    console.log(`  is_active    : ${org.is_active}`);
    console.log(`  api_key      : ${org.frontend_api_key ? org.frontend_api_key.slice(0, 12) + '…' : '(未設定)'}`);
    console.log(`  features     : ${JSON.stringify(org.features)}`);

    // 2) 商品の総数
    const { count: totalCount, error: cntErr } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', org.id);
    if (cntErr) {
      console.error('  products count エラー:', cntErr);
      continue;
    }
    console.log(`\n  ▼ products テーブル合計: ${totalCount}件`);

    // 3) ステータス内訳
    const { data: byStatus } = await supabase
      .from('products')
      .select('status')
      .eq('organization_id', org.id);
    const statusCount = {};
    for (const r of byStatus || []) {
      statusCount[r.status] = (statusCount[r.status] || 0) + 1;
    }
    console.log('  ▼ ステータス内訳:', statusCount);

    // 4) approval_status 内訳（カラムが無ければエラーは無視）
    const { data: byApproval, error: apprErr } = await supabase
      .from('products')
      .select('approval_status')
      .eq('organization_id', org.id);
    if (!apprErr) {
      const apprCount = {};
      for (const r of byApproval || []) {
        const k = r.approval_status === null ? '(null)' : r.approval_status;
        apprCount[k] = (apprCount[k] || 0) + 1;
      }
      console.log('  ▼ approval_status 内訳:', apprCount);
    }

    // 5) 直近の作成日時 上位10件
    const { data: latest } = await supabase
      .from('products')
      .select('id, name, slug, status, created_at')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(10);
    console.log('  ▼ 直近10件:');
    for (const p of latest || []) {
      console.log(`    - ${p.created_at}  status=${p.status}  ${p.name}  (slug: ${p.slug})`);
    }

    // 6) limit=100 で実際にAPIと同じクエリを再現（ステータス指定なし＝全件、status='all' に相当）
    const { data: simAll, error: simAllErr } = await supabase
      .from('products')
      .select('id,name,status,created_at', { count: 'exact' })
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .range(0, 99);
    console.log(`\n  ▼ 模擬クエリ (status=all, limit=100): ${simAll?.length ?? 0}件 / 総数 ${simAllErr ? '?' : ''}`);

    // 7) 模擬: 既定挙動 status=published, limit=20
    const { data: simPub } = await supabase
      .from('products')
      .select('id,name,status,created_at')
      .eq('organization_id', org.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(0, 19);
    console.log(`  ▼ 模擬クエリ (status=published, limit=20): ${simPub?.length ?? 0}件`);

    // 8) ユーザー報告「常に5件」を再現できないか別パターン
    const { data: simLimit5 } = await supabase
      .from('products')
      .select('id', { count: 'exact' })
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .range(0, 4);
    console.log(`  ▼ 模擬クエリ (limit=5): ${simLimit5?.length ?? 0}件`);
  }

  // ===== 本番API（akinai-dx.com）を叩いて挙動を確認 =====
  const machimogu = orgs.find((o) => o.slug?.includes('machimogu'));
  if (machimogu?.frontend_api_key) {
    const apiKey = machimogu.frontend_api_key;
    const baseUrl = 'https://akinai-dx.com/api/v1/products';

    async function callApi(qs) {
      const url = `${baseUrl}${qs}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const json = await res.json().catch(() => null);
      return { status: res.status, len: json?.data?.length ?? null, total: json?.meta?.pagination?.total ?? null, json };
    }

    console.log('\n===============================');
    console.log('▼ 本番API挙動チェック (akinai-dx.com)');
    const cases = [
      '',
      '?limit=100',
      '?limit=100&status=all',
      '?limit=100&status=draft',
      '?limit=100&status=archived',
      '?limit=100&status=published',
      '?limit=5',
      '?page=2&limit=100',
    ];
    for (const qs of cases) {
      const r = await callApi(qs);
      console.log(`  [${qs || '(empty)'}] status=${r.status} length=${r.len} total=${r.total}`);
      if (r.status >= 400) console.log('    err:', JSON.stringify(r.json));
    }
  } else {
    console.log('\n machimoguのAPIキーが取得できませんでした');
  }

  // ===== 追加: APIキーが別組織のものを指している可能性をチェック =====
  console.log('\n===============================');
  console.log('▼ 「商品が5件のみ」の組織が他に存在するかチェック');
  const { data: allProducts } = await supabase
    .from('products')
    .select('organization_id');
  const counts = {};
  for (const p of allProducts || []) {
    counts[p.organization_id] = (counts[p.organization_id] || 0) + 1;
  }
  const fiveOrgs = Object.entries(counts).filter(([, n]) => n === 5);
  console.log(`  products数=5の組織: ${fiveOrgs.length}件`);
  for (const [orgId] of fiveOrgs) {
    const { data: o } = await supabase
      .from('organizations')
      .select('id, name, slug, frontend_api_key')
      .eq('id', orgId)
      .single();
    if (o) {
      console.log(`   - ${o.name} (${o.slug})  id=${o.id}  apiKey=${o.frontend_api_key?.slice(0, 12)}…`);
    }
  }
}

main().catch((e) => {
  console.error('予期せぬエラー:', e);
  process.exit(1);
});

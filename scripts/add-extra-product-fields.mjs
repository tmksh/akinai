#!/usr/bin/env node
/**
 * machimogu@example.com テナントの商品カスタムフィールドに、
 * 要件定義不足分の追加フィールド計22項目を追加する。
 *
 *   - 任意項目 A〜S        16個
 *   - 自動引用（販売者）    3個
 *   - 地域選択（国名）       1個
 *   - 価格・販売単位         2個
 *
 * - 既存に同名キーがある場合は label / type / options を上書き
 * - 無ければ新規追加（最後尾）
 *
 * 実行: node scripts/add-extra-product-fields.mjs [--dry-run]
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
  console.error('Missing SUPABASE_URL / SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const TARGET_EMAIL = 'machimogu@example.com';
const DRY_RUN = process.argv.includes('--dry-run');

// 追加フィールド定義（合計22項目）
const EXTRA_FIELDS = [
  // ---- 任意項目 A〜S（16個） ----
  { key: 'concept',           label: '商品コンセプト',              type: 'textarea' },
  { key: 'usageScene',        label: '利用シーン・おすすめ',        type: 'textarea' },
  { key: 'labelImages',       label: '食品表示画像',                type: 'textarea' }, // ※画像URL配列をJSON文字列で保存
  { key: 'maxLotUnit',        label: '最大ロット単位',              type: 'text' },     // 例: ケース、kg
  { key: 'caseD',             label: '発注ケースサイズ縦 (cm)',     type: 'number' },
  { key: 'caseW',             label: '発注ケースサイズ横 (cm)',     type: 'number' },
  { key: 'caseH',             label: '発注ケースサイズ高さ (cm)',   type: 'number' },
  { key: 'caseWeight',        label: '発注ケース重量 (kg)',         type: 'number' },
  { key: 'export',            label: '国外輸出可否',                type: 'select',   options: ['相談可', '不可'] },
  { key: 'salesForm',         label: '販売形態',                    type: 'select',   options: ['小売用', '業務用', '小売・業務用'] },
  { key: 'webSales',          label: 'WEBサイト販売',               type: 'select',   options: ['自社サイト', '他社サイト', 'なし'] },
  { key: 'availableFrom',     label: '提供可能時期',                type: 'text' },     // 例: 通年、または◯月〜◯月
  { key: 'buyerMessage',      label: 'バイヤーへのメッセージ',      type: 'textarea' },
  { key: 'promotionTools',    label: '販促ツール',                  type: 'textarea' },
  { key: 'relatedProductIds', label: '関連商品ID',                  type: 'textarea' }, // ※商品IDの配列をJSON文字列で保存
  { key: 'videoUrl',          label: '商品動画URL',                 type: 'url' },      // YouTube/Vimeo等

  // ---- 自動引用（販売者情報）3個 ----
  { key: 'supplierName',      label: '販売事業者名',                type: 'text' },     // 会員の会社名を自動コピー
  { key: 'supplierEmail',     label: 'サプライヤーメール',          type: 'email' },    // 会員のメールを自動コピー
  { key: 'has_invoice',       label: 'インボイス対応',              type: 'boolean' },  // 会員のインボイス対応状況を自動コピー

  // ---- 地域選択 1個 ----
  { key: 'country',           label: '国名',                        type: 'text' },     // 都道府県=「国外」時のみ使用

  // ---- 価格・販売単位 2個 ----
  { key: 'priceType',         label: '価格種別',                    type: 'select',   options: ['直接入力', 'オープン', '時価'] },
  { key: 'unit',              label: '販売単位',                    type: 'text' },     // 例: 個、本、kg、ケース
];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`[add-extra-product-fields] DRY_RUN=${DRY_RUN}`);
  console.log(`[add-extra-product-fields] target email: ${TARGET_EMAIL}`);
  console.log(`[add-extra-product-fields] planned extra fields: ${EXTRA_FIELDS.length}`);

  const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;
  const user = usersList?.users?.find((u) => u.email === TARGET_EMAIL);
  if (!user) throw new Error(`User not found: ${TARGET_EMAIL}`);
  console.log(`[add-extra-product-fields] user id: ${user.id}`);

  const { data: members, error: memberErr } = await supabase
    .from('organization_members')
    .select('organization_id, role, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true);
  if (memberErr) throw memberErr;
  if (!members || members.length === 0) throw new Error('No organization membership found');

  for (const m of members) {
    console.log(`\n=== Organization: ${m.organization_id} (role=${m.role}) ===`);
    await processOrganization(m.organization_id);
  }
}

async function processOrganization(orgId) {
  const { data: org, error: fetchErr } = await supabase
    .from('organizations')
    .select('id, name, slug, settings')
    .eq('id', orgId)
    .single();
  if (fetchErr) throw fetchErr;

  console.log(`org name: ${org.name}`);

  const settings = org.settings ?? {};
  const schema = Array.isArray(settings.product_field_schema)
    ? [...settings.product_field_schema]
    : [];

  console.log(`current schema fields: ${schema.length}`);

  const newSchema = [...schema];
  const summary = { added: [], updated: [], unchanged: [] };

  for (const def of EXTRA_FIELDS) {
    const idx = newSchema.findIndex((f) => f.key === def.key);
    if (idx === -1) {
      newSchema.push({
        id: `schema-${def.key}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
        key: def.key,
        label: def.label,
        type: def.type,
        ...(def.options ? { options: def.options } : {}),
      });
      summary.added.push(def.key);
    } else {
      const existing = newSchema[idx];
      const sameType = existing.type === def.type;
      const sameLabel = existing.label === def.label;
      const sameOptions = JSON.stringify(existing.options ?? null) === JSON.stringify(def.options ?? null);
      if (sameType && sameLabel && sameOptions) {
        summary.unchanged.push(def.key);
      } else {
        const next = { ...existing, type: def.type, label: def.label };
        if (def.options) next.options = def.options;
        else delete next.options;
        newSchema[idx] = next;
        summary.updated.push(def.key);
      }
    }
  }

  console.log(`added    (${summary.added.length}): ${summary.added.join(', ') || '(none)'}`);
  console.log(`updated  (${summary.updated.length}): ${summary.updated.join(', ') || '(none)'}`);
  console.log(`unchanged(${summary.unchanged.length}): ${summary.unchanged.join(', ') || '(none)'}`);

  console.log(`\nresult schema fields: ${newSchema.length}`);
  for (const f of newSchema) {
    console.log(`  - ${f.key} (${f.type})${f.options ? ` [${f.options.length}opt]` : ''} -> ${f.label}`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] skip update');
    return;
  }

  if (summary.added.length === 0 && summary.updated.length === 0) {
    console.log('\nno changes to apply.');
    return;
  }

  const newSettings = { ...settings, product_field_schema: newSchema };
  const { error: updateErr } = await supabase
    .from('organizations')
    .update({ settings: newSettings, updated_at: new Date().toISOString() })
    .eq('id', orgId);
  if (updateErr) throw updateErr;

  console.log('\n✅ updated.');
}

main().catch((err) => {
  console.error('\n❌ ERROR:', err);
  process.exit(1);
});

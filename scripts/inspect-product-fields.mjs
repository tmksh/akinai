#!/usr/bin/env node
/**
 * machimogu@example.com テナントの商品カスタムフィールド一覧を表示するスクリプト
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TARGET_EMAIL = 'machimogu@example.com';

const { data: usersList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
const user = usersList?.users?.find((u) => u.email === TARGET_EMAIL);
if (!user) throw new Error(`User not found: ${TARGET_EMAIL}`);
const { data: members } = await supabase
  .from('organization_members')
  .select('organization_id')
  .eq('user_id', user.id)
  .eq('is_active', true);

const filterArg = process.argv.slice(2).find((a) => !a.startsWith('--'));

for (const m of members) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, settings')
    .eq('id', m.organization_id)
    .single();

  const schema = (org.settings ?? {}).product_field_schema ?? [];
  console.log(`\n=== ${org.name} (org_id: ${org.id}) ===`);
  console.log(`total product fields: ${schema.length}\n`);

  let shown = 0;
  for (const f of schema) {
    if (filterArg && !(f.key.includes(filterArg) || (f.label ?? '').includes(filterArg))) continue;
    shown++;
    const opts = Array.isArray(f.options) ? `\n      opts(${f.options.length}) = [ ${f.options.join(' / ')} ]` : '';
    console.log(`  - ${f.key} (${f.type}) -> ${f.label}${opts}`);
  }
  if (filterArg) console.log(`\n(filtered: ${shown} matched "${filterArg}")`);
}

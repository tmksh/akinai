#!/usr/bin/env node
/**
 * machimogu@example.com テナントの顧客カスタムフィールドを確認するスクリプト
 *  - 現状のスキーマ全体を表示
 *  - ロール別（all / personal / buyer / supplier）に分類して表示
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

for (const m of members) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, settings')
    .eq('id', m.organization_id)
    .single();

  const schema = (org.settings ?? {}).customer_field_schema ?? [];
  console.log(`\n=== ${org.name} (org_id: ${org.id}) ===`);
  console.log(`total customer fields: ${schema.length}\n`);

  const groups = { all: [], personal: [], buyer: [], supplier: [] };
  for (const f of schema) {
    const roles = Array.isArray(f.roles) && f.roles.length > 0 ? f.roles : ['all'];
    for (const r of roles) {
      if (groups[r]) groups[r].push(f);
    }
  }

  for (const [role, fields] of Object.entries(groups)) {
    console.log(`---- [${role}] ${fields.length} fields ----`);
    for (const f of fields) {
      const opts = Array.isArray(f.options) ? ` opts=[${f.options.join(' / ')}]` : '';
      const req = f.required ? ' *required' : '';
      console.log(`  - ${f.key} (${f.type})${req} -> ${f.label}${opts}`);
    }
    console.log('');
  }
}

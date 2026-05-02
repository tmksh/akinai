#!/usr/bin/env node
/**
 * machimogu@example.com テナントの全スキーマ（products / customer / content / agent）から
 * featureOnBRDDist や featured 系フィールドを探す
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

  console.log(`\n=== ${org.name} ===`);
  const settings = org.settings ?? {};

  const SCHEMAS = {
    product_field_schema: settings.product_field_schema,
    customer_field_schema: settings.customer_field_schema,
    agent_field_schema: settings.agent_field_schema,
    content_field_schema: settings.content_field_schema,
  };

  for (const [name, raw] of Object.entries(SCHEMAS)) {
    let fields = [];
    if (Array.isArray(raw)) fields = raw;
    else if (raw && typeof raw === 'object') {
      // content_field_schema は { type: [fields] } 形式
      for (const [type, list] of Object.entries(raw)) {
        if (Array.isArray(list)) fields.push(...list.map(f => ({ ...f, _contentType: type })));
      }
    }

    const matches = fields.filter(f =>
      /feature/i.test(f.key ?? '') ||
      /BRDDist/i.test(f.key ?? '') ||
      /TOP/i.test(f.label ?? '') ||
      /表示/i.test(f.label ?? '') && /TOP|トップ|フィーチャー/i.test(f.label ?? '')
    );

    if (matches.length > 0) {
      console.log(`\n[${name}] ${matches.length} matches`);
      for (const f of matches) {
        const opts = Array.isArray(f.options) ? ` opts=[${f.options.join(' / ')}]` : '';
        const ct = f._contentType ? ` (contentType=${f._contentType})` : '';
        console.log(`  - ${f.key} (${f.type})${ct} -> ${f.label}${opts}`);
      }
    } else {
      console.log(`[${name}] no feature/TOP match (total ${fields.length} fields)`);
    }
  }
}

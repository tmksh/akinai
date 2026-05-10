import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const envText = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const customerId = 'a4500ce4-781b-4fc0-b7fa-f8c04311a75b';

const { data: customer } = await supabase
  .from('customers')
  .select('id, name, email, custom_fields, status')
  .eq('id', customerId)
  .single();

console.log('=== Customer ===');
console.log(JSON.stringify(customer, null, 2));

const { data: orders } = await supabase
  .from('orders')
  .select('id, order_number, status, payment_status, payment_method, total, notes, created_at, stripe_payment_intent_id')
  .eq('customer_id', customerId)
  .order('created_at', { ascending: false });

console.log('\n=== Orders ===');
console.log(`件数: ${orders?.length ?? 0}`);
for (const o of orders || []) {
  console.log(`\n- ${o.order_number} | ${o.status}/${o.payment_status} | ¥${o.total} | ${o.payment_method}`);
  console.log(`  created_at: ${o.created_at}`);
  console.log(`  notes: ${o.notes}`);
  console.log(`  stripe_payment_intent_id: ${o.stripe_payment_intent_id}`);
}

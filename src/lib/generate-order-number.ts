import { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

/**
 * 注文番号を生成する。
 * 形式: ORD-YYYYMMDD-N（当日の連番）
 * 例: ORD-20260609-1, ORD-20260609-2, ...
 *
 * DB に当日の最大連番を問い合わせて次の番号を返す。
 * 同時リクエストで番号が重複する可能性は低いが、
 * orders テーブルに UNIQUE 制約があるため重複時は呼び出し元でリトライする。
 */
export async function generateOrderNumber(supabase: AnySupabase): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const prefix = `ORD-${year}${month}${day}-`;

  const { data } = await supabase
    .from('orders')
    .select('order_number')
    .like('order_number', `${prefix}%`)
    .order('order_number', { ascending: false })
    .limit(1);

  let seq = 1;
  if (data && data.length > 0) {
    const last = data[0].order_number as string;
    const parts = last.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${seq}`;
}

import { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

/**
 * 注文番号を生成する。
 * 形式: #NNNNN（全体通し番号、5桁ゼロ埋め）
 * 例: #00001, #00002, ...
 *
 * DB の全注文から最大の連番を取得して次の番号を返す。
 * orders テーブルに UNIQUE 制約があるため重複時は呼び出し元でリトライする。
 */
export async function generateOrderNumber(supabase: AnySupabase): Promise<string> {
  // 新形式 #NNNNN（5桁）のみを対象に最大値を取得
  // SQL LIKE の `_` は任意の1文字にマッチするため、#_____ で5桁の番号だけを絞り込む
  const { data: newFormat } = await supabase
    .from('orders')
    .select('order_number')
    .like('order_number', '#_____')
    .order('order_number', { ascending: false })
    .limit(1);

  if (newFormat && newFormat.length > 0) {
    const last = newFormat[0].order_number as string;
    const lastSeq = parseInt(last.replace('#', ''), 10);
    if (!isNaN(lastSeq)) {
      return `#${String(lastSeq + 1).padStart(5, '0')}`;
    }
  }

  // 新形式の注文がまだない場合は全注文数をベースに開始番号を決める
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  const seq = (count ?? 0) + 1;
  return `#${String(seq).padStart(5, '0')}`;
}

'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * サインアップ直後にメール確認をサーバー側でスキップし、
 * すぐにサインイン可能な状態にする。
 * Supabase ダッシュボードで「Confirm email」が有効でも
 * ユーザーがメールを受け取る必要をなくす。
 */
export async function confirmUserAndSignIn(
  userId: string,
  email: string,
  password: string
): Promise<{ error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return { error: 'Server configuration error' };
  }

  // サービスロールキーでメール確認をスキップ
  const adminClient = createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: confirmError } = await adminClient.auth.admin.updateUserById(
    userId,
    { email_confirm: true }
  );

  if (confirmError) {
    console.error('[confirmUserAndSignIn] confirm error:', confirmError);
    // 確認スキップに失敗しても続行（既に確認済みの場合など）
  }

  // セッションクライアントでサインイン
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('[confirmUserAndSignIn] signIn error:', signInError);
    return { error: signInError.message };
  }

  return { error: null };
}

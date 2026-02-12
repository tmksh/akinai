import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Supabase がエラーでリダイレクトしてきた場合
  if (errorParam) {
    const message = errorDescription ? `${errorParam}: ${errorDescription}` : errorParam;
    return NextResponse.redirect(`${origin}/login?error=auth_failed&detail=${encodeURIComponent(message)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('[auth/callback] exchangeCodeForSession error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=auth_failed&detail=${encodeURIComponent(error.message)}`);
    }

    if (data?.user) {
      // ユーザーの組織メンバーシップを確認
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .limit(1);

      if (memberships && memberships.length > 0) {
        await supabase
          .from('users')
          .update({ 
            current_organization_id: memberships[0].organization_id,
            last_login_at: new Date().toISOString()
          })
          .eq('id', data.user.id);
        return NextResponse.redirect(`${origin}${next}`);
      }
      
      // 所属組織がない場合はオンボーディング（組織作成）へ
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // エラー時はログインページにリダイレクト
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}


import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // ユーザーの組織メンバーシップを確認
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .limit(1);

      // 所属組織がある場合は current_organization_id を設定
      if (memberships && memberships.length > 0) {
        await supabase
          .from('users')
          .update({ 
            current_organization_id: memberships[0].organization_id,
            last_login_at: new Date().toISOString()
          })
          .eq('id', data.user.id);
      } else {
        // 組織がない場合は組織選択/作成ページへリダイレクト
        // TODO: 組織オンボーディングフローを実装
        // return NextResponse.redirect(`${origin}/onboarding/organization`);
      }
      
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // エラー時はログインページにリダイレクト
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}


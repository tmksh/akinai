import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getContents, getContentStats } from '@/lib/actions/contents';
import ContentsClient from './contents-client';

export default async function ContentsPage() {
  const supabase = await createClient();
  
  // ユーザー認証確認
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  // ユーザーの現在の組織を取得
  const { data: userData } = await supabase
    .from('users')
    .select('current_organization_id')
    .eq('id', user.id)
    .single();
  
  const organizationId = userData?.current_organization_id;
  
  if (!organizationId) {
    // 組織がない場合は空のデータを表示
    return (
      <ContentsClient 
        initialContents={[]} 
        stats={{ total: 0, published: 0, draft: 0, scheduled: 0 }}
        organizationId=""
      />
    );
  }
  
  // コンテンツ取得
  const { data: contents } = await getContents(organizationId);
  
  // 統計取得
  const stats = await getContentStats(organizationId) || {
    total: 0,
    published: 0,
    draft: 0,
    scheduled: 0,
  };

  return (
    <ContentsClient 
      initialContents={contents || []} 
      stats={stats}
      organizationId={organizationId}
    />
  );
}

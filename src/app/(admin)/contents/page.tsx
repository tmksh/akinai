import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getContents, getContentStats } from '@/lib/actions/contents';
import { getEnabledContentTypes } from '@/lib/actions/settings';
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
    return (
      <ContentsClient 
        initialContents={[]} 
        stats={{ total: 0, published: 0, draft: 0, scheduled: 0 }}
        organizationId=""
        enabledContentTypes={[]}
      />
    );
  }
  
  const { data: contents } = await getContents(organizationId);
  const stats = await getContentStats(organizationId) || {
    total: 0,
    published: 0,
    draft: 0,
    scheduled: 0,
  };
  const { data: enabledContentTypes } = await getEnabledContentTypes(organizationId);

  return (
    <ContentsClient 
      initialContents={contents || []} 
      stats={stats}
      organizationId={organizationId}
      enabledContentTypes={enabledContentTypes || []}
    />
  );
}

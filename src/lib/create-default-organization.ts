import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

function slugFromName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff-]/g, '');
  const unique = `${base}-${Date.now().toString(36)}`;
  return unique.slice(0, 60);
}

/**
 * 組織に未所属のユーザーにデフォルト組織「マイショップ」を作成し、オーナーとして追加する。
 * Route Handler や Server Action から呼び出す用。
 */
export async function createDefaultOrganizationForUser(
  supabase: SupabaseClient,
  user: User
): Promise<{ organizationId: string }> {
  const displayName = (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'ユーザー';
  const defaultName = displayName && displayName !== 'ユーザー' ? `${displayName}のショップ` : 'マイショップ';

  const slug = slugFromName(defaultName);
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: defaultName,
      slug,
      owner_id: user.id,
    })
    .select('id')
    .single();

  if (orgError) {
    console.error('[createDefaultOrganizationForUser]', orgError);
    throw new Error(orgError.message);
  }

  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: org.id,
    user_id: user.id,
    role: 'owner',
  });

  if (memberError) {
    console.error('[createDefaultOrganizationForUser] member', memberError);
    throw new Error(memberError.message);
  }

  await supabase
    .from('users')
    .update({
      current_organization_id: org.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  return { organizationId: org.id };
}

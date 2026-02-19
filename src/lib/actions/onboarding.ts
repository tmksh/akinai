'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { createDefaultOrganizationForUser } from '@/lib/create-default-organization';

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
 * 現在のユーザーに組織がなければデフォルト組織（マイショップ or 「名前のショップ」）を作成する。
 * サインアップ後やダッシュボード初回アクセス時に使用。
 */
export async function ensureDefaultOrganization() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'ログインしてください' };
  }

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1);

  if (memberships && memberships.length > 0) {
    const orgId = memberships[0].organization_id;
    await supabase
      .from('users')
      .update({
        current_organization_id: orgId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    return { data: { organizationId: orgId }, error: null };
  }

  try {
    const { organizationId } = await createDefaultOrganizationForUser(supabase, user);
    return { data: { organizationId }, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : '組織の作成に失敗しました';
    return { data: null, error: message };
  }
}

/**
 * オンボーディング: 組織を新規作成し、現在のユーザーをオーナーとして追加する
 */
export async function createOrganizationForOnboarding(name: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'ログインしてください' };
  }

  const slug = slugFromName(name);
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: name.trim(),
      slug,
      owner_id: user.id,
    })
    .select('id')
    .single();

  if (orgError) {
    console.error('Error creating organization:', orgError);
    return { data: null, error: orgError.message };
  }

  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: org.id,
    user_id: user.id,
    role: 'owner',
  });

  if (memberError) {
    console.error('Error adding member:', memberError);
    return { data: null, error: memberError.message };
  }

  await supabase
    .from('users')
    .update({
      current_organization_id: org.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  revalidatePath('/onboarding');
  revalidatePath('/dashboard');
  return { data: { organizationId: org.id }, error: null };
}

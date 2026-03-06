import { Suspense } from 'react';
import { TopNavigation } from '@/components/layout/top-navigation';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { OrganizationProvider } from '@/components/providers/organization-provider';
import type { Organization, CurrentUser } from '@/components/providers/organization-provider';
import { Toaster } from '@/components/ui/sonner';
import { createClient } from '@/lib/supabase/server';

async function getInitialData(): Promise<{
  organization: Organization | null;
  currentUser: CurrentUser | null;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { organization: null, currentUser: null };

    const [profileRes, membershipRes] = await Promise.all([
      supabase.from('users').select('name, avatar').eq('id', user.id).single(),
      supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single(),
    ]);

    const currentUser: CurrentUser = {
      id: user.id,
      email: user.email ?? '',
      name: (profileRes.data?.name as string) ?? user.user_metadata?.name ?? user.email ?? 'ユーザー',
      avatar: (profileRes.data?.avatar as string) ?? user.user_metadata?.avatar_url ?? null,
    };

    if (membershipRes.error || !membershipRes.data) {
      return { organization: null, currentUser };
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, slug, logo, email, phone, website, address, frontend_url, frontend_api_key, plan, settings, owner_id, is_active, created_at, updated_at')
      .eq('id', membershipRes.data.organization_id)
      .single();

    if (!org) return { organization: null, currentUser };

    const settings = (org.settings as Record<string, unknown>) || {};
    const organization: Organization = {
      id: org.id as string,
      name: org.name as string,
      slug: org.slug as string,
      logo: org.logo as string | null,
      email: org.email as string | null,
      phone: org.phone as string | null,
      website: org.website as string | null,
      address: org.address as string | null,
      frontendUrl: org.frontend_url as string | null,
      frontendApiKey: org.frontend_api_key as string | null,
      plan: org.plan as 'starter' | 'pro' | 'enterprise',
      settings,
      productFieldSchema: (settings.product_field_schema as Organization['productFieldSchema']) || [],
      contentFieldSchema: (settings.content_field_schema as Organization['contentFieldSchema']) || [],
      ownerId: org.owner_id as string | null,
      isActive: org.is_active as boolean,
      createdAt: org.created_at as string,
      updatedAt: org.updated_at as string,
    };

    return { organization, currentUser };
  } catch {
    return { organization: null, currentUser: null };
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { organization, currentUser } = await getInitialData();

  return (
    <OrganizationProvider initialOrganization={organization} initialUser={currentUser}>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <div className="min-h-screen dark:bg-slate-950 overflow-x-hidden" style={{ background: '#f5f3ef' }}>
        <TopNavigation />
        <main className="p-3 sm:p-4 md:p-6 pt-4 md:pt-5 max-w-7xl mx-auto w-full min-w-0">
          {children}
        </main>
        <Toaster />
      </div>
    </OrganizationProvider>
  );
}

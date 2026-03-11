import { Suspense } from 'react';
import { TopNavigation } from '@/components/layout/top-navigation';
import { NavigationProgress } from '@/components/layout/navigation-progress';
import { OrganizationProvider } from '@/components/providers/organization-provider';
import type { Organization, CurrentUser } from '@/components/providers/organization-provider';
import { Toaster } from '@/components/ui/sonner';
import { getAuthOrganization } from '@/lib/auth-helpers';

async function getInitialData(): Promise<{
  organization: Organization | null;
  currentUser: CurrentUser | null;
}> {
  try {
    const { user, userProfile, orgRow } = await getAuthOrganization();

    if (!user) return { organization: null, currentUser: null };

    const currentUser: CurrentUser = {
      id: user.id,
      email: user.email ?? '',
      name: (userProfile?.name as string) ?? user.user_metadata?.name ?? user.email ?? 'ユーザー',
      avatar: (userProfile?.avatar as string) ?? user.user_metadata?.avatar_url ?? null,
    };

    if (!orgRow) return { organization: null, currentUser };

    const settings = (orgRow.settings as Record<string, unknown>) || {};
    const organization: Organization = {
      id: orgRow.id as string,
      name: orgRow.name as string,
      slug: orgRow.slug as string,
      logo: orgRow.logo as string | null,
      email: orgRow.email as string | null,
      phone: orgRow.phone as string | null,
      website: orgRow.website as string | null,
      address: orgRow.address as string | null,
      frontendUrl: orgRow.frontend_url as string | null,
      frontendApiKey: orgRow.frontend_api_key as string | null,
      plan: orgRow.plan as 'starter' | 'pro' | 'enterprise',
      settings,
      productFieldSchema: (settings.product_field_schema as Organization['productFieldSchema']) || [],
      contentFieldSchema: (settings.content_field_schema as Organization['contentFieldSchema']) || [],
      ownerId: orgRow.owner_id as string | null,
      isActive: orgRow.is_active as boolean,
      createdAt: orgRow.created_at as string,
      updatedAt: orgRow.updated_at as string,
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
      <div className="min-h-screen overflow-x-hidden main-gradient-bg relative">
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <div className="absolute top-0 left-[10%] w-[600px] h-[400px] opacity-[0.18]"
            style={{ background: 'radial-gradient(ellipse, #bae6fd, transparent 70%)', filter: 'blur(40px)' }} />
          <div className="absolute bottom-0 right-[5%] w-[500px] h-[400px] opacity-[0.12]"
            style={{ background: 'radial-gradient(ellipse, #a5b4fc, transparent 70%)', filter: 'blur(50px)' }} />
        </div>
        <TopNavigation />
        <main className="relative z-10 p-3 sm:p-4 md:p-6 pt-4 md:pt-5 max-w-7xl mx-auto w-full min-w-0">
          {children}
        </main>
        <Toaster />
      </div>
    </OrganizationProvider>
  );
}

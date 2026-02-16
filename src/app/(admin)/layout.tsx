import { TopNavigation } from '@/components/layout/top-navigation';
import { OrganizationProvider } from '@/components/providers/organization-provider';
import { Toaster } from '@/components/ui/sonner';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrganizationProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden">
        <TopNavigation />
        <main className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto w-full min-w-0">
          {children}
        </main>
        <Toaster />
      </div>
    </OrganizationProvider>
  );
}

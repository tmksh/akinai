import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { MobileHeader } from '@/components/layout/mobile-header';
import { BottomNavigation } from '@/components/layout/bottom-navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <MobileHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6 main-gradient-bg min-h-screen pb-24 md:pb-6">
          {children}
        </main>
        <BottomNavigation />
      </SidebarInset>
    </SidebarProvider>
  );
}


import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CommandPalette } from "@/components/layout/command-palette";
import { MobileSidebarProvider } from "@/hooks/useMobileSidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileSidebarProvider>
      <div className="flex h-screen overflow-hidden bg-surface-primary">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-hidden pb-14 md:pb-0">
            {children}
          </main>
        </div>
        <MobileBottomNav />
        <CommandPalette />
      </div>
    </MobileSidebarProvider>
  );
}

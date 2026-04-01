import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { RequireAuth } from "@/lib/auth";
import { TimerProvider } from "@/hooks/useTimer";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <TimerProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <AppHeader />
              <main className="flex-1 p-6 overflow-auto">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      </TimerProvider>
    </RequireAuth>
  );
}

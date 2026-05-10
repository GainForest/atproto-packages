"use client";

import { Header } from "./Header/Header";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { MobileNavDrawer } from "@/components/ui/MobileNavDrawer";

export function MarketplaceAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="hidden md:flex h-screen overflow-hidden">
        <UnifiedSidebar />
        <main className="relative flex-1 overflow-y-auto">
          <Header />
          {children}
        </main>
      </div>

      <div className="flex h-screen flex-col overflow-hidden md:hidden">
        <MobileNavDrawer>
          <UnifiedSidebar />
        </MobileNavDrawer>
        <div className="relative flex-1 overflow-y-auto">
          <Header />
          {children}
        </div>
      </div>
    </>
  );
}

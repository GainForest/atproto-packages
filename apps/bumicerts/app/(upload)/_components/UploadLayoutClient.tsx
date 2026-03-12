"use client";

import { ModalProvider } from "@/components/ui/modal/context";
import { HeaderProvider } from "@/app/(marketplace)/_components/Header/context";
import { Header } from "@/app/(marketplace)/_components/Header/Header";
import { UploadDesktopSidebar } from "./Navbar/DesktopSidebar";
import { UploadMobileBottomNav } from "./Navbar/MobileBottomNav";

interface UploadLayoutClientProps {
  did: string;
  children: React.ReactNode;
}

/**
 * Client shell for the (upload) route group.
 *
 * Wraps children in:
 * - ModalProvider  — stack-based modal system
 * - HeaderProvider — header slots (left, right, sub-header)
 * - Desktop layout: fixed sidebar + scrollable main
 * - Mobile layout:  full-width + fixed bottom nav
 *
 * The `did` prop is forwarded via a data attribute so deep children can read it
 * without prop drilling (they get it from the session store instead).
 */
export function UploadLayoutClient({ children }: UploadLayoutClientProps) {
  return (
    <ModalProvider>
      <HeaderProvider>
        {/* Desktop: sidebar + content */}
        <div className="hidden md:flex h-screen overflow-hidden">
          <UploadDesktopSidebar />
          <main className="flex-1 relative overflow-y-auto">
            <Header />
            {children}
          </main>
        </div>

        {/* Mobile: full width + bottom nav */}
        <div className="md:hidden flex flex-col h-screen overflow-hidden">
          <div className="flex-1 relative overflow-y-auto pb-16">
            <Header />
            {children}
          </div>
          <UploadMobileBottomNav />
        </div>
      </HeaderProvider>
    </ModalProvider>
  );
}

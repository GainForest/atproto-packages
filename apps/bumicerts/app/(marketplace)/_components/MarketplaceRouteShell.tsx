"use client";

import { usePathname } from "next/navigation";
import { HeaderProvider } from "./Header/context";
import { TopNavbar } from "./Navbar/TopNavbar";
import { WagmiProvider } from "@/components/providers/WagmiProvider";
import { MarketplaceAppShell } from "./MarketplaceAppShell";

export function MarketplaceRouteShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/") {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNavbar />
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <WagmiProvider>
      <HeaderProvider>
        <MarketplaceAppShell>{children}</MarketplaceAppShell>
      </HeaderProvider>
    </WagmiProvider>
  );
}

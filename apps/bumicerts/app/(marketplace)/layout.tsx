import { NavbarContextProvider } from "./_components/Navbar/context";
import { MarketplaceEntryProvider } from "@/components/providers/MarketplaceEntryProvider";
import { MarketplaceRouteShell } from "./_components/MarketplaceRouteShell";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavbarContextProvider>
      <MarketplaceEntryProvider>
        <MarketplaceRouteShell>{children}</MarketplaceRouteShell>
      </MarketplaceEntryProvider>
    </NavbarContextProvider>
  );
}

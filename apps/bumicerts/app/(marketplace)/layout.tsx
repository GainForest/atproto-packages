import { NavbarContextProvider } from "./_components/Navbar/context";
import { MarketplaceEntryProvider } from "@/components/providers/MarketplaceEntryProvider";
import { MarketplaceRouteShell } from "./_components/MarketplaceRouteShell";
import { WagmiProvider } from "@/components/providers/WagmiProvider";
import { ModalProvider } from "@/components/ui/modal/context";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavbarContextProvider>
      <WagmiProvider>
        <ModalProvider>
          <MarketplaceEntryProvider>
            <MarketplaceRouteShell>{children}</MarketplaceRouteShell>
          </MarketplaceEntryProvider>
        </ModalProvider>
      </WagmiProvider>
    </NavbarContextProvider>
  );
}

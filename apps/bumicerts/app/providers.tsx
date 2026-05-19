"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { AccountProvider } from "@/components/providers/AccountProvider";
import { AtprotoProvider } from "@/components/providers/AtprotoProvider";
import { FullAppEntryProvider } from "@/components/providers/FullAppEntryProvider";
import { ModalProvider } from "@/components/ui/modal/context";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TRPCProvider } from "@/lib/trpc/provider";
import { IndexerTRPCProvider } from "@/lib/trpc/indexer/provider";
import type { SupportedLanguageCode } from "@/lib/i18n/languages";

export function Providers({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage: SupportedLanguageCode;
}) {
  const pathname = usePathname();

  if (pathname === "/") {
    return (
      <LanguageProvider initialLanguage={initialLanguage}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <NuqsAdapter>
        {/* TRPCProvider creates the QueryClient + QueryClientProvider for mutations */}
        <TRPCProvider>
          {/* IndexerTRPCProvider shares the same QueryClient, adds indexer read client */}
          <IndexerTRPCProvider>
            <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
              <AccountProvider>
                <AtprotoProvider>
                  <FullAppEntryProvider>
                    <ModalProvider>{children}</ModalProvider>
                  </FullAppEntryProvider>
                </AtprotoProvider>
              </AccountProvider>
            </ThemeProvider>
          </IndexerTRPCProvider>
        </TRPCProvider>
      </NuqsAdapter>
    </LanguageProvider>
  );
}

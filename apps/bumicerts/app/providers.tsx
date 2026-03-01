"use client";

import { ThemeProvider } from "next-themes";
import { AtprotoProvider } from "@/components/providers/AtprotoProvider";
import { ModalProvider } from "@/components/ui/modal/context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AtprotoProvider>
        <ModalProvider>
          {children}
        </ModalProvider>
      </AtprotoProvider>
    </ThemeProvider>
  );
}

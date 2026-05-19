"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState, useId } from "react";
import { LanguageSelector } from "@/components/i18n/LanguageSelector";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Drawer } from "vaul";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getHomeCopy } from "@/lib/i18n/translations";
import { links } from "@/lib/links";

export function TopNavbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { language } = useLanguage();
  const copy = getHomeCopy(language).nav;
  const navLinks = [
    { href: links.root, label: copy.home },
    { href: links.explore, label: copy.explore },
    { href: links.allOrganizations, label: copy.organizations },
    { href: links.bumicert.create, label: copy.create },
  ];

  // Radix Dialog (used by vaul Drawer) auto-generates `aria-controls` IDs from
  // a global counter. That counter can differ between SSR and client when the
  // component tree changes, causing a hydration mismatch. Pinning the content
  // element to a stable ID from useId() makes the value deterministic and
  // identical on both server and client — no mismatch.
  const drawerId = useId();

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      {/* Progressive blur background */}
      <div className="absolute inset-0 h-24 pointer-events-none">
        <div className="absolute inset-0 z-1 bg-gradient-to-b from-background/85 to-background/0" />
        <ProgressiveBlur
          position="top"
          height="100%"
          blurLevels={[0.5, 1, 2, 4, 8, 12]}
          className="z-0"
        />
      </div>

      <div className="relative z-10 mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
        {/* Logo + Wordmark */}
        <Link href={links.root} className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Image
              src="/assets/media/images/app-icon.png"
              alt="Bumicerts"
              width={28}
              height={28}
              className="drop-shadow-md"
            />
          </motion.div>
          <span className="font-garamond text-base font-medium tracking-tight text-foreground/85 transition-colors duration-200 group-hover:text-foreground">
            Bumicerts
          </span>
        </Link>

        {/* Right: Language, Launch App + Menu trigger */}
        <div className="flex items-center gap-3">
          <LanguageSelector />

          {/* Launch App button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Button asChild size="sm" className="shadow-lg shadow-primary/15">
              <Link href={links.explore}>{copy.launchApp}</Link>
            </Button>
          </motion.div>

          {/* Menu drawer — drawerId pins aria-controls to a stable useId() value */}
          <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
            <Drawer.Trigger
              aria-controls={drawerId}
              className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              {copy.menu}
              <span className="text-foreground/30">=</span>
            </Drawer.Trigger>

            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
              <Drawer.Content
                id={drawerId}
                className="fixed top-0 right-0 bottom-0 w-full max-w-md z-50 bg-background border-l border-border flex flex-col"
              >
                {/* Close button */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <span className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
                    {copy.navigation}
                  </span>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
                  >
                    {copy.close}
                  </button>
                </div>

                {/* Navigation links */}
                <nav className="flex-1 flex flex-col p-6 gap-1">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setDrawerOpen(false)}
                        className="group flex items-center justify-between py-4 border-b border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <span
                          className="text-2xl font-light text-foreground group-hover:text-primary transition-colors"
                          style={{ fontFamily: "var(--font-garamond-var)" }}
                        >
                          {link.label}
                        </span>
                        <motion.span
                          className="text-muted-foreground/30 text-lg"
                          whileHover={{ x: 4 }}
                        >
                          →
                        </motion.span>
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {/* Footer: theme toggle */}
                <div className="p-6 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    {copy.theme}
                  </span>
                  <ThemeToggle />
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
      </div>
    </motion.header>
  );
}

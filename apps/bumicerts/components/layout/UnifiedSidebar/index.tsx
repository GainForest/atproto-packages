"use client";

import { LayoutGroup, motion } from "framer-motion";
import { useMemo } from "react";
import { useAtprotoStore } from "@/components/stores/atproto";
import { SidebarHeader } from "./SidebarHeader";
import { NavSection } from "./NavSection";
import { SocialFooter } from "./SocialFooter";
import { NAV_ITEMS } from "./data";

/**
 * UnifiedSidebar
 *
 * Single sidebar component shared between (marketplace) and (upload) route groups.
 * Replaces the old separate DesktopSidebar components.
 *
 * Structure:
 * - Header: Logo + "Bumicerts" + Create button
 * - EXPLORE section (always visible)
 * - MANAGE section (requires auth, shows sign-in prompt if not authenticated)
 * - Social footer
 */
export function UnifiedSidebar() {
  const auth = useAtprotoStore((s) => s.auth);
  const isAuthenticated = auth.status === "AUTHENTICATED";

  // Compute indices for stagger animation delays
  const itemsWithIndices = useMemo(() => {
    const result: Array<{ item: typeof NAV_ITEMS[number]; index: number }> = [];
    let currentIndex = 0;

    for (const item of NAV_ITEMS) {
      if (item.kind === "separator") {
        result.push({ item, index: currentIndex });
        currentIndex += 1;
      } else if (item.kind === "section") {
        result.push({ item, index: currentIndex });
        currentIndex += 1 + item.items.length;
      }
    }

    return result;
  }, []);

  return (
    <nav className="w-[240px] h-full flex flex-col justify-between p-4 border-r border-border bg-foreground/3 relative">
      {/* Top section */}
      <div className="flex flex-col gap-1">
        {/* Header */}
        <SidebarHeader />

        {/* Nav sections — data-driven */}
        <LayoutGroup id="unified-sidebar-nav">
          <div className="flex flex-col gap-0.5">
            {itemsWithIndices.map(({ item, index }) => {
              if (item.kind === "separator") {
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 0.3,
                      delay: 0.05 * index,
                    }}
                    className="h-px bg-border/60 mx-1 my-2"
                  />
                );
              }

              if (item.kind === "section") {
                return (
                  <NavSection
                    key={item.id}
                    section={item}
                    isAuthenticated={isAuthenticated}
                    startIndex={index}
                  />
                );
              }

              return null;
            })}
          </div>
        </LayoutGroup>
      </div>

      {/* Footer section */}
      <div className="flex flex-col gap-2">
        <div className="h-px bg-border" />
        <SocialFooter />
      </div>
    </nav>
  );
}

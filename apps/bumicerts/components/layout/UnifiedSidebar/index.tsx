"use client";

import { LayoutGroup } from "framer-motion";
import { useAtprotoStore } from "@/components/stores/atproto";
import { SidebarHeader } from "./SidebarHeader";
import { NavSection } from "./NavSection";
import { SocialFooter } from "./SocialFooter";
import { NAV_ITEMS } from "./data";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { links } from "@/lib/links";
import { LeafIcon, PlusIcon, SparkleIcon } from "lucide-react";
import { useMobileNav } from "@/hooks/useMobileNav";

/**
 * UnifiedSidebar
 *
 * Single sidebar component shared between (marketplace) and (manage) route groups.
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
  const closeMobileNav = useMobileNav((s) => s.setOpen);

  return (
    <nav className="w-[240px] h-full flex flex-col p-4 border-r border-border bg-foreground/3 relative">
      {/* Top section */}
      <div className="flex flex-col gap-1">
        {/* Header */}
        <SidebarHeader />

        {/* EXPLORE section */}
        <LayoutGroup id="unified-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            if (item.kind === "section" && item.id === "explore") {
              return (
                <NavSection
                  key={item.id}
                  section={item}
                  isAuthenticated={isAuthenticated}
                  startIndex={0}
                />
              );
            }
            return null;
          })}
        </LayoutGroup>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section */}
      <div className="flex flex-col gap-2">
        <div className="group flex flex-col w-full h-20 border border-border bg-background rounded-2xl p-1">
          <div className="flex-1 relative">
            <SparkleIcon
              className="absolute bottom-2 left-4 size-6 rotate-30 opacity-50 group-hover:opacity-30 group-hover:scale-130 text-primary transition-all duration-300 animate-spin-slow"
              fill="currentcolor"
              strokeWidth={0}
            />
            <SparkleIcon
              className="absolute bottom-1 left-12 size-3 rotate-60 opacity-30 group-hover:opacity-50 group-hover:scale-130 text-primary transition-all duration-300 animate-spin-slow"
              fill="currentcolor"
              strokeWidth={0}
            />
            <SparkleIcon
              className="absolute bottom-2 right-2 size-6 rotate-60 opacity-50 group-hover:opacity-30 group-hover:scale-130 text-primary transition-all duration-300 animate-spin-slow"
              fill="currentcolor"
              strokeWidth={0}
            />
            <SparkleIcon
              className="absolute bottom-1 right-10 size-3 rotate-30 opacity-30 group-hover:opacity-50 group-hover:scale-130 text-primary transition-all duration-300 animate-spin-slow"
              fill="currentcolor"
              strokeWidth={0}
            />
            <div className="absolute z-1 -bottom-4 left-1/2 -translate-x-1/2 scale-100 group-hover:scale-120 -rotate-12 group-hover:-rotate-30 transition-transform bg-background/50 backdrop-blur-lg border border-border shadow-xl rounded-xl h-20 w-16 p-1 flex flex-col gap-1">
              <div className="w-full h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <LeafIcon className="text-primary size-6 opacity-80" />
              </div>
              <div className="bg-muted h-2 rounded-lg w-8"></div>
              <div className="bg-muted h-2 rounded-lg w-full"></div>
            </div>
          </div>
          <Button
            className="relative z-2 w-full bg-background hover:bg-primary hover:text-primary-foreground"
            variant={"outline"}
            size={"sm"}
            asChild
          >
            <Link
              href={links.bumicert.create}
              onClick={() => closeMobileNav(false)}
            >
              <PlusIcon /> Create a Bumicert
            </Link>
          </Button>
        </div>
        {/* MANAGE section */}
        <LayoutGroup id="unified-sidebar-nav-manage">
          {NAV_ITEMS.map((item) => {
            if (item.kind === "section" && item.id === "manage") {
              return (
                <NavSection
                  key={item.id}
                  section={item}
                  isAuthenticated={isAuthenticated}
                  startIndex={0}
                />
              );
            }
            return null;
          })}
        </LayoutGroup>

        <div className="h-px bg-border" />
        <SocialFooter />
      </div>
    </nav>
  );
}

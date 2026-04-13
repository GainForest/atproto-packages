"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NavLeaf } from "./NavLeaf";
import { SignInPrompt } from "./SignInPrompt";
import type { NavSection as NavSectionType } from "./data";

interface NavSectionProps {
  section: NavSectionType;
  isAuthenticated: boolean;
  startIndex: number;
}

function isLeafActive(
  pathCheck: { equals?: string; startsWith?: string },
  pathname: string
): boolean {
  if (pathCheck.equals) return pathname === pathCheck.equals;
  if (pathCheck.startsWith) return pathname.startsWith(pathCheck.startsWith);
  return false;
}

export function NavSection({ section, isAuthenticated, startIndex }: NavSectionProps) {
  const pathname = usePathname();

  // If section requires auth and user is not authenticated, show sign-in prompt
  if (section.requiresAuth && !isAuthenticated) {
    return (
      <div className="flex flex-col gap-2">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.3,
            delay: 0.05 * startIndex,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="px-3 py-1"
        >
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
            {section.label}
          </span>
        </motion.div>

        {/* Sign-in prompt */}
        <SignInPrompt />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Section label */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          duration: 0.3,
          delay: 0.05 * startIndex,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        className="px-3 py-1"
      >
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
          {section.label}
        </span>
      </motion.div>

      {/* Section items */}
      <ul className="flex flex-col gap-0.5">
        {section.items.map((item, idx) => {
          const isActive = isLeafActive(item.pathCheck, pathname);
          return (
            <NavLeaf
              key={item.id}
              item={item}
              isActive={isActive}
              index={startIndex + idx + 1}
            />
          );
        })}
      </ul>
    </div>
  );
}

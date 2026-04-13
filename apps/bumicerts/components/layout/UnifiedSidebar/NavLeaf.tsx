"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMobileNav } from "@/hooks/useMobileNav";
import type { NavLeaf as NavLeafType } from "./data";

interface NavLeafProps {
  item: NavLeafType;
  isActive: boolean;
  index: number;
}

export function NavLeaf({ item, isActive, index }: NavLeafProps) {
  const closeMobileNav = useMobileNav((s) => s.setOpen);

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.3,
        delay: 0.05 * index,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <Link
        href={item.href}
        onClick={() => closeMobileNav(false)}
        className="block relative"
      >
        <motion.div
          whileHover={{ x: 2 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 relative",
            isActive
              ? "bg-primary text-primary-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          {isActive && (
            <motion.div
              layoutId="active-nav-pill"
              className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary-foreground/50 rounded-full"
            />
          )}
          <item.Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{item.text}</span>
        </motion.div>
      </Link>
    </motion.li>
  );
}

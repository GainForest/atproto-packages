"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { UPLOAD_NAV_ITEMS } from "./data";

export function UploadMobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background/90 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around py-2 px-4">
        {UPLOAD_NAV_ITEMS.map((item) => {
          const isActive =
            item.pathCheck.equals
              ? pathname === item.pathCheck.equals
              : item.pathCheck.startsWith
                ? pathname.startsWith(item.pathCheck.startsWith)
                : false;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="upload-mobile-nav-bg"
                    className="absolute -inset-1 bg-primary/10 rounded-lg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.Icon className="h-5 w-5 relative z-10" />
              </motion.div>
              <span className="text-[10px] font-medium">{item.text}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

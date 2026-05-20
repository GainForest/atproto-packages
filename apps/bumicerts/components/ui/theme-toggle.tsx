"use client";

import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { SunIcon, MoonIcon } from "lucide-react";
import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const RIPPLE_DURATION_MS = 1200;

type ThemeName = "dark" | "light";

function getRippleGeometry(originX: number, originY: number) {
  const farthestX = Math.max(originX, window.innerWidth - originX);
  const farthestY = Math.max(originY, window.innerHeight - originY);
  const radius = Math.ceil(Math.hypot(farthestX, farthestY));

  return { originX, originY, radius };
}

function getEventOrigin(event: MouseEvent<HTMLButtonElement>) {
  if (event.detail > 0) {
    return { originX: event.clientX, originY: event.clientY };
  }

  const rect = event.currentTarget.getBoundingClientRect();

  return {
    originX: rect.left + rect.width / 2,
    originY: rect.top + rect.height / 2,
  };
}

function shouldReduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function runThemeTransition(origin: { originX: number; originY: number }, updateTheme: () => void) {
  if (shouldReduceMotion() || !document.startViewTransition) {
    updateTheme();
    return;
  }

  const { originX, originY, radius } = getRippleGeometry(origin.originX, origin.originY);

  document.documentElement.style.setProperty("--theme-ripple-x", `${originX}px`);
  document.documentElement.style.setProperty("--theme-ripple-y", `${originY}px`);

  const transition = document.startViewTransition(updateTheme);

  transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${originX}px ${originY}px)`,
          `circle(0px at ${originX}px ${originY}px)`,
          `circle(${radius}px at ${originX}px ${originY}px)`,
        ],
        offset: [0, 0.06, 1],
      },
      {
        duration: RIPPLE_DURATION_MS,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  });
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const t = useTranslations("common.theme");

  function handleToggleTheme(event: MouseEvent<HTMLButtonElement>) {
    const targetTheme: ThemeName = isDark ? "light" : "dark";

    runThemeTransition(getEventOrigin(event), () => setTheme(targetTheme));
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={handleToggleTheme}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
        className,
      )}
      aria-label={t("toggle")}
      suppressHydrationWarning
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <MoonIcon className="h-4 w-4" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <SunIcon className="h-4 w-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

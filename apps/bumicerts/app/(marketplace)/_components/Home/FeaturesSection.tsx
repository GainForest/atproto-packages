"use client";

import { motion } from "framer-motion";
import { LeafIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const FEATURE_KEYS = ["verified", "direct", "transparent"] as const;

export function FeaturesSection() {
  const t = useTranslations("landing.features");

  return (
    <section className="px-6 pb-0 pt-3 sm:px-12 md:px-6 md:pb-6 md:pt-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-5 flex items-center gap-2"
        >
          <LeafIcon className="size-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {t("eyebrow")}
          </span>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
          {FEATURE_KEYS.map((featureKey, index) => (
            <motion.div
              key={featureKey}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.08 + 0.08,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className={cn(
                "sm:px-5",
                index === 0 && "sm:pl-0",
                index > 0 && "sm:border-l sm:border-border/80",
                index === FEATURE_KEYS.length - 1 && "sm:pr-0",
              )}
            >
              <span className="block font-garamond text-5xl font-light leading-none tracking-tight text-primary/45">
                {t(`items.${featureKey}.number`)}.
              </span>

              <h3 className="mt-4 font-instrument text-lg leading-tight text-foreground">
                {t(`items.${featureKey}.title`)}
              </h3>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t(`items.${featureKey}.description`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

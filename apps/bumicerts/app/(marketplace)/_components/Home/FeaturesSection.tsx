"use client";

import { motion } from "framer-motion";
import { LeafIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    number: "01",
    title: "Verified environmental impact",
    description:
      "Every certificate is backed by photos, geolocation data, and community verification.",
  },
  {
    number: "02",
    title: "Direct community funding",
    description:
      "Your support goes straight to the stewards doing on-ground restoration work.",
  },
  {
    number: "03",
    title: "Decentralized & transparent",
    description:
      "Built on open, decentralized infrastructure. Every action is recorded, traceable, and permanent.",
  },
];

export function FeaturesSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-16 flex items-center gap-2"
        >
          <LeafIcon className="size-4 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            About Us
          </span>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.number}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.08 + 0.08,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className={cn(
                "md:px-6",
                index === 0 && "md:pl-0",
                index > 0 && "md:border-l md:border-border/80",
                index === FEATURES.length - 1 && "md:pr-0",
              )}
            >
              <span className="block font-garamond text-5xl font-light leading-none tracking-tight text-primary/45">
                {feature.number}.
              </span>

              <h3 className="mt-4 font-instrument text-[15px] leading-snug text-foreground">
                {feature.title}
              </h3>

              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

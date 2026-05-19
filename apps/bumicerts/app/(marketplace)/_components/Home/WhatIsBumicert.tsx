"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LeafIcon } from "lucide-react";
import { useState } from "react";
import { BumicertCardVisual } from "@/components/bumicert/BumicertCard";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getHomeCopy } from "@/lib/i18n/translations";

type FaqItem = ReturnType<typeof getHomeCopy>["certificate"]["faqItems"][number];

function AccordionItem({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="group flex w-full cursor-pointer items-center justify-between gap-4 py-3 text-left"
      >
        <div className="flex items-center gap-4">
          <span className="font-garamond text-2xl font-light text-primary/45">
            0{index + 1}
          </span>
          <span className="font-instrument text-base leading-snug text-foreground transition-colors duration-200 group-hover:text-primary">
            {item.question}
          </span>
        </div>
        <span className="shrink-0 text-base text-muted-foreground transition-colors group-hover:text-foreground">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <p className="max-w-lg pb-4 pl-11 text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WhatIsBumicert() {
  const [openItem, setOpenItem] = useState<string>("1");
  const { language } = useLanguage();
  const copy = getHomeCopy(language).certificate;

  return (
    <section className="px-6 pb-6 pt-4 sm:px-12 md:px-6 md:pb-10 md:pt-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-8 sm:grid-cols-2 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="mb-4 flex items-center gap-2 text-primary">
              <LeafIcon className="size-4" />
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                {copy.eyebrow}
              </span>
            </div>

            <h2 className="mb-5 font-garamond text-4xl font-light leading-[1.04] tracking-[-0.015em] text-foreground md:text-5xl">
              {copy.titleLine1}
              <br />
              <span className="font-instrument italic text-foreground">
                {copy.titleLine2}
              </span>
            </h2>

            <div>
              {copy.faqItems.map((item, index) => (
                <AccordionItem
                  key={item.id}
                  item={item}
                  isOpen={openItem === item.id}
                  onToggle={() =>
                    setOpenItem((prev) => (prev === item.id ? "" : item.id))
                  }
                  index={index}
                />
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex justify-center sm:justify-end"
          >
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-0 scale-90 rounded-3xl bg-primary/10 blur-3xl" />
              <BumicertCardVisual
                className="relative shadow-xl shadow-foreground/10 [&_h3]:text-xl [&_h3]:leading-tight [&_p]:text-sm [&_p]:leading-relaxed"
                logoUrl="/assets/media/images/gainforest-logo.svg"
                coverImage="/assets/media/images/landing/certificate-river.jpg"
                title={copy.previewTitle}
                description={copy.previewDescription}
                organizationName="Bumicerts"
                objectives={copy.objectives}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { CameraIcon, LeafIcon, MapPinIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { getHomeCopy } from "@/lib/i18n/translations";
import { links } from "@/lib/links";

export function Hero() {
  const { language } = useLanguage();
  const copy = getHomeCopy(language).hero;

  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-background">
      <div className="absolute inset-y-0 right-0 w-full overflow-hidden">
        <motion.div
          initial={{ scale: 1.04, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          <Image
            src="/assets/media/images/landing/hero-rainforest.jpg"
            alt={copy.imageAlt}
            fill
            priority
            sizes="(min-width: 768px) 58vw, 100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-linear-to-t md:bg-linear-to-r from-background via-background/75 to-transparent" />
        </motion.div>
      </div>

      <div className="relative z-10 flex flex-1 items-center px-6 pb-32 pt-24 md:px-12">
        <div className="mt-12 mx-auto grid w-full max-w-6xl items-center gap-10">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-[620px] flex flex-col items-center md:items-start text-center md:text-left"
          >
            <h1 className="font-garamond text-5xl font-medium leading-[1.08] tracking-[-0.02em] text-foreground md:text-7xl">
              <span className="relative inline-block">{copy.headingLine1}</span>
              <br />
              <span className="relative inline-block">{copy.headingLine2}</span>
              <br />
              <span className="font-instrument italic text-primary dark:brightness-150">
                <span className="relative inline-block">
                  {copy.headingEmphasis1}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 178 16"
                    className="absolute -bottom-2 left-0 h-4 w-full text-primary"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M3 10.5C44 6.5 87 6 175 8.5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="2.25"
                    />
                  </svg>
                </span>{" "}
                {copy.headingEmphasis2}
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.65,
                delay: 0.38,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="mt-6 max-w-[500px] leading-relaxed text-foreground/80 md:mt-8 text-lg md:text-xl"
            >
              {copy.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                delay: 0.56,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="mt-8"
            >
              <Link
                href={links.explore}
                className="inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                {copy.cta}
                <motion.span
                  className="inline-block"
                  animate={{ x: [0, 3, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  →
                </motion.span>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                delay: 0.68,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="mt-14 flex flex-wrap items-center justify-center gap-x-7 gap-y-4 text-sm text-foreground/75 md:justify-start"
            >
              <span className="inline-flex items-center gap-3">
                <LeafIcon className="size-6 stroke-[1.5]" />
                {copy.proofPoints[0]}
              </span>
              <span className="hidden h-8 w-px bg-foreground/20 sm:block" />
              <span className="inline-flex items-center gap-3">
                <CameraIcon className="size-6 stroke-[1.5]" />
                {copy.proofPoints[1]}
              </span>
              <span className="hidden h-8 w-px bg-foreground/20 sm:block" />
              <span className="inline-flex items-center gap-3">
                <MapPinIcon className="size-6 stroke-[1.5]" />
                {copy.proofPoints[2]}
              </span>
            </motion.div>
          </motion.div>
          <div aria-hidden="true" className="hidden md:block" />
        </div>
      </div>
    </section>
  );
}

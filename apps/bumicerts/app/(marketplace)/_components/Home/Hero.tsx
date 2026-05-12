"use client";

import { motion } from "framer-motion";
import { ArrowDownIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { links } from "@/lib/links";

export function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ scale: 1.04, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
        >
          <Image
            src="/assets/media/images/landing/hero-rainforest.png"
            alt="Misty rainforest valley"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/10 to-background/0 mix-blend-soft-light" />
        </motion.div>

        <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-background via-background/80 to-background/0" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-32 pt-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="font-garamond text-4xl font-light leading-[1.1] tracking-[-0.02em] text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Verified Impact{" "}
            <span className="mx-1 inline-flex items-center align-middle">
              <motion.span
                initial={{ scale: 0, rotate: -120 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  duration: 0.55,
                  delay: 0.65,
                  type: "spring",
                  stiffness: 180,
                  damping: 16,
                }}
                className="inline-block"
              >
                <Image
                  src="/assets/media/images/app-icon.png"
                  alt="Bumicerts"
                  width={42}
                  height={42}
                  className="size-10 drop-shadow-lg sm:size-12 md:size-14"
                />
              </motion.span>
            </span>{" "}
            Starts
            <br />
            <span className="font-instrument italic text-primary">
              With Real Communities
            </span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/80 sm:text-lg md:mt-8 md:text-xl"
        >
          Fund regenerative projects directly. Every Bumicert is a verified
          record of real environmental work — backed by photos, locations, and
          community stewards.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.56, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-8"
        >
          <Button asChild className="h-12 px-6 shadow-lg shadow-primary/20">
            <Link href={links.explore}>
              Explore Projects
              <motion.span
                className="inline-block"
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                →
              </motion.span>
            </Link>
          </Button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-primary/70"
        >
          <span className="text-[10px] font-medium uppercase tracking-[0.22em]">
            Scroll
          </span>
          <ArrowDownIcon className="size-3.5" />
        </motion.div>
      </motion.div>
    </section>
  );
}

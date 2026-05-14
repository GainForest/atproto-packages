"use client";

import { motion } from "framer-motion";
import { ArrowUpRightIcon, LeafIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { links } from "@/lib/links";

const OPTION_CARDS = [
  {
    href: links.explore,
    image: "/assets/media/images/landing/supporter-river.jpg",
    alt: "River winding through rainforest",
    label: "For Funders",
    title: "I want to support",
    emphasis: "a project",
    description:
      "Browse verified certificates and fund the exact moment of restoration.",
    cta: "Explore Bumicerts",
  },
  {
    href: links.bumicert.create,
    image: "/assets/media/images/landing/steward-waterfall.jpg",
    alt: "Waterfall in a tropical forest",
    label: "For Organizations",
    title: "I am a nature",
    emphasis: "steward",
    description:
      "Showcase your regenerative work and connect with funders who care.",
    cta: "Create a Bumicert",
  },
];

export function UserOptionCards() {
  return (
    <section className="px-6 pb-6 pt-0 sm:px-12 md:px-6 md:pb-10 md:pt-2">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-6 text-center md:mb-8"
        >
          <div className="mb-4 flex items-center justify-center gap-3 text-primary/60">
            <span className="h-px w-8 bg-border" />
            <LeafIcon className="size-4" />
            <span className="h-px w-8 bg-border" />
          </div>
          <h2 className="font-garamond text-4xl font-light tracking-[-0.01em] text-foreground md:text-5xl">
            Choose Your Path
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
            Whether you&apos;re here to fund impact or showcase your work, there&apos;s a
            place for you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {OPTION_CARDS.map((card, index) => (
            <motion.div
              key={card.href}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.08 + 0.08,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <Link href={card.href} className="group block">
                <div className="relative h-[320px] overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-foreground/5 transition-all duration-500 hover:border-primary/20 hover:shadow-xl sm:h-[360px]">
                  <Image
                    src={card.image}
                    alt={card.alt}
                    fill
                    sizes="(min-width: 640px) 50vw, calc(100vw - 3rem)"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/88 to-card/0" />
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                    <span className="inline-flex rounded-full bg-background/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-primary shadow-sm backdrop-blur">
                      {card.label}
                    </span>
                    <h3 className="mt-4 font-garamond text-4xl font-light leading-[1.05] tracking-[-0.015em] text-foreground">
                      {card.title}
                      <br />
                      <span className="font-instrument italic text-primary">
                        {card.emphasis}
                      </span>
                    </h3>
                    <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
                      {card.description}
                    </p>

                    <motion.div
                      className="mt-5 flex items-center gap-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary"
                      whileHover={{ x: 4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      {card.cta}
                      <ArrowUpRightIcon className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </motion.div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

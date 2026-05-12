"use client";

import { motion } from "framer-motion";
import { LeafIcon, QuoteIcon } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "Funding through Bumicerts feels different. I can see the proof, meet the stewards, and know my support creates real change.",
    name: "Aisha Rahman",
    role: "Donor",
    initials: "AR",
  },
  {
    quote:
      "The platform helps us tell our story honestly. Our work is recognized, our community benefits, and the impact is visible.",
    name: "Carlos Mendez",
    role: "Steward",
    initials: "CM",
  },
  {
    quote:
      "Transparency builds trust. Bumicerts gives our partners the confidence to keep investing in our communities.",
    name: "Maya Sari",
    role: "Community Partner",
    initials: "MS",
  },
];

export function TestimonialsSection() {
  return (
    <section className="px-6 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-10 text-center"
        >
          <div className="mb-3 flex items-center justify-center gap-2 text-primary">
            <LeafIcon className="size-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
              Voices from the community
            </span>
          </div>
          <h2 className="font-garamond text-3xl font-light tracking-[-0.015em] text-foreground sm:text-4xl">
            What our community says
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.article
              key={testimonial.name}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.08 + 0.08,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="rounded-xl border border-border bg-card/80 p-6 shadow-sm"
            >
              <QuoteIcon className="size-5 fill-primary/30 text-primary/30" />
              <p className="mt-4 font-instrument text-[13px] italic leading-relaxed text-foreground">
                {testimonial.quote}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <div aria-hidden="true" className="mt-5 flex justify-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="size-1.5 rounded-full bg-border" />
          <span className="size-1.5 rounded-full bg-border" />
          <span className="size-1.5 rounded-full bg-border" />
          <span className="size-1.5 rounded-full bg-border" />
        </div>
      </div>
    </section>
  );
}

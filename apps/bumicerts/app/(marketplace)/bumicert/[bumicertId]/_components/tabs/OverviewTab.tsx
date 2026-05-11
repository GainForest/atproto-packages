"use client";

import { motion } from "framer-motion";
import { UsersIcon } from "lucide-react";
import type { BumicertData } from "@/lib/types";
import { LeafletRenderer } from "@/components/ui/leaflet-renderer";
import { UserChip } from "@/components/ui/user-chip";

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function OverviewTab({ bumicert }: { bumicert: BumicertData }) {
  const hasDescription = bumicert.description.blocks.length > 0;

  return (
    <motion.div
      key="overview"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-1"
    >
      {hasDescription ? (
        <LeafletRenderer
          document={bumicert.description}
          ownerDid={bumicert.organizationDid}
        />
      ) : (
        <p className="text-base leading-relaxed text-muted-foreground">
          No description provided.
        </p>
      )}

      {bumicert.contributors.length > 0 && (
        <div className="mt-6">
          <div className="mb-5 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <SectionLabel icon={UsersIcon} label="Contributors" />
          <div className="flex flex-col gap-1">
            {bumicert.contributors.map((contributor, index) => {
              const isDid = contributor.identity.startsWith("did:");

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.06,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                  className="flex items-center gap-3 border-b border-border/60 py-2 last:border-0"
                >
                  {isDid ? (
                    <UserChip
                      did={contributor.identity}
                      avatarSize={24}
                      showCopyButton="hover"
                      linkMode="user-page"
                      className="border !border-transparent hover:!border-border"
                    />
                  ) : (
                    <>
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                        <span
                          className="text-xs font-medium text-muted-foreground"
                          style={{ fontFamily: "var(--font-garamond-var)" }}
                        >
                          {contributor.identity.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-foreground/80">
                        {contributor.identity}
                      </span>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

"use client";

import Container from "@/components/ui/container";

/**
 * Loading skeleton for the profile edit page.
 */
export function ProfileEditSkeleton() {
  return (
    <Container className="pt-4 pb-8 space-y-4">
      {/* Hero skeleton */}
      <div className="relative min-h-[260px] md:min-h-[320px] flex flex-col overflow-hidden rounded-2xl border border-border animate-pulse">
        <div className="absolute inset-0 bg-muted" />
        <div className="relative z-10 flex-1 flex flex-col justify-end px-5 pb-6 pt-24">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-muted-foreground/10" />
              <div className="h-8 w-48 bg-muted-foreground/10 rounded" />
            </div>
            <div className="h-4 w-80 bg-muted-foreground/10 rounded" />
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-muted-foreground/10 rounded-full" />
              <div className="h-6 w-24 bg-muted-foreground/10 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}

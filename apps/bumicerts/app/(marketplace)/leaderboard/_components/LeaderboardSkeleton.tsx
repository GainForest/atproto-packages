import { Skeleton } from "@/components/ui/skeleton";

export function LeaderboardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl bg-card/70 shadow-sm shadow-primary/5 ring-1 ring-foreground/5 divide-y divide-border/60">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-4 sm:gap-5 sm:px-5"
        >
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-44 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <div className="text-right">
            <Skeleton className="ml-auto h-5 w-28" />
          </div>
          <Skeleton className="size-9 rounded-full" />
        </div>
      ))}
    </div>
  );
}

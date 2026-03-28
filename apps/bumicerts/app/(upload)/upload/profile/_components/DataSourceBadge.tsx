"use client";

/**
 * DataSourceBadge — Small pill indicating where a profile field's data comes from.
 *
 * Shown next to each field label in both view and edit modes to indicate
 * whether the value is:
 *   - From the certified profile (stored on ATProto, user-editable)
 *   - Imported from Bluesky (read from the public Bluesky API, not stored)
 */

import { cn } from "@/lib/utils";

interface DataSourceBadgeProps {
  /** True when the field value was imported from Bluesky (no certified override) */
  fromBluesky: boolean;
  className?: string;
}

export function DataSourceBadge({ fromBluesky, className }: DataSourceBadgeProps) {
  if (fromBluesky) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.1em] font-medium rounded-full px-2 py-0.5",
          "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
          className,
        )}
        title="This value was imported from your Bluesky profile. Edit your certified profile to override it."
      >
        <svg viewBox="0 0 64 57" className="h-2.5 w-2.5 shrink-0" fill="currentColor" aria-hidden="true">
          <path d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805ZM50.127 3.805C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.578-6.732-13.873-2.745Z" />
        </svg>
        Bluesky
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.1em] font-medium rounded-full px-2 py-0.5",
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
        className,
      )}
      title="This value is stored in your certified profile."
    >
      Certified
    </span>
  );
}

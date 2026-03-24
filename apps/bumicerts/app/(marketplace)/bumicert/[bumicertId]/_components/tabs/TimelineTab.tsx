"use client";

import { motion } from "framer-motion";
import { ClockIcon, FileTextIcon, ExternalLinkIcon } from "lucide-react";
import { queries, type AttachmentItem } from "@/lib/graphql/queries";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format ISO datetime string to a readable date (e.g. "Mar 2026"). */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Map a raw contentType string to a display label.
 * Falls back to the raw value (capitalised) for unknown types.
 */
function contentTypeLabel(raw: string | null | undefined): string {
  if (!raw) return "Attachment";
  const map: Record<string, string> = {
    report: "Report",
    audit: "Audit",
    evidence: "Evidence",
    testimonial: "Testimonial",
    methodology: "Methodology",
    photo: "Photo",
    video: "Video",
    dataset: "Dataset",
    certificate: "Certificate",
  };
  return map[raw.toLowerCase()] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-0">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-4">
          {/* Spine */}
          <div className="flex flex-col items-center w-8 shrink-0">
            <div className="mt-1 h-3 w-3 rounded-full bg-border shrink-0" />
            {i < 2 && <div className="w-px flex-1 bg-border/50 mt-1" />}
          </div>
          {/* Card */}
          <div className="flex-1 pb-8">
            <div className="border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function TimelineEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
      <ClockIcon className="h-9 w-9 opacity-30" />
      <p className="text-sm font-medium">No evidence uploaded yet</p>
      <p className="text-xs max-w-xs leading-relaxed">
        Evidence reports, audits, and field notes published by this organisation
        will appear here.
      </p>
    </div>
  );
}

// ── Timeline entry card ───────────────────────────────────────────────────────

interface EntryProps {
  item: AttachmentItem;
  isLast: boolean;
  index: number;
}

function TimelineEntry({ item, isLast, index }: EntryProps) {
  const { metadata, creatorInfo, record } = item;

  const date = formatDate(record?.createdAt ?? metadata?.createdAt);
  const label = contentTypeLabel(record?.contentType);
  const title = record?.title ?? "Untitled";
  const description = record?.shortDescription;
  const orgName = creatorInfo?.organizationName;
  const logoUri = creatorInfo?.organizationLogo?.uri;

  // Extract content links — `record.content` is JSON (array of { uri } or { blob })
  const contentLinks: string[] = [];
  if (Array.isArray(record?.content)) {
    for (const item of record.content as unknown[]) {
      if (item && typeof item === "object" && "uri" in item && typeof (item as { uri: unknown }).uri === "string") {
        contentLinks.push((item as { uri: string }).uri);
      }
    }
  }

  return (
    <motion.div
      className="flex gap-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.07,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {/* Spine: dot + vertical line */}
      <div className="flex flex-col items-center w-8 shrink-0">
        <div className="mt-[18px] h-2.5 w-2.5 rounded-full bg-primary/60 ring-2 ring-primary/20 shrink-0" />
        {!isLast && <div className="w-px flex-1 bg-border/60 mt-1.5" />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-8">
        <div className="border border-border rounded-2xl p-4 transition-all duration-300 hover:shadow-md hover:border-primary/20">
          {/* Top row: badge + date */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-[0.08em] text-foreground/60 bg-muted/60 border border-border/50 rounded-full px-2.5 py-1 font-medium">
              {label}
            </span>
            {date && (
              <span className="text-xs text-muted-foreground">{date}</span>
            )}
          </div>

          {/* Title */}
          <h3
            className="text-base font-medium text-foreground leading-snug mb-1"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            {title}
          </h3>

          {/* Short description */}
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {description}
            </p>
          )}

          {/* Content links */}
          {contentLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {contentLinks.map((href, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <FileTextIcon className="h-3 w-3" />
                  <span>View file {contentLinks.length > 1 ? i + 1 : ""}</span>
                  <ExternalLinkIcon className="h-3 w-3 opacity-60" />
                </a>
              ))}
            </div>
          )}

          {/* Separator + org attribution */}
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-3" />
          <div className="flex items-center gap-2">
            {logoUri ? (
              <div className="relative h-5 w-5 rounded-full overflow-hidden border border-border shrink-0">
                <Image
                  src={logoUri}
                  alt={orgName ?? ""}
                  fill
                  className="object-cover"
                  sizes="20px"
                />
              </div>
            ) : (
              <div className="h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                <span className="text-[9px] font-medium text-muted-foreground">
                  {orgName?.charAt(0).toUpperCase() ?? "?"}
                </span>
              </div>
            )}
            {orgName && (
              <span className="text-xs text-muted-foreground">{orgName}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface TimelineTabProps {
  /** The organisation DID — used to fetch all their context.attachment records. */
  organizationDid: string;
  /** The AT-URI of this bumicert activity — used to filter attachments client-side. */
  activityUri: string;
}

export function TimelineTab({ organizationDid, activityUri }: TimelineTabProps) {
  const { data, isLoading } = queries.attachments.useQuery({ did: organizationDid });

  // Filter client-side to only attachments whose subjects include this activity
  const entries = (data ?? []).filter((item) =>
    item.record?.subjects?.some((s) => s.uri === activityUri)
  );

  return (
    <motion.div
      key="timeline"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-1 max-w-2xl"
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-6">
        <ClockIcon className="h-4 w-4 text-primary" />
        <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
          Evidence Timeline
        </span>
      </div>

      {isLoading ? (
        <TimelineSkeleton />
      ) : entries.length === 0 ? (
        <TimelineEmpty />
      ) : (
        <div className="flex flex-col gap-0">
          {entries.map((item, i) => (
            <TimelineEntry
              key={item.metadata?.uri ?? i}
              item={item}
              isLast={i === entries.length - 1}
              index={i}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

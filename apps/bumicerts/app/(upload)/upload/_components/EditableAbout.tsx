"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FileTextIcon } from "lucide-react";
import { useUploadDashboardStore } from "./store";
import type { OrganizationData } from "@/lib/types";

interface EditableAboutProps {
  organization: OrganizationData;
}

/**
 * Displays the long-form "About" section.
 *
 * - View mode: renders paragraphs (same as OrgAbout in marketplace).
 * - Edit mode: a plain auto-growing textarea that buffers changes in the store.
 *
 * We intentionally use a plain `<textarea>` rather than a rich text editor here —
 * the mutations package expects a plain string for longDescription and the
 * existing adapter (`extractLinearDocument`) already strips to plaintext anyway.
 */
export function EditableAbout({ organization }: EditableAboutProps) {
  const isEditing = useUploadDashboardStore((s) => s.isEditing);
  const edits = useUploadDashboardStore((s) => s.edits);
  const setEdit = useUploadDashboardStore((s) => s.setEdit);

  const longDescription = edits.longDescription ?? organization.longDescription;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [longDescription, isEditing]);

  if (!isEditing && !longDescription) return null;

  if (isEditing) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="py-4"
      >
        {/* Section label */}
        <div className="flex items-center gap-2 mb-3">
          <FileTextIcon className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
            About
          </span>
        </div>

        <textarea
          ref={textareaRef}
          value={longDescription}
          onChange={(e) =>
            setEdit("longDescription", e.target.value || null)
          }
          placeholder="Tell the world about your organisation — its mission, history, and the work you do…"
          rows={4}
          className="w-full resize-none bg-muted/30 rounded-xl border border-border px-4 py-3 text-base leading-relaxed text-foreground/80 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors overflow-hidden"
        />
      </motion.section>
    );
  }

  // View mode
  const paragraphs = longDescription
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <section className="py-6 md:py-8">
      {paragraphs.map((para, i) => (
        <p
          key={i}
          className="text-base leading-relaxed text-foreground/80 mb-4 last:mb-0"
        >
          {para}
        </p>
      ))}
    </section>
  );
}

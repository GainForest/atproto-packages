/**
 * Zod schemas for Leaflet lexicon types.
 *
 * These mirror the TypeScript interfaces in `../types/index.ts` and can be used
 * for runtime validation at API/form boundaries.
 *
 * Requires `zod` as a peer dependency.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Byte slice
// ─────────────────────────────────────────────────────────────────────────────

export const LeafletByteSliceSchema = z.object({
  byteStart: z.number().int().nonnegative(),
  byteEnd: z.number().int().nonnegative(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Facet features
// ─────────────────────────────────────────────────────────────────────────────

export const LeafletFacetFeatureSchema = z.discriminatedUnion("$type", [
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#bold") }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#italic") }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#code") }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#strikethrough") }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#underline") }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#highlight") }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#link"), uri: z.string() }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#didMention"), did: z.string() }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#atMention"), atURI: z.string() }),
  z.object({ $type: z.literal("pub.leaflet.richtext.facet#id"), id: z.string().optional() }),
]);

export const LeafletFacetSchema = z.object({
  index: LeafletByteSliceSchema,
  features: z.array(LeafletFacetFeatureSchema),
});

// ─────────────────────────────────────────────────────────────────────────────
// Blob reference
// ─────────────────────────────────────────────────────────────────────────────

export const LeafletBlobRefSchema = z.object({
  $type: z.literal("blob"),
  ref: z.union([z.object({ $link: z.string() }), z.string()]),
  mimeType: z.string(),
  size: z.number(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Block types
// ─────────────────────────────────────────────────────────────────────────────

export const LeafletTextBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.text"),
  plaintext: z.string(),
  facets: z.array(LeafletFacetSchema).optional(),
  textSize: z.enum(["default", "small", "large"]).optional(),
});

export const LeafletHeaderBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.header"),
  plaintext: z.string(),
  facets: z.array(LeafletFacetSchema).optional(),
  level: z.number().int().min(1).max(6).optional(),
});

export const LeafletImageBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.image"),
  image: LeafletBlobRefSchema,
  alt: z.string().optional(),
  aspectRatio: z.object({ width: z.number(), height: z.number() }).optional(),
});

export const LeafletBlockquoteBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.blockquote"),
  plaintext: z.string(),
  facets: z.array(LeafletFacetSchema).optional(),
});

export const LeafletCodeBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.code"),
  plaintext: z.string(),
  language: z.string().optional(),
  syntaxHighlightingTheme: z.string().optional(),
});

export const LeafletHorizontalRuleBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.horizontalRule"),
});

export const LeafletIframeBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.iframe"),
  url: z.string(),
  height: z.number().int().min(16).max(1600).optional(),
});

export const LeafletWebsiteBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.website"),
  src: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});

// Unordered list requires a lazy schema for recursive children.
// We explicitly annotate with the full TypeScript type to ensure the inferred
// type matches `LeafletListItem` exactly (z.lazy infers children as unknown[]).
import type { LeafletListItem } from "../types/index.js";

export const LeafletListItemSchema: z.ZodType<LeafletListItem> = z.object({
  $type: z.literal("pub.leaflet.blocks.unorderedList#listItem").optional(),
  content: z.union([
    LeafletTextBlockSchema,
    LeafletHeaderBlockSchema,
    LeafletImageBlockSchema,
  ]),
  children: z.array(z.lazy(() => LeafletListItemSchema)).optional(),
});

export const LeafletUnorderedListBlockSchema = z.object({
  $type: z.literal("pub.leaflet.blocks.unorderedList"),
  children: z.array(LeafletListItemSchema),
});

export const LeafletBlockSchema = z.discriminatedUnion("$type", [
  LeafletTextBlockSchema,
  LeafletHeaderBlockSchema,
  LeafletImageBlockSchema,
  LeafletBlockquoteBlockSchema,
  LeafletUnorderedListBlockSchema,
  LeafletCodeBlockSchema,
  LeafletHorizontalRuleBlockSchema,
  LeafletIframeBlockSchema,
  LeafletWebsiteBlockSchema,
]);

// ─────────────────────────────────────────────────────────────────────────────
// Block wrapper + alignment
// ─────────────────────────────────────────────────────────────────────────────

export const LeafletBlockAlignmentSchema = z.enum([
  "pub.leaflet.pages.linearDocument#textAlignLeft",
  "pub.leaflet.pages.linearDocument#textAlignCenter",
  "pub.leaflet.pages.linearDocument#textAlignRight",
  "pub.leaflet.pages.linearDocument#textAlignJustify",
]);

export const LeafletBlockWrapperSchema = z.object({
  $type: z.literal("pub.leaflet.pages.linearDocument#block").optional(),
  block: LeafletBlockSchema,
  alignment: LeafletBlockAlignmentSchema.optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Linear document  (pub.leaflet.pages.linearDocument)
// ─────────────────────────────────────────────────────────────────────────────

export const LeafletLinearDocumentSchema = z.object({
  $type: z.literal("pub.leaflet.pages.linearDocument").optional(),
  id: z.string().optional(),
  blocks: z.array(LeafletBlockWrapperSchema),
});

export type LeafletLinearDocumentInput = z.input<typeof LeafletLinearDocumentSchema>;

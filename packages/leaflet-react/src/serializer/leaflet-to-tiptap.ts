/**
 * Convert a LeafletLinearDocument to a TipTap JSONContent document.
 *
 * This is the "load" path: when opening existing content for editing, the
 * ATProto Leaflet record is converted into the TipTap JSON format that the
 * editor understands.
 */

import type { JSONContent } from "@tiptap/react";
import type {
  LeafletLinearDocument,
  LeafletFacet,
  LeafletFacetFeature,
  LeafletListItem,
} from "../types/index.js";
import { encoder, decoder } from "./byte-utils.js";
import { extractCid } from "../utils/blob-utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// Facet → TipTap marks
// ─────────────────────────────────────────────────────────────────────────────

interface MarkSpec {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TextSegment {
  text: string;
  marks: MarkSpec[];
}

function featureToMark(feature: LeafletFacetFeature): MarkSpec | null {
  switch (feature.$type) {
    case "pub.leaflet.richtext.facet#bold":
      return { type: "bold" };
    case "pub.leaflet.richtext.facet#italic":
      return { type: "italic" };
    case "pub.leaflet.richtext.facet#code":
      return { type: "code" };
    case "pub.leaflet.richtext.facet#strikethrough":
      return { type: "strike" };
    case "pub.leaflet.richtext.facet#underline":
      return { type: "underline" };
    case "pub.leaflet.richtext.facet#highlight":
      return { type: "highlight" };
    case "pub.leaflet.richtext.facet#link":
      return { type: "link", attrs: { href: feature.uri, target: "_blank" } };
    default:
      // Unknown feature types (didMention, atMention, id) are ignored
      return null;
  }
}

/**
 * Reconstruct TipTap inline content from plaintext + byte-indexed facets.
 *
 * Uses a sweep-line over all unique byte boundaries so that overlapping facets
 * are handled correctly. No text is ever lost regardless of how facets overlap.
 */
function facetsToInlineContent(
  plaintext: string,
  facets?: LeafletFacet[]
): JSONContent[] {
  if (!plaintext) return [];
  if (!facets || facets.length === 0) {
    return [{ type: "text", text: plaintext }];
  }

  const bytes = encoder.encode(plaintext);
  const totalBytes = bytes.length;

  // Collect all unique boundary points
  const boundarySet = new Set<number>([0, totalBytes]);
  for (const facet of facets) {
    boundarySet.add(Math.max(0, Math.min(facet.index.byteStart, totalBytes)));
    boundarySet.add(Math.max(0, Math.min(facet.index.byteEnd, totalBytes)));
  }
  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);

  const segments: TextSegment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const segStart = boundaries[i] ?? 0;
    const segEnd = boundaries[i + 1] ?? totalBytes;
    if (segStart >= segEnd) continue;

    const segText = decoder.decode(bytes.slice(segStart, segEnd));
    if (!segText) continue;

    // Collect marks from all facets that fully cover this sub-segment
    const marks: MarkSpec[] = [];
    const seenKeys = new Set<string>();
    for (const facet of facets) {
      const fs = Math.max(0, Math.min(facet.index.byteStart, totalBytes));
      const fe = Math.max(0, Math.min(facet.index.byteEnd, totalBytes));
      if (fs <= segStart && fe >= segEnd) {
        for (const feature of facet.features) {
          const mark = featureToMark(feature);
          if (mark === null) continue;
          const key =
            mark.type === "link"
              ? `link:${(mark.attrs as { href?: string } | undefined)?.href ?? ""}`
              : mark.type;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            marks.push(mark);
          }
        }
      }
    }

    segments.push({ text: segText, marks });
  }

  return segments.map((seg) => ({
    type: "text",
    text: seg.text,
    ...(seg.marks.length > 0 ? { marks: seg.marks } : {}),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// List item helpers
// ─────────────────────────────────────────────────────────────────────────────

function leafletListItemToTiptap(item: LeafletListItem): JSONContent {
  const content = item.content;
  const text =
    content.$type === "pub.leaflet.blocks.text" ||
    content.$type === "pub.leaflet.blocks.header"
      ? content.plaintext
      : "";
  const facets =
    content.$type === "pub.leaflet.blocks.text" ||
    content.$type === "pub.leaflet.blocks.header"
      ? content.facets
      : undefined;

  const tiptapChildren: JSONContent[] = [
    {
      type: "paragraph",
      content: facetsToInlineContent(text, facets),
    },
  ];

  if (item.children && item.children.length > 0) {
    tiptapChildren.push({
      type: "bulletList",
      content: item.children.map(leafletListItemToTiptap),
    });
  }

  return { type: "listItem", content: tiptapChildren };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a `LeafletLinearDocument` to a TipTap `JSONContent` document.
 *
 * @param doc                  - The Leaflet document to convert
 * @param resolveImageCid      - Optional function to resolve a CID to a display URL.
 *                               If omitted, image `src` will be set to the raw CID.
 *
 * @example
 * ```ts
 * const tiptapDoc = leafletToTiptap(leafletDoc, (cid) => buildBlobUrl(pdsUrl, did, cid));
 * editor.commands.setContent(tiptapDoc);
 * ```
 */
export function leafletToTiptap(
  doc: LeafletLinearDocument,
  resolveImageCid?: (cid: string) => string
): JSONContent {
  const content: JSONContent[] = [];

  for (const wrapper of doc.blocks) {
    const block = wrapper.block;

    switch (block.$type) {
      case "pub.leaflet.blocks.text": {
        content.push({
          type: "paragraph",
          content: facetsToInlineContent(block.plaintext, block.facets),
        });
        break;
      }

      case "pub.leaflet.blocks.header": {
        content.push({
          type: "heading",
          attrs: { level: block.level ?? 1 },
          content: facetsToInlineContent(block.plaintext, block.facets),
        });
        break;
      }

      case "pub.leaflet.blocks.image": {
        const cid = extractCid(block.image);
        if (!cid) break;
        const src = resolveImageCid ? resolveImageCid(cid) : cid;
        content.push({
          type: "image",
          attrs: {
            src,
            alt: block.alt ?? "",
            cid,
            mimeType: block.image.mimeType,
            size: block.image.size,
          },
        });
        break;
      }

      case "pub.leaflet.blocks.blockquote": {
        // Split on newlines → one <paragraph> per line inside the blockquote
        const lines = block.plaintext.split("\n");
        const bytes = encoder.encode(block.plaintext);
        const paragraphs: JSONContent[] = [];
        let byteOffset = 0;

        for (const lineText of lines) {
          const lineByteLen = encoder.encode(lineText).length;
          const lineByteEnd = byteOffset + lineByteLen;

          // Extract facets that overlap this line, clipping to line boundaries
          const lineFacets: LeafletFacet[] = [];
          for (const facet of block.facets ?? []) {
            const fs = facet.index.byteStart;
            const fe = facet.index.byteEnd;
            if (fs < lineByteEnd && fe > byteOffset) {
              const clippedStart = Math.max(fs, byteOffset) - byteOffset;
              const clippedEnd = Math.min(fe, lineByteEnd) - byteOffset;
              if (clippedStart < clippedEnd) {
                lineFacets.push({
                  ...facet,
                  index: { byteStart: clippedStart, byteEnd: clippedEnd },
                });
              }
            }
          }

          paragraphs.push({
            type: "paragraph",
            content: facetsToInlineContent(lineText, lineFacets),
          });

          byteOffset = lineByteEnd + 1; // +1 for \n
        }

        content.push({ type: "blockquote", content: paragraphs });
        // Suppress unused variable warning
        void bytes;
        break;
      }

      case "pub.leaflet.blocks.unorderedList": {
        if (block.children && block.children.length > 0) {
          content.push({
            type: "bulletList",
            content: block.children.map(leafletListItemToTiptap),
          });
        }
        break;
      }

      case "pub.leaflet.blocks.code": {
        content.push({
          type: "codeBlock",
          attrs: { language: block.language ?? null },
          content: [{ type: "text", text: block.plaintext }],
        });
        break;
      }

      case "pub.leaflet.blocks.horizontalRule": {
        content.push({ type: "horizontalRule" });
        break;
      }

      case "pub.leaflet.blocks.iframe": {
        const url = block.url;
        const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
        if (isYoutube) {
          content.push({ type: "youtube", attrs: { src: url } });
        } else {
          // Non-YouTube iframes: render as a link paragraph
          content.push({
            type: "paragraph",
            content: [
              {
                type: "text",
                text: url,
                marks: [{ type: "link", attrs: { href: url, target: "_blank" } }],
              },
            ],
          });
        }
        break;
      }

      case "pub.leaflet.blocks.website": {
        content.push({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: block.title ?? block.src,
              marks: [{ type: "link", attrs: { href: block.src, target: "_blank" } }],
            },
          ],
        });
        break;
      }

      default:
        break;
    }
  }

  // Always ensure at least one paragraph so TipTap has something to render
  if (content.length === 0) {
    content.push({ type: "paragraph" });
  }

  return { type: "doc", content };
}

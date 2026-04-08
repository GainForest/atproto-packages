/**
 * Convert a TipTap JSONContent document to a LeafletLinearDocument.
 *
 * This is the "save" path: when the user finishes editing, the TipTap JSON is
 * serialized into the ATProto Leaflet format ready to be written to the PDS.
 */

import type { JSONContent } from "@tiptap/react";
import type {
  LeafletLinearDocument,
  LeafletBlockWrapper,
  LeafletBlock,
  LeafletFacet,
  LeafletFacetFeature,
  LeafletListItem,
} from "../types/index.js";
import { encoder } from "./byte-utils.js";
import { extractYouTubeVideoId } from "../utils/youtube-utils.js";

// ─────────────────────────────────────────────────────────────────────────────
// Inline (mark) helpers
// ─────────────────────────────────────────────────────────────────────────────

interface InlineSegment {
  text: string;
  marks: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/** Flatten TipTap inline content nodes into flat segments with their marks. */
function flattenInlineContent(nodes: JSONContent[] | undefined): InlineSegment[] {
  if (!nodes) return [];
  const segments: InlineSegment[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      segments.push({
        text: node.text ?? "",
        marks: (node.marks ?? []) as Array<{ type: string; attrs?: Record<string, unknown> }>,
      });
    } else if (node.type === "hardBreak") {
      segments.push({ text: "\n", marks: [] });
    }
  }
  return segments;
}

/** Convert inline segments into plaintext + ATProto facets. */
function extractTextAndFacets(
  nodes: JSONContent[] | undefined
): { text: string; facets: LeafletFacet[] } {
  const segments = flattenInlineContent(nodes);
  let plaintext = "";
  const facets: LeafletFacet[] = [];

  for (const seg of segments) {
    if (!seg.text) continue;

    if (seg.marks.length > 0) {
      const byteStart = encoder.encode(plaintext).length;
      plaintext += seg.text;
      const byteEnd = encoder.encode(plaintext).length;

      const features: LeafletFacetFeature[] = [];
      for (const mark of seg.marks) {
        switch (mark.type) {
          case "bold":
            features.push({ $type: "pub.leaflet.richtext.facet#bold" });
            break;
          case "italic":
            features.push({ $type: "pub.leaflet.richtext.facet#italic" });
            break;
          case "code":
            features.push({ $type: "pub.leaflet.richtext.facet#code" });
            break;
          case "strike":
            features.push({ $type: "pub.leaflet.richtext.facet#strikethrough" });
            break;
          case "underline":
            features.push({ $type: "pub.leaflet.richtext.facet#underline" });
            break;
          case "highlight":
            features.push({ $type: "pub.leaflet.richtext.facet#highlight" });
            break;
          case "link": {
            const href =
              (mark.attrs?.href as string | undefined) ??
              (mark.attrs?.url as string | undefined) ??
              "";
            features.push({ $type: "pub.leaflet.richtext.facet#link", uri: href });
            break;
          }
          // Unknown marks are silently ignored — their text is still included.
        }
      }

      if (features.length > 0) {
        facets.push({ index: { byteStart, byteEnd }, features });
      }
    } else {
      plaintext += seg.text;
    }
  }

  return { text: plaintext, facets };
}

// ─────────────────────────────────────────────────────────────────────────────
// List item helpers
// ─────────────────────────────────────────────────────────────────────────────

function listItemToLeaflet(item: JSONContent): LeafletListItem {
  const nodeChildren = item.content ?? [];
  let text = "";
  let facets: LeafletFacet[] = [];
  const nestedChildren: LeafletListItem[] = [];

  for (const child of nodeChildren) {
    if (child.type === "paragraph") {
      const extracted = extractTextAndFacets(child.content);
      text = extracted.text;
      facets = extracted.facets;
    } else if (child.type === "bulletList") {
      for (const nested of child.content ?? []) {
        nestedChildren.push(listItemToLeaflet(nested));
      }
    }
  }

  const contentBlock = {
    $type: "pub.leaflet.blocks.text" as const,
    plaintext: text,
    ...(facets.length > 0 ? { facets } : {}),
  };

  const result: LeafletListItem = {
    $type: "pub.leaflet.blocks.unorderedList#listItem",
    content: contentBlock,
  };
  if (nestedChildren.length > 0) result.children = nestedChildren;
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Infer MIME type from URL extension (used when explicit mimeType is absent)
// ─────────────────────────────────────────────────────────────────────────────

function inferMimeType(url: string): string {
  const lower = url.toLowerCase().split("?")[0] ?? "";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "image/jpeg";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a TipTap JSONContent document to a `LeafletLinearDocument`.
 *
 * @example
 * ```ts
 * const leafletDoc = tiptapToLeaflet(editor.getJSON());
 * // Save leafletDoc to ATProto PDS
 * ```
 */
export function tiptapToLeaflet(doc: JSONContent): LeafletLinearDocument {
  const blocks: LeafletBlockWrapper[] = [];
  const topLevel = doc.content ?? [];

  for (const node of topLevel) {
    let block: LeafletBlock | null = null;

    switch (node.type) {
      case "paragraph": {
        const { text, facets } = extractTextAndFacets(node.content);
        block = {
          $type: "pub.leaflet.blocks.text",
          plaintext: text,
          ...(facets.length > 0 ? { facets } : {}),
        };
        break;
      }

      case "heading": {
        const level = (node.attrs?.level as number | undefined) ?? 1;
        const { text, facets } = extractTextAndFacets(node.content);
        block = {
          $type: "pub.leaflet.blocks.header",
          plaintext: text,
          level,
          ...(facets.length > 0 ? { facets } : {}),
        };
        break;
      }

      case "image": {
        const src = (node.attrs?.src as string | undefined) ?? "";
        const alt = (node.attrs?.alt as string | undefined) ?? "";
        const cid = (node.attrs?.cid as string | undefined) ?? "";
        const attrMimeType = node.attrs?.mimeType as string | undefined;
        const attrSize = node.attrs?.size as number | undefined;
        const mimeType = attrMimeType ?? inferMimeType(src);
        const size = attrSize ?? 0;

        block = {
          $type: "pub.leaflet.blocks.image",
          image: {
            $type: "blob",
            // Use a direct CID string so ATProto lex validators accept this as BlobRef.
            ref: cid || src,
            mimeType,
            size,
          },
          alt,
          aspectRatio: { width: 800, height: 600 },
        };
        break;
      }

      case "blockquote": {
        // Flatten all paragraphs, joining with \n
        const paragraphs = (node.content ?? []).filter((n) => n.type === "paragraph");
        const parts: string[] = [];
        const allFacets: LeafletFacet[] = [];
        let byteOffset = 0;

        for (let i = 0; i < paragraphs.length; i++) {
          const para = paragraphs[i];
          if (!para) continue;
          const { text, facets } = extractTextAndFacets(para.content);

          // Shift facet offsets to account for earlier paragraphs
          for (const facet of facets) {
            allFacets.push({
              ...facet,
              index: {
                byteStart: facet.index.byteStart + byteOffset,
                byteEnd: facet.index.byteEnd + byteOffset,
              },
            });
          }

          parts.push(text);
          byteOffset += encoder.encode(text).length;
          if (i < paragraphs.length - 1) byteOffset += 1; // \n separator
        }

        block = {
          $type: "pub.leaflet.blocks.blockquote",
          plaintext: parts.join("\n"),
          ...(allFacets.length > 0 ? { facets: allFacets } : {}),
        };
        break;
      }

      case "bulletList": {
        const children = (node.content ?? []).map(listItemToLeaflet);
        block = {
          $type: "pub.leaflet.blocks.unorderedList",
          children,
        };
        break;
      }

      case "codeBlock": {
        const lang = (node.attrs?.language as string | undefined) ?? undefined;
        const codeText = (node.content ?? [])
          .filter((n) => n.type === "text")
          .map((n) => n.text ?? "")
          .join("");
        block = {
          $type: "pub.leaflet.blocks.code",
          plaintext: codeText,
          ...(lang ? { language: lang } : {}),
        };
        break;
      }

      case "horizontalRule": {
        block = { $type: "pub.leaflet.blocks.horizontalRule" };
        break;
      }

      case "youtube": {
        const src = (node.attrs?.src as string | undefined) ?? "";
        // Normalise to canonical watch URL for stable storage
        const videoId = extractYouTubeVideoId(src);
        const canonicalUrl = videoId
          ? `https://www.youtube.com/watch?v=${videoId}`
          : src;
        block = { $type: "pub.leaflet.blocks.iframe", url: canonicalUrl };
        break;
      }

      default:
        break;
    }

    if (block) {
      blocks.push({
        $type: "pub.leaflet.pages.linearDocument#block",
        block,
      });
    }
  }

  return {
    $type: "pub.leaflet.pages.linearDocument",
    blocks,
  };
}

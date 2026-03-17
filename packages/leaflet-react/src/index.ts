/**
 * @gainforest/leaflet-react
 *
 * React components and utilities for rendering and editing
 * `pub.leaflet.pages.linearDocument` rich text in ATProto applications.
 *
 * ─── Quick start ──────────────────────────────────────────────────────────
 *
 * Readonly viewer:
 * ```tsx
 * import { LeafletRenderer } from "@gainforest/leaflet-react";
 * import "@gainforest/leaflet-react/editor.css";
 *
 * <LeafletRenderer
 *   document={leafletDoc}
 *   resolveImageUrl={(cid) => buildBlobUrl(pdsUrl, did, cid)}
 * />
 * ```
 *
 * WYSIWYG editor:
 * ```tsx
 * import { LeafletEditor } from "@gainforest/leaflet-react";
 * import "@gainforest/leaflet-react/editor.css";
 *
 * <LeafletEditor
 *   content={leafletDoc}
 *   onChange={setLeafletDoc}
 *   onImageUpload={async (file) => {
 *     const blobRef = await uploadBlob(agent, file);
 *     return { cid: blobRef.ref.$link, url: URL.createObjectURL(file) };
 *   }}
 *   resolveImageUrl={(cid) => buildBlobUrl(pdsUrl, did, cid)}
 * />
 * ```
 *
 * Serializer (format conversion):
 * ```ts
 * import { tiptapToLeaflet, leafletToTiptap } from "@gainforest/leaflet-react/serializer";
 * ```
 *
 * Utilities:
 * ```ts
 * import { extractCid, buildBlobUrl } from "@gainforest/leaflet-react/utils";
 * ```
 */

// ── Components ────────────────────────────────────────────────────────────────
export { default as LeafletRenderer } from "./renderer/leaflet-renderer.js";
export type { LeafletRendererProps } from "./renderer/leaflet-renderer.js";

export { LeafletEditor } from "./editor/leaflet-editor.js";
export type { LeafletEditorProps } from "./editor/leaflet-editor.js";

export { EditorToolbar } from "./editor/editor-toolbar.js";
export type { EditorToolbarProps } from "./editor/editor-toolbar.js";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  // Document structure
  LeafletLinearDocument,
  LeafletBlockWrapper,
  LeafletBlockAlignment,
  // Block types
  LeafletBlock,
  LeafletTextBlock,
  LeafletHeaderBlock,
  LeafletImageBlock,
  LeafletBlockquoteBlock,
  LeafletUnorderedListBlock,
  LeafletCodeBlock,
  LeafletHorizontalRuleBlock,
  LeafletIframeBlock,
  LeafletWebsiteBlock,
  // Rich text facets
  LeafletFacet,
  LeafletFacetFeature,
  LeafletByteSlice,
  // List items
  LeafletListItem,
  // Blob
  LeafletBlobRef,
  // Helpers
  ImageUploadResult,
} from "./types/index.js";

// ── Serializer ────────────────────────────────────────────────────────────────
export { tiptapToLeaflet, leafletToTiptap } from "./serializer/index.js";
export { byteOffsetAt, charIndexAtByteOffset } from "./serializer/index.js";

// ── Utilities ─────────────────────────────────────────────────────────────────
export { extractCid, buildBlobUrl, extractBlobImageUrl } from "./utils/index.js";
export { toYouTubeEmbedUrl, extractYouTubeVideoId } from "./utils/index.js";

// ── Inline renderer helper ────────────────────────────────────────────────────
export { renderFacetedText } from "./renderer/index.js";

// ── Schemas (requires zod peer dependency) ────────────────────────────────────
export {
  LeafletLinearDocumentSchema,
  LeafletBlockSchema,
  LeafletBlockWrapperSchema,
  LeafletFacetSchema,
  LeafletFacetFeatureSchema,
  LeafletByteSliceSchema,
  LeafletTextBlockSchema,
  LeafletHeaderBlockSchema,
  LeafletImageBlockSchema,
  LeafletBlockquoteBlockSchema,
  LeafletCodeBlockSchema,
  LeafletHorizontalRuleBlockSchema,
  LeafletIframeBlockSchema,
  LeafletWebsiteBlockSchema,
  LeafletUnorderedListBlockSchema,
  LeafletBlockAlignmentSchema,
  LeafletBlobRefSchema,
} from "./schemas/index.js";
export type { LeafletLinearDocumentInput } from "./schemas/index.js";

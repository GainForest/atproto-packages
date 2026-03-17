/**
 * LeafletRenderer — readonly display component for pub.leaflet.pages.linearDocument.
 *
 * Usage:
 * ```tsx
 * import { LeafletRenderer } from "@gainforest/leaflet-react/renderer";
 *
 * <LeafletRenderer
 *   document={linearDocument}
 *   resolveImageUrl={(cid) => `https://my-pds.example/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`}
 * />
 * ```
 */

import React from "react";
import type {
  LeafletLinearDocument,
  LeafletBlock,
  LeafletListItem,
} from "../types/index.js";
import { extractBlobImageUrl } from "../utils/blob-utils.js";
import { toYouTubeEmbedUrl } from "../utils/youtube-utils.js";
import { renderFacetedText } from "./facet-renderer.js";

// ─────────────────────────────────────────────────────────────────────────────
// List item renderer
// ─────────────────────────────────────────────────────────────────────────────

function renderListItem(
  item: LeafletListItem,
  resolveImageUrl: (cid: string) => string,
  index: number
): React.ReactNode {
  const content = item.content;
  let itemContent: React.ReactNode = null;

  if (
    content.$type === "pub.leaflet.blocks.text" ||
    content.$type === "pub.leaflet.blocks.header"
  ) {
    itemContent = renderFacetedText(content.plaintext, content.facets);
  } else if (content.$type === "pub.leaflet.blocks.image") {
    const src = extractBlobImageUrl(content.image, resolveImageUrl);
    if (src) {
      itemContent = (
        <img
          src={src}
          alt={content.alt ?? ""}
          className="leaflet-list-image"
        />
      );
    }
  }

  return (
    <li key={index}>
      {itemContent}
      {item.children && item.children.length > 0 && (
        <ul className="leaflet-list">
          {item.children.map((child, ci) =>
            renderListItem(child, resolveImageUrl, ci)
          )}
        </ul>
      )}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Block renderer
// ─────────────────────────────────────────────────────────────────────────────

function renderBlock(
  block: LeafletBlock,
  resolveImageUrl: (cid: string) => string,
  index: number
): React.ReactNode {
  switch (block.$type) {
    case "pub.leaflet.blocks.text": {
      return (
        <p key={index} className="leaflet-text">
          {renderFacetedText(block.plaintext, block.facets)}
        </p>
      );
    }

    case "pub.leaflet.blocks.header": {
      const level = block.level ?? 1;
      const content = renderFacetedText(block.plaintext, block.facets);
      const cls = `leaflet-heading leaflet-h${level}`;
      switch (level) {
        case 1: return <h1 key={index} className={cls}>{content}</h1>;
        case 2: return <h2 key={index} className={cls}>{content}</h2>;
        case 3: return <h3 key={index} className={cls}>{content}</h3>;
        case 4: return <h4 key={index} className={cls}>{content}</h4>;
        case 5: return <h5 key={index} className={cls}>{content}</h5>;
        default: return <h6 key={index} className={cls}>{content}</h6>;
      }
    }

    case "pub.leaflet.blocks.image": {
      const src = extractBlobImageUrl(block.image, resolveImageUrl);
      if (!src) return null;

      return (
        <div key={index} className="leaflet-image-wrapper">
          <img
            src={src}
            alt={block.alt ?? ""}
            className="leaflet-image"
          />
        </div>
      );
    }

    case "pub.leaflet.blocks.blockquote": {
      return (
        <blockquote key={index} className="leaflet-blockquote">
          {renderFacetedText(block.plaintext, block.facets)}
        </blockquote>
      );
    }

    case "pub.leaflet.blocks.unorderedList": {
      if (!block.children || block.children.length === 0) return null;
      return (
        <ul key={index} className="leaflet-list">
          {block.children.map((item, ci) =>
            renderListItem(item, resolveImageUrl, ci)
          )}
        </ul>
      );
    }

    case "pub.leaflet.blocks.code": {
      const lang = block.language;
      return (
        <pre
          key={index}
          className={`leaflet-code-block${lang ? ` language-${lang}` : ""}`}
        >
          <code>{block.plaintext}</code>
        </pre>
      );
    }

    case "pub.leaflet.blocks.horizontalRule": {
      return <hr key={index} className="leaflet-hr" />;
    }

    case "pub.leaflet.blocks.iframe": {
      const embedUrl = toYouTubeEmbedUrl(block.url) ?? block.url;

      if (block.height) {
        return (
          <div key={index} className="leaflet-iframe-wrapper" style={{ height: block.height }}>
            <iframe
              src={embedUrl}
              className="leaflet-iframe"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              allowFullScreen
              title="Embedded content"
            />
          </div>
        );
      }

      // Responsive 16:9 aspect ratio
      return (
        <div
          key={index}
          className="leaflet-iframe-wrapper leaflet-iframe-responsive"
        >
          <iframe
            src={embedUrl}
            className="leaflet-iframe"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            allowFullScreen
            title="Embedded content"
          />
        </div>
      );
    }

    case "pub.leaflet.blocks.website": {
      return (
        <div key={index} className="leaflet-website-card">
          <a
            href={block.src}
            target="_blank"
            rel="noopener noreferrer"
            className="leaflet-website-card__link"
          >
            {block.title && (
              <p className="leaflet-website-card__title">{block.title}</p>
            )}
            {block.description && (
              <p className="leaflet-website-card__description">
                {block.description}
              </p>
            )}
            <p className="leaflet-website-card__url">{block.src}</p>
          </a>
        </div>
      );
    }

    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export interface LeafletRendererProps {
  /** The document to render. */
  document: LeafletLinearDocument;
  /**
   * Resolve a blob CID to a displayable URL.
   *
   * @example
   * ```ts
   * resolveImageUrl={(cid) => buildBlobUrl(pdsUrl, did, cid)}
   * ```
   */
  resolveImageUrl: (cid: string) => string;
  /** Additional CSS class added to the wrapper `<div>`. */
  className?: string;
}

/**
 * LeafletRenderer renders a `LeafletLinearDocument` as readonly HTML.
 *
 * It handles all supported block types and byte-indexed facets for inline
 * formatting (bold, italic, links, code, strikethrough, underline, highlight).
 */
const LeafletRenderer: React.FC<LeafletRendererProps> = ({
  document,
  resolveImageUrl,
  className = "",
}) => {
  if (!document?.blocks?.length) return null;

  return (
    <div className={`leaflet-renderer${className ? ` ${className}` : ""}`}>
      {document.blocks.map((wrapper, index) =>
        renderBlock(wrapper.block, resolveImageUrl, index)
      )}
    </div>
  );
};

export default LeafletRenderer;

/**
 * Renders a string of plaintext with ATProto facets as React nodes.
 *
 * Facets use UTF-8 byte offsets (not character offsets), so all slicing is
 * performed on a Uint8Array rather than on the raw JS string.
 */

import React from "react";
import type { LeafletFacet } from "../types/index.js";
import { encoder, decoder, clampToCharBoundary } from "../serializer/byte-utils.js";

/**
 * Render `plaintext` with inline formatting described by `facets`.
 *
 * Returns an array of React nodes suitable for use inside any block element.
 */
export function renderFacetedText(
  plaintext: string,
  facets?: LeafletFacet[]
): React.ReactNode[] {
  if (!plaintext) return [];
  if (!facets || facets.length === 0) return [plaintext];

  const bytes = encoder.encode(plaintext);
  const totalBytes = bytes.length;

  // Sort facets by byteStart ascending
  const sorted = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let nodeIndex = 0;

  for (let i = 0; i < sorted.length; i++) {
    const facet = sorted[i];
    if (!facet) continue;

    const byteStart = clampToCharBoundary(bytes, facet.index.byteStart);
    const byteEnd = clampToCharBoundary(bytes, facet.index.byteEnd);

    // Gap text before this facet
    if (cursor < byteStart) {
      const gapBytes = bytes.slice(
        clampToCharBoundary(bytes, cursor),
        clampToCharBoundary(bytes, byteStart)
      );
      const gapText = decoder.decode(gapBytes);
      if (gapText) {
        nodes.push(
          <React.Fragment key={`gap-${nodeIndex++}`}>{gapText}</React.Fragment>
        );
      }
    }

    // Faceted segment
    const start = clampToCharBoundary(bytes, Math.max(cursor, byteStart));
    const end = clampToCharBoundary(bytes, Math.min(byteEnd, totalBytes));

    if (start < end) {
      const facetText = decoder.decode(bytes.slice(start, end));

      if (facetText) {
        const facetKey = nodeIndex++;
        let node: React.ReactNode = facetText;

        // Apply features in reverse (innermost first)
        const reversedFeatures = [...facet.features].reverse();
        for (let fi = 0; fi < reversedFeatures.length; fi++) {
          const feature = reversedFeatures[fi];
          if (!feature) continue;
          const featureKey = `f${facetKey}-${fi}`;

          switch (feature.$type) {
            case "pub.leaflet.richtext.facet#bold":
              node = <strong key={featureKey}>{node}</strong>;
              break;
            case "pub.leaflet.richtext.facet#italic":
              node = <em key={featureKey}>{node}</em>;
              break;
            case "pub.leaflet.richtext.facet#code":
              node = (
                <code
                  key={featureKey}
                  className="leaflet-inline-code"
                >
                  {node}
                </code>
              );
              break;
            case "pub.leaflet.richtext.facet#strikethrough":
              node = <del key={featureKey}>{node}</del>;
              break;
            case "pub.leaflet.richtext.facet#underline":
              node = <u key={featureKey}>{node}</u>;
              break;
            case "pub.leaflet.richtext.facet#highlight":
              node = (
                <mark key={featureKey} className="leaflet-highlight">
                  {node}
                </mark>
              );
              break;
            case "pub.leaflet.richtext.facet#link":
              node = (
                <a
                  key={featureKey}
                  href={feature.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="leaflet-link"
                >
                  {node}
                </a>
              );
              break;
            default:
              break;
          }
        }

        nodes.push(
          <React.Fragment key={`seg-${facetKey}`}>{node}</React.Fragment>
        );
      }
    }

    cursor = Math.max(cursor, byteEnd);
  }

  // Remaining text after the last facet
  if (cursor < totalBytes) {
    const remainingBytes = bytes.slice(clampToCharBoundary(bytes, cursor));
    const remainingText = decoder.decode(remainingBytes);
    if (remainingText) {
      nodes.push(
        <React.Fragment key={`tail-${nodeIndex++}`}>{remainingText}</React.Fragment>
      );
    }
  }

  return nodes;
}

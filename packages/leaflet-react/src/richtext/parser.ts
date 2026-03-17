/**
 * Richtext parser — converts `{ text, facets }` into an ordered array of
 * `RichTextSegment` objects.
 */

import type { Facet, FacetFeature, RichTextRecord, RichTextSegment } from './types'
import { sliceByByteOffset, utf8ByteLength } from './utf8'

function sortFacets(facets: Facet[]): Facet[] {
  return [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart)
}

function pickFeature(features: FacetFeature[]): FacetFeature | undefined {
  return features[0]
}

export function parseRichText(record: RichTextRecord): RichTextSegment[] {
  const { text, facets } = record

  if (!facets || facets.length === 0) {
    return [{ text }]
  }

  const textByteLength = utf8ByteLength(text)
  const sorted = sortFacets(facets)
  const segments: RichTextSegment[] = []

  let cursor = 0

  for (const facet of sorted) {
    const { byteStart, byteEnd } = facet.index

    if (byteStart < cursor || byteEnd > textByteLength || byteStart >= byteEnd) {
      continue
    }

    if (byteStart > cursor) {
      segments.push({ text: sliceByByteOffset(text, cursor, byteStart) })
    }

    const feature = pickFeature(facet.features)
    const segment: RichTextSegment = { text: sliceByByteOffset(text, byteStart, byteEnd) }
    if (feature !== undefined) segment.feature = feature
    segments.push(segment)

    cursor = byteEnd
  }

  if (cursor < textByteLength) {
    segments.push({ text: sliceByByteOffset(text, cursor, textByteLength) })
  }

  return segments
}

/**
 * TypeScript types mirroring the `app.bsky.richtext.facet` lexicon.
 *
 * Reimplemented inside @gainforest/leaflet-react to avoid a separate package
 * dependency and to ensure TipTap version consistency (v2.27.2 throughout).
 */

// ─── Byte Slice ──────────────────────────────────────────────────────────────

/**
 * Byte range within UTF-8-encoded text.
 * byteStart is inclusive, byteEnd is exclusive.
 */
export interface ByteSlice {
  byteStart: number
  byteEnd: number
}

// ─── Facet Features ──────────────────────────────────────────────────────────

export interface MentionFeature {
  $type: 'app.bsky.richtext.facet#mention'
  did: string
}

export interface LinkFeature {
  $type: 'app.bsky.richtext.facet#link'
  uri: string
}

export interface TagFeature {
  $type: 'app.bsky.richtext.facet#tag'
  tag: string
}

export type FacetFeature = MentionFeature | LinkFeature | TagFeature

// ─── Facet ───────────────────────────────────────────────────────────────────

export interface Facet {
  index: ByteSlice
  features: FacetFeature[]
}

// ─── RichText Record ─────────────────────────────────────────────────────────

export interface RichTextRecord {
  text: string
  facets?: Facet[]
}

// ─── Segment ─────────────────────────────────────────────────────────────────

export interface RichTextSegment {
  text: string
  feature?: FacetFeature
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isMentionFeature(feature: FacetFeature): feature is MentionFeature {
  return feature.$type === 'app.bsky.richtext.facet#mention'
}

export function isLinkFeature(feature: FacetFeature): feature is LinkFeature {
  return feature.$type === 'app.bsky.richtext.facet#link'
}

export function isTagFeature(feature: FacetFeature): feature is TagFeature {
  return feature.$type === 'app.bsky.richtext.facet#tag'
}

// ─── ClassNames types ─────────────────────────────────────────────────────────

export interface RichTextDisplayClassNames {
  root?: string
  mention?: string
  link?: string
  tag?: string
}

export interface RichTextSuggestionClassNames {
  root?: string
  item?: string
  itemSelected?: string
  avatar?: string
  avatarImg?: string
  avatarPlaceholder?: string
  text?: string
  name?: string
  handle?: string
  empty?: string
}

export interface RichTextEditorClassNames {
  root?: string
  content?: string
  placeholder?: string
  mention?: string
  link?: string
  /** CSS class applied to #hashtag decorations in the editor. */
  tag?: string
  suggestion?: RichTextSuggestionClassNames
}

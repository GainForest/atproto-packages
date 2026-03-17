/**
 * @gainforest/leaflet-react/richtext
 *
 * React components for rendering and editing Bluesky richtext (app.bsky.richtext.facet lexicon).
 *
 * Implemented inside leaflet-react to share the same TipTap v2.27.2 instance
 * and avoid version mismatches.
 */

export { RichTextDisplay } from './RichTextDisplay'
export type {
  RichTextDisplayProps,
  MentionProps,
  LinkProps,
  TagProps,
} from './RichTextDisplay'

export { RichTextEditor } from './RichTextEditor'
export type {
  RichTextEditorProps,
  RichTextEditorRef,
  MentionSuggestion,
} from './RichTextEditor'

export { MentionSuggestionList } from './MentionSuggestionList'
export type {
  MentionSuggestionListProps,
  MentionSuggestionListRef,
} from './MentionSuggestionList'

export { createDefaultSuggestionRenderer } from './createSuggestionRenderer'
export type { DefaultSuggestionRendererOptions } from './createSuggestionRenderer'

export type {
  ByteSlice,
  Facet,
  FacetFeature,
  MentionFeature,
  LinkFeature,
  TagFeature,
  RichTextRecord,
  RichTextSegment,
  RichTextDisplayClassNames,
  RichTextEditorClassNames,
  RichTextSuggestionClassNames,
} from './types'

export { isMentionFeature, isLinkFeature, isTagFeature } from './types'

export { parseRichText } from './parser'

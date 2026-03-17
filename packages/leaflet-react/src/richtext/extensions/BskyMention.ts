/**
 * TipTap Mention extension configured for Bluesky @handle autocomplete.
 * Uses @tiptap/extension-mention (v2.27.2) and @tiptap/suggestion (v2.27.2).
 */

import { Mention } from '@tiptap/extension-mention'
import type { SuggestionOptions } from '@tiptap/suggestion'
import type { MentionSuggestion } from '../RichTextEditor'
import { createDefaultSuggestionRenderer } from '../createSuggestionRenderer'
import type { DefaultSuggestionRendererOptions } from '../createSuggestionRenderer'

export interface BskyMentionOptions {
  onMentionQuery: (query: string) => Promise<MentionSuggestion[]>
  renderSuggestionList?: SuggestionOptions['render']
  defaultRendererOptions?: DefaultSuggestionRendererOptions
  mentionClass?: string
}

export function createBskyMentionExtension({
  onMentionQuery,
  renderSuggestionList,
  defaultRendererOptions,
  mentionClass = 'bsky-mention',
}: BskyMentionOptions) {
  const render = renderSuggestionList ?? createDefaultSuggestionRenderer(defaultRendererOptions)

  return Mention.configure({
    HTMLAttributes: { class: mentionClass },

    renderLabel({ options, node }) {
      const handle =
        (node.attrs['label'] as string | undefined) ??
        (node.attrs['id'] as string | undefined) ??
        ''
      return `${options.suggestion.char ?? '@'}${handle}`
    },

    suggestion: {
      char: '@',
      allowSpaces: false,
      startOfLine: false,

      items: async ({ query }) => {
        if (!query) return []
        try {
          const results = await onMentionQuery(query)
          return results.slice(0, 8)
        } catch {
          return []
        }
      },

      ...(render !== undefined ? { render } : {}),
    },
  })
}

"use client"

/**
 * RichTextEditor — TipTap-based editor for composing AT Protocol richtext.
 *
 * Built on TipTap v2.27.2 (same version as the rest of leaflet-react).
 * Avoids the @tiptap/core version mismatch that a separate package would cause.
 *
 * Features:
 *  - @mention autocomplete (Bluesky public API by default)
 *  - Automatic URL decoration (link facets detected on change)
 *  - Hard-break (Shift+Enter) for line breaks inside a paragraph
 *  - Undo/redo history
 *  - onChange emits RichTextRecord (text + facets via detectFacetsWithoutResolution)
 */

import {
  useEffect,
  useImperativeHandle,
  useMemo,
  type HTMLAttributes,
  type Ref,
} from 'react'
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { History } from '@tiptap/extension-history'
import { HardBreak } from '@tiptap/extension-hard-break'
import { Placeholder } from '@tiptap/extension-placeholder'
import type { SuggestionOptions } from '@tiptap/suggestion'
import { RichText as AtpRichText } from '@atproto/api'
import type { RichTextRecord, Facet, RichTextEditorClassNames } from './types'
import { createBskyMentionExtension } from './extensions/BskyMention'
import { BskyLinkDecorator } from './extensions/BskyLinkDecorator'
import { BskyTagDecorator } from './extensions/BskyTagDecorator'
import type { DefaultSuggestionRendererOptions } from './createSuggestionRenderer'

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface MentionSuggestion {
  did: string
  handle: string
  displayName?: string
  avatarUrl?: string
}

export interface RichTextEditorRef {
  focus: () => void
  blur: () => void
  clear: () => void
  getText: () => string
}

export interface RichTextEditorProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * Initial richtext value (uncontrolled — only read on mount).
   */
  initialValue?: RichTextRecord | string
  onChange?: (record: RichTextRecord) => void
  placeholder?: string
  onFocus?: () => void
  onBlur?: () => void
  /**
   * Custom mention query. When omitted, uses the Bluesky public API.
   */
  onMentionQuery?: (query: string) => Promise<MentionSuggestion[]>
  mentionSearchDebounceMs?: number
  disableDefaultMentionSearch?: boolean
  renderMentionSuggestion?: SuggestionOptions['render']
  mentionSuggestionOptions?: DefaultSuggestionRendererOptions
  classNames?: Partial<RichTextEditorClassNames>
  editorRef?: Ref<RichTextEditorRef>
  editable?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Convert a RichTextRecord/string to HTML for the editor's initial content.
 * Mention nodes become `<span data-type="mention" data-id="handle">`.
 */
function toInitialHTML(value: RichTextRecord | string | undefined): string {
  if (!value) return ''

  if (typeof value === 'string') {
    return `<p>${escapeHTML(value)}</p>`
  }

  const { text, facets } = value

  if (!facets?.length) {
    return `<p>${escapeHTML(text)}</p>`
  }

  // Use @atproto/api's RichText to iterate segments and handle byte offsets.
  // Cast via unknown: our Facet type is structurally identical to @atproto/api's
  // internal type but lacks the extra index signature it adds.
  const atpFacets = facets as unknown as AtpRichText['facets']
  const rt = new AtpRichText(atpFacets ? { text, facets: atpFacets } : { text })
  let html = ''

  for (const segment of rt.segments()) {
    if (segment.mention) {
      // BskyMention extension uses data-id as the handle (shown as @handle).
      // The segment text is "@handle" — strip the leading @ to get the handle.
      const handle = segment.text.startsWith('@') ? segment.text.slice(1) : segment.text
      html += `<span data-type="mention" data-id="${escapeHTML(handle)}"></span>`
    } else {
      html += escapeHTML(segment.text)
    }
  }

  // TipTap requires content inside a paragraph node.
  return `<p>${html}</p>`
}

/**
 * Convert TipTap's JSON document to a plain text string.
 */
function editorJsonToText(json: JSONContent, isLastDocumentChild = false): string {
  let text = ''

  if (json.type === 'doc') {
    if (json.content?.length) {
      for (let i = 0; i < json.content.length; i++) {
        const node = json.content[i]
        if (!node) continue
        text += editorJsonToText(node, i === json.content.length - 1)
      }
    }
  } else if (json.type === 'paragraph') {
    if (json.content?.length) {
      for (const node of json.content) {
        text += editorJsonToText(node)
      }
    }
    if (!isLastDocumentChild) text += '\n'
  } else if (json.type === 'hardBreak') {
    text += '\n'
  } else if (json.type === 'text') {
    text += json.text ?? ''
  } else if (json.type === 'mention') {
    text += `@${(json.attrs?.['id'] as string | undefined) ?? ''}`
  }

  return text
}

// ─── Debounced Bluesky search ─────────────────────────────────────────────────

const BSKY_SEARCH_API = 'https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors'

interface BskyActor { did: string; handle: string; displayName?: string; avatar?: string }

async function searchBskyActors(query: string, limit = 8): Promise<MentionSuggestion[]> {
  if (!query.trim()) return []
  try {
    const url = new URL(BSKY_SEARCH_API)
    url.searchParams.set('q', query.trim())
    url.searchParams.set('limit', String(limit))
    const res = await fetch(url.toString())
    if (!res.ok) return []
    const data = (await res.json()) as { actors?: BskyActor[] }
    return (data.actors ?? []).map((a) => ({
      did: a.did,
      handle: a.handle,
      ...(a.displayName !== undefined ? { displayName: a.displayName } : {}),
      ...(a.avatar !== undefined ? { avatarUrl: a.avatar } : {}),
    }))
  } catch {
    return []
  }
}

function createDebouncedSearch(delayMs = 300): (query: string) => Promise<MentionSuggestion[]> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const pendingResolvers: Array<(value: MentionSuggestion[]) => void> = []

  return (query: string): Promise<MentionSuggestion[]> => {
    return new Promise((resolve) => {
      pendingResolvers.push(resolve)
      if (timeoutId !== null) clearTimeout(timeoutId)
      timeoutId = setTimeout(async () => {
        timeoutId = null
        const results = await searchBskyActors(query)
        const toResolve = pendingResolvers.splice(0, pendingResolvers.length)
        for (const r of toResolve) r(results)
      }, delayMs)
    })
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RichTextEditor({
  initialValue,
  onChange,
  placeholder,
  onFocus,
  onBlur,
  onMentionQuery,
  mentionSearchDebounceMs = 300,
  disableDefaultMentionSearch = false,
  renderMentionSuggestion,
  mentionSuggestionOptions,
  classNames,
  editorRef,
  editable = true,
  ...divProps
}: RichTextEditorProps) {
  const debouncedSearch = useMemo(
    () => createDebouncedSearch(mentionSearchDebounceMs),
    [mentionSearchDebounceMs],
  )

  const mentionQuery = useMemo<(q: string) => Promise<MentionSuggestion[]>>(() => {
    if (onMentionQuery) return onMentionQuery
    if (disableDefaultMentionSearch) return () => Promise.resolve([])
    return debouncedSearch
  }, [onMentionQuery, disableDefaultMentionSearch, debouncedSearch])

  const linkClass = classNames?.link ?? 'autolink'
  const tagClass = classNames?.tag ?? 'bsky-tag'
  const mentionClass = classNames?.mention
  const suggestionClassNames = classNames?.suggestion

  const extensions = useMemo(
    () => [
      Document,
      Paragraph,
      Text,
      History,
      HardBreak,
      BskyLinkDecorator.configure({ linkClass }),
      BskyTagDecorator.configure({ tagClass }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      createBskyMentionExtension({
        onMentionQuery: mentionQuery,
        ...(mentionClass !== undefined ? { mentionClass } : {}),
        ...(renderMentionSuggestion !== undefined
          ? { renderSuggestionList: renderMentionSuggestion }
          : {}),
        ...(mentionSuggestionOptions !== undefined || suggestionClassNames !== undefined
          ? {
              defaultRendererOptions: {
                ...(mentionSuggestionOptions ?? {}),
                ...(suggestionClassNames !== undefined ? { classNames: suggestionClassNames } : {}),
              },
            }
          : {}),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      mentionQuery,
      placeholder,
      renderMentionSuggestion,
      mentionSuggestionOptions,
      linkClass,
      tagClass,
      mentionClass,
      JSON.stringify(suggestionClassNames),
    ],
  )

  const editor = useEditor(
    {
      extensions,
      editable,
      content: toInitialHTML(initialValue),
      immediatelyRender: false,
      coreExtensionOptions: {
        clipboardTextSerializer: { blockSeparator: '\n' },
      },
      editorProps: {
        handlePaste(view, event) {
          const clipboardData = event.clipboardData
          if (!clipboardData) return false
          if (clipboardData.types.includes('text/html')) {
            const plainText = clipboardData.getData('text/plain')
            view.pasteText(plainText)
            return true
          }
          return false
        },
      },
      onFocus() { onFocus?.() },
      onBlur() { onBlur?.() },
      onUpdate({ editor: ed }) {
        if (!onChange) return
        const json = ed.getJSON()
        const text = editorJsonToText(json)
        const rt = new AtpRichText({ text })
        rt.detectFacetsWithoutResolution()
        const record: RichTextRecord = {
          text: rt.text,
          ...(rt.facets?.length ? { facets: rt.facets as unknown as Facet[] } : {}),
        }
        onChange(record)
      },
    },
    [extensions],
  )

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  useImperativeHandle(
    editorRef,
    () => ({
      focus() { editor?.commands.focus() },
      blur() { editor?.commands.blur() },
      clear() { editor?.commands.clearContent(true) },
      getText() {
        if (!editor) return ''
        return editorJsonToText(editor.getJSON())
      },
    }),
    [editor],
  )

  return (
    <div className={classNames?.root} {...divProps}>
      <EditorContent editor={editor} className={classNames?.content} />
    </div>
  )
}

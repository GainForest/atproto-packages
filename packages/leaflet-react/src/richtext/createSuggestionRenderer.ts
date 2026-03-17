/**
 * Factory for the default TipTap suggestion renderer.
 * Uses @floating-ui/dom for positioning and ReactRenderer for the popup.
 */

import { computePosition, flip, offset, shift } from '@floating-ui/dom'
import { ReactRenderer } from '@tiptap/react'
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import type { RichTextSuggestionClassNames } from './types'
import {
  MentionSuggestionList,
  type MentionSuggestionListRef,
  type MentionSuggestionListProps,
} from './MentionSuggestionList'
import type { MentionSuggestion } from './RichTextEditor'

export interface DefaultSuggestionRendererOptions {
  showAvatars?: boolean
  noResultsText?: string
  classNames?: Partial<RichTextSuggestionClassNames>
}

export function createDefaultSuggestionRenderer(
  options: DefaultSuggestionRendererOptions = {},
): SuggestionOptions<MentionSuggestion>['render'] {
  return () => {
    let renderer: ReactRenderer<MentionSuggestionListRef, MentionSuggestionListProps> | undefined
    let popup: HTMLDivElement | undefined

    const buildProps = (props: SuggestionProps<MentionSuggestion>): MentionSuggestionListProps => ({
      ...props,
      showAvatars: options.showAvatars ?? true,
      noResultsText: options.noResultsText ?? 'No results',
      ...(options.classNames !== undefined ? { classNames: options.classNames } : {}),
    })

    return {
      onStart(props: SuggestionProps<MentionSuggestion>) {
        renderer = new ReactRenderer(MentionSuggestionList, {
          props: buildProps(props),
          editor: props.editor,
        })

        if (!props.clientRect) return

        const clientRect = props.clientRect

        popup = document.createElement('div')
        popup.style.position = 'fixed'
        popup.style.zIndex = '9999'
        popup.appendChild(renderer.element)
        document.body.appendChild(popup)

        const virtualEl = { getBoundingClientRect: () => clientRect?.() ?? new DOMRect() }

        void computePosition(virtualEl, popup, {
          placement: 'bottom-start',
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          if (popup) {
            popup.style.left = `${x}px`
            popup.style.top = `${y}px`
          }
        })
      },

      onUpdate(props: SuggestionProps<MentionSuggestion>) {
        renderer?.updateProps(buildProps(props))

        if (!props.clientRect || !popup) return

        const clientRect = props.clientRect
        const virtualEl = { getBoundingClientRect: () => clientRect?.() ?? new DOMRect() }

        void computePosition(virtualEl, popup, {
          placement: 'bottom-start',
          middleware: [offset(8), flip(), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          if (popup) {
            popup.style.left = `${x}px`
            popup.style.top = `${y}px`
          }
        })
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          if (popup) popup.style.display = 'none'
          return true
        }
        return renderer?.ref?.onKeyDown(props) ?? false
      },

      onExit() {
        popup?.remove()
        renderer?.destroy()
        popup = undefined
        renderer = undefined
      },
    }
  }
}

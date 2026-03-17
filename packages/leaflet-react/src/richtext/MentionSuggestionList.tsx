"use client"

/**
 * Default mention autocomplete dropdown for RichTextEditor.
 * Uses design tokens from the platform (CSS variables) for theming.
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion'
import type { RichTextSuggestionClassNames } from './types'
import type { MentionSuggestion } from './RichTextEditor'

export interface MentionSuggestionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

export interface MentionSuggestionListProps extends SuggestionProps<MentionSuggestion> {
  showAvatars?: boolean
  noResultsText?: string
  classNames?: Partial<RichTextSuggestionClassNames>
}

const defaultClassNames: RichTextSuggestionClassNames = {
  root: 'flex flex-col max-h-80 overflow-y-auto bg-[var(--card)] rounded-lg shadow-lg border border-[var(--border)] min-w-60',
  item: 'flex items-center gap-3 w-full px-3 py-2 text-left cursor-pointer border-none bg-transparent hover:bg-[var(--muted)] select-none text-[var(--foreground)]',
  itemSelected: 'bg-[var(--muted)]',
  avatar: 'flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-[var(--muted)] flex items-center justify-center',
  avatarImg: 'block w-full h-full object-cover',
  avatarPlaceholder: 'flex items-center justify-center w-full h-full text-[var(--muted-foreground)] font-medium text-xs',
  text: 'flex flex-col flex-1 min-w-0 overflow-hidden',
  name: 'block truncate font-medium text-sm',
  handle: 'block truncate text-xs text-[var(--muted-foreground)]',
  empty: 'block px-3 py-2 text-sm text-[var(--muted-foreground)]',
}

function cn(base?: string, extra?: string): string | undefined {
  if (!base && !extra) return undefined
  return [base, extra].filter(Boolean).join(' ')
}

export const MentionSuggestionList = forwardRef<MentionSuggestionListRef, MentionSuggestionListProps>(
  function MentionSuggestionListImpl(
    { items, command, showAvatars = true, noResultsText = 'No results', classNames: classNamesProp },
    ref,
  ) {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const merged: RichTextSuggestionClassNames = { ...defaultClassNames, ...classNamesProp }

    useEffect(() => { setSelectedIndex(0) }, [items])

    const selectItem = (index: number) => {
      const item = items[index]
      if (item) command({ id: item.handle })
    }

    useImperativeHandle(ref, () => ({
      onKeyDown({ event }: SuggestionKeyDownProps): boolean {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev + 1) % items.length)
          return true
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    return (
      <div className={merged.root} onMouseDown={(e) => e.preventDefault()}>
        {items.length === 0 ? (
          <div className={merged.empty}>{noResultsText}</div>
        ) : (
          items.map((item, index) => {
            const isSelected = index === selectedIndex
            return (
              <button
                key={item.did}
                type="button"
                className={isSelected ? cn(merged.item, merged.itemSelected) : merged.item}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => selectItem(index)}
              >
                {showAvatars && (
                  <span className={merged.avatar}>
                    {item.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.avatarUrl} alt={item.displayName ?? item.handle} className={merged.avatarImg} />
                    ) : (
                      <span className={merged.avatarPlaceholder} aria-hidden="true">
                        {(item.displayName ?? item.handle).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>
                )}
                <span className={merged.text}>
                  {item.displayName && <span className={merged.name}>{item.displayName}</span>}
                  <span className={merged.handle}>@{item.handle}</span>
                </span>
              </button>
            )
          })
        )}
      </div>
    )
  }
)

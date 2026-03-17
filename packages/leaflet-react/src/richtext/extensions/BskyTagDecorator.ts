/**
 * BskyTagDecorator — stateless hashtag decoration using ProseMirror DecorationSet.
 * Decorations are purely visual, recalculated on every document change.
 * Mirrors the BskyLinkDecorator pattern.
 *
 * Matches #hashtag patterns — same characters as app.bsky.richtext.facet#tag uses.
 * Specifically: # followed by one or more word characters (letters, digits, _).
 * A tag may not start with a digit (per Bluesky's tag spec).
 */

import { Extension } from '@tiptap/core'
import type { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// Bluesky tag pattern: # followed by at least one letter/underscore (not digit-only),
// then optional further word characters. Must not be preceded by another word char.
const TAG_REGEX = /(?<!\w)#(\p{L}|\p{M}|\p{N}|\p{Pc})+(?!\w)/gu

function getDecorations(doc: ProsemirrorNode, tagClass: string): DecorationSet {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return

    const text = node.text
    TAG_REGEX.lastIndex = 0

    let match: RegExpExecArray | null
    while ((match = TAG_REGEX.exec(text)) !== null) {
      const from = pos + match.index
      const to = from + match[0].length
      decorations.push(
        Decoration.inline(from, to, { class: tagClass, 'data-hashtag': '' }),
      )
    }
  })

  return DecorationSet.create(doc, decorations)
}

function createTagDecoratorPlugin(tagClass: string): Plugin {
  const key = new PluginKey<DecorationSet>('bsky-tag-decorator')

  return new Plugin<DecorationSet>({
    key,
    state: {
      init: (_, { doc }) => getDecorations(doc, tagClass),
      apply: (transaction, decorationSet) => {
        if (transaction.docChanged) return getDecorations(transaction.doc, tagClass)
        return decorationSet.map(transaction.mapping, transaction.doc)
      },
    },
    props: {
      decorations(state) { return key.getState(state) },
    },
  })
}

export interface BskyTagDecoratorOptions {
  tagClass: string
}

export const BskyTagDecorator = Extension.create<BskyTagDecoratorOptions>({
  name: 'bskyTagDecorator',
  addOptions() { return { tagClass: 'bsky-tag' } },
  addProseMirrorPlugins() { return [createTagDecoratorPlugin(this.options.tagClass)] },
})

/**
 * BskyLinkDecorator — stateless URL decoration using ProseMirror DecorationSet.
 * Decorations are purely visual, recalculated on every document change.
 * Adapted from Bluesky's social-app LinkDecorator.ts.
 */

import { Extension } from '@tiptap/core'
import type { Node as ProsemirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g

function getDecorations(doc: ProsemirrorNode, linkClass: string): DecorationSet {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return

    const text = node.text
    URL_REGEX.lastIndex = 0

    let match: RegExpExecArray | null
    while ((match = URL_REGEX.exec(text)) !== null) {
      let uri = match[0]
      const from = pos + match.index
      let to = from + uri.length

      if (/[.,;!?]$/.test(uri)) { uri = uri.slice(0, -1); to-- }
      if (/[)]$/.test(uri) && !uri.includes('(')) { uri = uri.slice(0, -1); to-- }

      decorations.push(
        Decoration.inline(from, to, { class: linkClass, 'data-autolink': '' }),
      )
    }
  })

  return DecorationSet.create(doc, decorations)
}

function createLinkDecoratorPlugin(linkClass: string): Plugin {
  const key = new PluginKey<DecorationSet>('bsky-link-decorator')

  return new Plugin<DecorationSet>({
    key,
    state: {
      init: (_, { doc }) => getDecorations(doc, linkClass),
      apply: (transaction, decorationSet) => {
        if (transaction.docChanged) return getDecorations(transaction.doc, linkClass)
        return decorationSet.map(transaction.mapping, transaction.doc)
      },
    },
    props: {
      decorations(state) { return key.getState(state) },
    },
  })
}

export interface BskyLinkDecoratorOptions {
  linkClass: string
}

export const BskyLinkDecorator = Extension.create<BskyLinkDecoratorOptions>({
  name: 'bskyLinkDecorator',
  addOptions() { return { linkClass: 'autolink' } },
  addProseMirrorPlugins() { return [createLinkDecoratorPlugin(this.options.linkClass)] },
})

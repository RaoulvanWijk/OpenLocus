import type { Node } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Extension } from '@tiptap/react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface AutoSaveOptions {
  noteId: string
  debounceMs: number
  maxWaitMs: number
  onSave: (content: string, title: string) => Promise<void>
  onStatusChange: (status: SaveStatus) => void
  onLocalUpdate: (title: string, updatedAt: string) => void
}

function extractTitle(doc: Node): string {
  const firstNode = doc.firstChild
  if (firstNode && firstNode.type.name === 'heading' && firstNode.attrs.level === 1) {
    return firstNode.textContent
  }
  return ''
}

const autoSavePluginKey = new PluginKey('autoSave')

export const AutoSaveExtension = Extension.create<AutoSaveOptions>({
  name: 'autoSave',

  addOptions() {
    return {
      noteId: '',
      debounceMs: 800,
      maxWaitMs: 5000,
      onSave: async () => {},
      onStatusChange: () => {},
      onLocalUpdate: () => {},
    }
  },

  addProseMirrorPlugins() {
    const { options, editor } = this

    let debounceTimer: ReturnType<typeof setTimeout> | undefined
    let maxWaitTimer: ReturnType<typeof setTimeout> | undefined
    let pendingDoc: Node | undefined

    const save = async (doc: Node) => {
      clearTimeout(debounceTimer)
      clearTimeout(maxWaitTimer)
      debounceTimer = undefined
      maxWaitTimer = undefined
      pendingDoc = undefined
      try {
        await options.onSave(editor.getHTML(), extractTitle(doc))
        options.onStatusChange('saved')
      } catch {
        options.onStatusChange('error')
      }
    }

    return [
      new Plugin({
        key: autoSavePluginKey,
        view() {
          return {
            update(view, prevState) {
              if (view.state.doc.eq(prevState.doc)) return

              options.onStatusChange('saving')
              options.onLocalUpdate(extractTitle(view.state.doc), new Date().toISOString())

              pendingDoc = view.state.doc

              clearTimeout(debounceTimer)
              debounceTimer = setTimeout(() => save(pendingDoc!), options.debounceMs)

              if (!maxWaitTimer) {
                maxWaitTimer = setTimeout(() => save(pendingDoc!), options.maxWaitMs)
              }
            },
            destroy() {
              clearTimeout(debounceTimer)
              clearTimeout(maxWaitTimer)
              if (pendingDoc) {
                save(pendingDoc)
              }
            },
          }
        },
      }),
    ]
  },
})

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
    }
  },

  addProseMirrorPlugins() {
    const { options, editor } = this

    let debounceTimer: ReturnType<typeof setTimeout> | undefined
    let maxWaitTimer: ReturnType<typeof setTimeout> | undefined

    const save = async (doc: Node) => {
      clearTimeout(debounceTimer)
      clearTimeout(maxWaitTimer)
      debounceTimer = undefined
      maxWaitTimer = undefined
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

              const { doc } = view.state

              clearTimeout(debounceTimer)
              debounceTimer = setTimeout(() => save(doc), options.debounceMs)

              if (!maxWaitTimer) {
                maxWaitTimer = setTimeout(() => save(doc), options.maxWaitMs)
              }
            },
            destroy() {
              clearTimeout(debounceTimer)
              clearTimeout(maxWaitTimer)
            },
          }
        },
      }),
    ]
  },
})

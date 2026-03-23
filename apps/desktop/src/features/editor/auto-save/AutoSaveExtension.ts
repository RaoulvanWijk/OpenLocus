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

type PendingSave = {
  content: string
  title: string
}

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
    let pendingSave: PendingSave | undefined
    let isSaving = false

    const flushPending = async () => {
      clearTimeout(debounceTimer)
      clearTimeout(maxWaitTimer)
      debounceTimer = undefined
      maxWaitTimer = undefined

      if (isSaving || !pendingSave) {
        return
      }

      isSaving = true

      while (pendingSave) {
        const currentSave = pendingSave
        pendingSave = undefined

        try {
          await options.onSave(currentSave.content, currentSave.title)
          options.onStatusChange('saved')
        } catch {
          options.onStatusChange('error')
        }
      }

      isSaving = false
    }

    return [
      new Plugin({
        key: autoSavePluginKey,
        view() {
          return {
            update(view, prevState) {
              if (view.state.doc.eq(prevState.doc)) return

              const title = extractTitle(view.state.doc)

              options.onStatusChange('saving')
              options.onLocalUpdate(title, new Date().toISOString())

              pendingSave = {
                content: editor.getHTML(),
                title,
              }

              clearTimeout(debounceTimer)
              debounceTimer = setTimeout(() => {
                void flushPending()
              }, options.debounceMs)

              if (!maxWaitTimer) {
                maxWaitTimer = setTimeout(() => {
                  void flushPending()
                }, options.maxWaitMs)
              }
            },
            destroy() {
              clearTimeout(debounceTimer)
              clearTimeout(maxWaitTimer)
              if (pendingSave && !isSaving) {
                void flushPending()
              }
            },
          }
        },
      }),
    ]
  },
})

import type { Node } from '@tiptap/pm/model'
import { Extension } from '@tiptap/react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface AutoSaveOptions {
  debounceMs: number
  maxWaitMs: number
  onSave: (content: string, title: string) => Promise<void>
  onStatusChange: (status: SaveStatus) => void
  onLocalUpdate: (title: string, updatedAt: string) => void
}

export function extractTitle(doc: Node): string {
  const firstNode = doc.firstChild
  if (firstNode && firstNode.type.name === 'heading' && firstNode.attrs.level === 1) {
    return firstNode.textContent
  }
  return ''
}

type PendingSave = {
  content: string
  title: string
}

export const AutoSaveExtension = Extension.create<AutoSaveOptions>({
  name: 'autoSave',

  addOptions() {
    return {
      debounceMs: 800,
      maxWaitMs: 5000,
      onSave: async () => {},
      onStatusChange: () => {},
      onLocalUpdate: () => {},
    }
  },

  addStorage() {
    return {
      debounceTimer: undefined as ReturnType<typeof setTimeout> | undefined,
      maxWaitTimer: undefined as ReturnType<typeof setTimeout> | undefined,
      pendingSave: undefined as PendingSave | undefined,
      isSaving: false,
    }
  },

  onUpdate() {
    const { editor, options, storage } = this
    const title = extractTitle(editor.state.doc)

    options.onStatusChange('saving')
    options.onLocalUpdate(title, new Date().toISOString())

    storage.pendingSave = { content: editor.getHTML(), title }

    clearTimeout(storage.debounceTimer)
    storage.debounceTimer = setTimeout(() => {
      void this.storage.flushPending()
    }, options.debounceMs)

    if (!storage.maxWaitTimer) {
      storage.maxWaitTimer = setTimeout(() => {
        void this.storage.flushPending()
      }, options.maxWaitMs)
    }
  },

  onDestroy() {
    const { storage } = this
    clearTimeout(storage.debounceTimer)
    clearTimeout(storage.maxWaitTimer)
    if (storage.pendingSave && !storage.isSaving) {
      void this.storage.flushPending()
    }
  },

  onCreate() {
    const storage = this.storage
    const options = this.options
    this.storage.flushPending = async () => {
      clearTimeout(storage.debounceTimer)
      clearTimeout(storage.maxWaitTimer)
      storage.debounceTimer = undefined
      storage.maxWaitTimer = undefined

      if (storage.isSaving || !storage.pendingSave) {
        return
      }

      storage.isSaving = true

      while (storage.pendingSave) {
        const currentSave = storage.pendingSave
        storage.pendingSave = undefined

        try {
          await options.onSave(currentSave.content, currentSave.title)
          options.onStatusChange('saved')
        } catch {
          options.onStatusChange('error')
        }
      }

      storage.isSaving = false
    }
  },
})

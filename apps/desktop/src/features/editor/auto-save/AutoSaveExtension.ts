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

  onUpdate() {
    const { options, editor } = this

    const title = extractTitle(editor.state.doc)

    options.onStatusChange('saving')
    options.onLocalUpdate(title, new Date().toISOString())

    this.storage.pendingSave = {
      content: editor.getHTML(),
      title,
    }

    clearTimeout(this.storage.debounceTimer)
    this.storage.debounceTimer = setTimeout(() => {
      void this.storage.flushPending()
    }, options.debounceMs)

    if (!this.storage.maxWaitTimer) {
      this.storage.maxWaitTimer = setTimeout(() => {
        void this.storage.flushPending()
      }, options.maxWaitMs)
    }
  },

  onDestroy() {
    clearTimeout(this.storage.debounceTimer)
    clearTimeout(this.storage.maxWaitTimer)
    if (this.storage.pendingSave && !this.storage.isSaving) {
      void this.storage.flushPending()
    }
  },

  addStorage() {
    const options = this.options

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

    return {
      get debounceTimer() { return debounceTimer },
      set debounceTimer(v) { debounceTimer = v },
      get maxWaitTimer() { return maxWaitTimer },
      set maxWaitTimer(v) { maxWaitTimer = v },
      get pendingSave() { return pendingSave },
      set pendingSave(v) { pendingSave = v },
      get isSaving() { return isSaving },
      flushPending,
    }
  },
})

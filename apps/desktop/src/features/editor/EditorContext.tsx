import { invoke } from '@tauri-apps/api/core'
import { createContext, ReactNode, useCallback, useMemo, useState } from 'react'
import type { SaveStatus } from './auto-save/AutoSaveExtension'

export type Note = {
  id: string
  title: string
  updatedAt: string
}

type EditorContextType = {
  availableNotes: Note[]
  saveStatus: SaveStatus
  setSaveStatus: (status: SaveStatus) => void
  createNote: () => Promise<string>
  deleteNote: (id: string) => Promise<void>
  updateNote: (id: string, title: string, updatedAt: string) => void
}

export const EditorContext = createContext<EditorContextType | null>(null)

type EditorContextProviderProps = {
  initialNotes: Note[]
  children: ReactNode
}

export default function EditorContextProvider({
  initialNotes,
  children,
}: EditorContextProviderProps) {
  const [availableNotes, setAvailableNotes] = useState<Note[]>(initialNotes)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const createNote = useCallback(async () => {
    const existingEmpty = availableNotes.find((n) => n.title === '')
    if (existingEmpty) {
      return existingEmpty.id
    }

    const result = await invoke<{ id: string; path: string }>('document_create', {
      path: `Untitled-${Date.now()}.md`,
    })
    const newNote: Note = {
      id: result.id,
      title: '',
      updatedAt: new Date().toISOString(),
    }
    setAvailableNotes((prev) => [newNote, ...prev])
    return result.id
  }, [availableNotes])

  const deleteNote = useCallback(async (id: string) => {
    await invoke('document_delete', { id })
    setAvailableNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const updateNote = useCallback((id: string, title: string, updatedAt: string) => {
    setAvailableNotes((prev) => {
      const index = prev.findIndex((n) => n.id === id)
      if (index === -1) {
        return prev
      }

      const existing = prev[index]
      if (existing.title === title && existing.updatedAt === updatedAt) {
        return prev
      }

      const updatedNote: Note = { ...existing, title, updatedAt }
      const next = prev.slice()
      next.splice(index, 1)

      if (next.length === 0) {
        return [updatedNote]
      }

      let insertIndex = 0
      while (
        insertIndex < next.length &&
        next[insertIndex].updatedAt.localeCompare(updatedAt) >= 0
      ) {
        insertIndex += 1
      }

      next.splice(insertIndex, 0, updatedNote)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ availableNotes, saveStatus, setSaveStatus, createNote, deleteNote, updateNote }),
    [availableNotes, saveStatus, setSaveStatus, createNote, deleteNote, updateNote],
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

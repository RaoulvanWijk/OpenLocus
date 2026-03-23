import { invoke } from '@tauri-apps/api/core'
import { createContext, ReactNode, useCallback, useMemo, useState } from 'react'

export type Note = {
  id: string
  title: string
  time: string
}

type EditorContextType = {
  availableNotes: Note[]
  loading: boolean
  loadNotes: () => Promise<void>
  createNote: () => Promise<string>
  deleteNote: (id: string) => Promise<void>
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
  const [loading, setLoading] = useState(false)

  const loadNotes = useCallback(async () => {
    setLoading(true)
    const docs =
      await invoke<{ id: string; title: string; created_at: string; updated_at: string; path: string }[]>(
        'document_list',
      )
    const loaded: Note[] = docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      time: new Date(doc.updated_at || doc.created_at).toLocaleString(),
    }))
    setAvailableNotes(loaded)
    setLoading(false)
  }, [])

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
      time: new Date().toLocaleString(),
    }
    setAvailableNotes((prev) => [newNote, ...prev])
    return result.id
  }, [availableNotes])

  const deleteNote = useCallback(async (id: string) => {
    await invoke('document_delete', { id })
    setAvailableNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const value = useMemo(
    () => ({ availableNotes, loading, loadNotes, createNote, deleteNote }),
    [availableNotes, loading, loadNotes, createNote, deleteNote],
  )

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

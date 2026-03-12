import { invoke } from '@tauri-apps/api/core'
import { createContext, ReactNode, useCallback, useMemo, useState } from 'react'

type Note = {
  id: string
  title: string
  time: string
  content: string
}

type EditorContextType = {
  availableNotes: Note[]
  loading: boolean
  loadNotes: () => void
  createNote: () => Promise<string>
  deleteNote: (id: string) => void
}

export const EditorContext = createContext<EditorContextType | null>(null)

export default function EditorContextProvider({ children }: { children: ReactNode }) {
  const [availableNotes, setAvailableNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)

  const loadNotes = useCallback(async () => {
    setLoading(true)
    const docs =
      await invoke<{ id: string; title: string; created_at: string; path: string }[]>(
        'list_documents',
      )
    const loaded: Note[] = docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      time: new Date(doc.created_at).toLocaleString(),
      content: '',
    }))
    setAvailableNotes(loaded)
    setLoading(false)
  }, [])

  const createNote = useCallback(async () => {
    const result = await invoke<{ id: string; path: string }>('create_document', {
      path: `Untitled-${Date.now()}.md`,
    })
    const newNote: Note = {
      id: result.id,
      title: 'Untitled',
      time: new Date().toLocaleString(),
      content: '',
    }
    setAvailableNotes((prev) => [newNote, ...prev])
    return result.id
  }, [])

  const deleteNote = useCallback(async (id: string) => {
    await invoke('delete_document', { id })
    setAvailableNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const value = useMemo(
    () => ({ availableNotes, loading, loadNotes, createNote, deleteNote }),
    [availableNotes, loading, loadNotes, createNote, deleteNote],
  )

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  )
}

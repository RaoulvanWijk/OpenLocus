import { invoke } from '@tauri-apps/api/core'
import { createContext, ReactNode, useEffect, useState } from 'react'

type Note = {
  id: string
  title: string
  time: string
  content: string
  selected: boolean
}

type EditorContextType = {
  availableNotes: Note[]
  selectedNote: Note | null
  loading: boolean
  loadNotes: () => void
  createNote: () => void
  selectNote: (id: string) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  moveNote: (id: string, position: number) => void
}

export const EditorContext = createContext<EditorContextType | null>(null)

export default function EditorContextProvider({ children }: { children: ReactNode }) {
  const [availableNotes, setAvailableNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(false)

  const loadNotes = async () => {
    setLoading(true)
    const docs =
      await invoke<{ id: string; title: string; created_at: string; path: string }[]>(
        'list_documents',
      )
    const loaded: Note[] = docs.map((doc, i) => ({
      id: doc.id,
      title: doc.title,
      time: new Date(doc.created_at).toLocaleString(),
      content: '',
      selected: i === 0,
    }))
    setAvailableNotes(loaded)
    setSelectedNote(loaded[0] ?? null)
    setLoading(false)
  }

  const createNote = async () => {
    const result = await invoke<{ id: string; path: string }>('create_document', {
      path: `Untitled-${Date.now()}.md`,
    })
    const newNote: Note = {
      id: result.id,
      title: 'Untitled',
      time: new Date().toLocaleString(),
      content: '',
      selected: false,
    }
    setAvailableNotes((prev) => [newNote, ...prev])
    selectNote(result.id)
  }
  
  const deleteNote = async (id: string) => {
    await invoke('delete_document', { id })
    setAvailableNotes((prev) => {
      const next = prev.filter((n) => n.id !== id)
      setSelectedNote((current) => (current?.id === id ? (next[0] ?? null) : current))
      return next
    })
  }

  const selectNote = (id: string) => {
    setAvailableNotes((prev) => {
      const updated = prev.map((note) => ({
        ...note,
        selected: note.id === id,
      }))
      const selected = updated.find((note) => note.id === id) || null
      setSelectedNote(selected)
      return updated
    })
  }

  return (
    <EditorContext.Provider
      value={{
        availableNotes,
        selectedNote,
        loading,
        loadNotes,
        createNote,
        selectNote,
        updateNote: (id: string, updates: Partial<Note>) => {},
        deleteNote,
        moveNote: (id: string, position: number) => {},
      }}
    >
      {children}
    </EditorContext.Provider>
  )
}

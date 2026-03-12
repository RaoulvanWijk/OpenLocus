import { createContext, ReactNode, useState } from 'react'

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

// TODO: This is mock data, replace with backend logic once we have it set up
const notes: Note[] = [
  {
    id: "1",
    title: "Untitled",
    time: "Just now",
    content: "",
    selected: true,
  },
  {
    id: "2",
    title: "Getting Started with OpenLocus",
    time: "Today, 09:41",
    content: "",
    selected: false,
  },
  {
    id: "3",
    title: "Weekly Planning — March 2026",
    time: "Today, 08:15",
    content: "",
    selected: false,
  },
  {
    id: "4",
    title: "Reading Notes: Deep Work",
    time: "Yesterday, 23:30",
    content: "",
    selected: false,
  },
  {
    id: "5",
    title: "Project Alpha — Architecture",
    time: "Mar 2, 2026",
    content: "",
    selected: false,
  },
  {
    id: "6",
    title: "Ideas & Scratchpad",
    time: "Mar 1, 2026",
    content: "",
    selected: false,
  },
];


export const EditorContext = createContext<EditorContextType | null>(null)

export default function EditorContextProvider({ children }: { children: ReactNode }) {
  const [availableNotes, setAvailableNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(false)

  const loadNotes = () => {
    setLoading(true)
    // Simulate an API call
    // TODO: Replace with real API call to fetch notes from backend
    setTimeout(() => {
      setAvailableNotes(notes)
      setSelectedNote(notes[0] ?? null)
      setLoading(false)
    }, 1000)
  }

  const createNote = () => {
    // TODO: Replace with real API call to create note in backend
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled',
      time: new Date().toLocaleString(),
      content: '',
      selected: false,
    }
    setAvailableNotes((prev) => [newNote, ...prev])
    selectNote(newNote.id)
  }
  const selectNote = (id: string) => {
    // update selected state
    const note = availableNotes.find((note) => note.id === id) || null
 
    // TODO: Add error handling here, if note is not found
    if (!note) return

    setAvailableNotes((prev) =>
      prev.map((note) => ({
        ...note,
        selected: note.id === id,
      })),
    )

    setSelectedNote(note)
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
        deleteNote: (id: string) => {},
        moveNote: (id: string, position: number) => {},
      }}
    >
      {children}
    </EditorContext.Provider>
  )
}

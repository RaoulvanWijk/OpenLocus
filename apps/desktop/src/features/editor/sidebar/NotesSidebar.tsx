import { useEditor } from '@/features/editor/hooks/use-editor'
import { useEffect } from 'react'
import SidebarItem from './SidebarItem'

export function NotesSidebar() {
  const { loadNotes, availableNotes, createNote } = useEditor()

  useEffect(() => {
    loadNotes()
  }, [])

  return (
    <aside className="relative flex h-screen w-64 flex-col gap-3 bg-gray-50 p-3">
      {/* New Note Button */}
      <button
        onClick={createNote}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm"
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
          <path d="M8 3v10M3 8h10" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-sm font-medium text-gray-800">New Note</span>
      </button>

      <div className="bg-border h-px" />

      {/* Notes List */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {availableNotes.map((note) => (
          <SidebarItem note={note} key={note.id} />
        ))}
      </div>
    </aside>
  )
}

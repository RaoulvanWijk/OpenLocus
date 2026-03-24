import { useEditorContext } from '@/features/editor/hooks/use-editor-context'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { Sidebar, SidebarContent, SidebarHeader } from '../Sidebar'
import NoteItem from './NoteItem'

export function NotesList() {
  const { availableNotes, createNote } = useEditorContext()
  const navigate = useNavigate()

  const handleCreateNote = async () => {
    const id = await createNote()
    navigate({ to: '/notes/$id', params: { id } })
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <button
          onClick={handleCreateNote}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm"
        >
          <Plus className="size-3.5 stroke-3" />
          <span className="text-sm font-medium text-gray-800">New Note</span>
        </button>
        <div className="bg-border h-px" />
      </SidebarHeader>
      <SidebarContent>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {availableNotes.map((note) => (
            <NoteItem note={note} key={note.id} />
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  )
}

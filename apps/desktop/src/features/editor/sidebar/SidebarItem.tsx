import { cn } from '@openlocus/ui/lib/utils'
import { Trash } from 'lucide-react'
import React from 'react'
import { useEditor } from '../hooks/use-editor'

interface SidebarItemProps extends React.ComponentProps<'div'> {
  note: { id: string; title: string; time: string; selected: boolean }
}

export default function SidebarItem({ note }: SidebarItemProps) {
  const { selectNote, selectedNote, deleteNote } = useEditor()

  return (
    <div
      onClick={() => selectNote(note.id)}
      data-state={selectedNote?.id === note.id ? 'selected' : 'deselected'}
      className={cn(
        'group bg-sidebar relative cursor-pointer rounded-lg px-4 py-3 transition-colors duration-200',
        'hover:bg-gray-200',
        'data-[state=selected]:border data-[state=selected]:bg-white data-[state=selected]:text-black data-[state=selected]:shadow-sm',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm`}>{note.title}</p>
          <p className="mt-1 text-xs text-gray-400">{note.time}</p>
        </div>
        <button
          onClick={() => deleteNote(note.id)}
          className="hidden cursor-pointer rounded p-1 group-data-[state=selected]:block hover:bg-gray-200"
        >
          <Trash className="size-4" />
        </button>
      </div>
    </div>
  )
}

import { cn } from '@openlocus/ui/lib/utils'
import React from 'react'
import { useEditor } from '../hooks/use-editor'

interface SidebarItemProps extends React.ComponentProps<'div'> {
  note: { id: string; title: string; time: string; selected: boolean }
}

export default function SidebarItem({ note }: SidebarItemProps) {
  const { selectNote, selectedNote } = useEditor()

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
          <p className={cn('truncate text-sm font-semibold', {"text-gray-500": note.title === 'Untitled' })}>{note.title}</p>
          <p className="mt-1 text-xs text-gray-400">{note.time}</p>
        </div>
        <button className="hidden cursor-pointer rounded p-1 group-hover:block hover:bg-gray-300 data-[state=selected]:hover:bg-gray-200">
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="1.5" fill="#6A7282" />
            <circle cx="12" cy="8" r="1.5" fill="#6A7282" />
            <circle cx="4" cy="8" r="1.5" fill="#6A7282" />
          </svg>
        </button>
      </div>
    </div>
  )
}

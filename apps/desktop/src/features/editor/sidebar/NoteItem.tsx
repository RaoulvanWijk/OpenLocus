import { cn } from '@openlocus/ui/lib/utils'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Trash } from 'lucide-react'
import React from 'react'
import { useEditor } from '../hooks/use-editor'

interface NoteItemProps extends React.ComponentProps<'div'> {
  note: { id: string; title: string; time: string; content: string }
}

export default function NoteItem({ note }: NoteItemProps) {
  const { deleteNote } = useEditor()
  const navigate = useNavigate()
  const { id: currentId } = useParams({ strict: false })

  return (
    <div
      onClick={() => navigate({ to: '/edit/$id', params: { id: note.id } })}
      data-state={currentId === note.id ? 'selected' : 'deselected'}
      className={cn(
        'group/note bg-sidebar relative z-10 cursor-pointer rounded-lg px-4 py-3 transition-colors duration-200',
        'hover:bg-gray-200!',
        'data-[state=selected]:border data-[state=selected]:bg-white data-[state=selected]:text-black data-[state=selected]:shadow-sm',
        'before:absolute before:top-0 before:bottom-0 before:left-0 before:my-auto before:h-8/12 before:w-0.75 before:rounded-r-full before:bg-[#1F2937] before:opacity-0 before:content-[""] data-[state=selected]:before:opacity-100',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p
            className={cn('truncate text-sm font-semibold', {
              'text-gray-500': note.content === '' && note.title === 'Untitled',
            })}
          >
            {note.title}
          </p>
          <p className="mt-1 text-xs text-gray-400">{note.time}</p>
        </div>
        <button
          onClick={() => deleteNote(note.id)}
          className={cn(
            'hidden cursor-pointer rounded p-1 group-hover/note:block hover:bg-gray-300',
            'group-hover/note:block group-data-[state=selected]/note:block hover:block',
          )}
        >
          <Trash className="size-4" />
        </button>
      </div>
    </div>
  )
}

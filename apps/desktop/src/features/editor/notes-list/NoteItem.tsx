import { cn } from '@openlocus/ui/lib/utils'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Trash } from 'lucide-react'
import React from 'react'
import { useEditorContext } from '../hooks/use-editor-context'
import { formatNoteDate } from '../utils/format-date'

interface NoteItemProps {
  note: { id: string; title: string; updatedAt: string }
}

export default function NoteItem({ note }: NoteItemProps) {
  const { deleteNote } = useEditorContext()
  const navigate = useNavigate()
  const { id: currentId } = useParams({ strict: false })

  const handleDeleteNote = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    await deleteNote(note.id)
    navigate({ to: '/notes' })
  }

  return (
    <div
      onClick={() => navigate({ to: '/notes/$id', params: { id: note.id } })}
      data-state={currentId === note.id ? 'selected' : 'deselected'}
      className={cn(
        'group/note bg-sidebar relative z-10 cursor-pointer rounded-lg border border-transparent px-4 py-3 transition-colors duration-200',
        'hover:bg-gray-200!',
        'data-[state=selected]:border-border data-[state=selected]:bg-white data-[state=selected]:text-black data-[state=selected]:shadow-sm data-[state=selected]:hover:bg-gray-100',
        'before:absolute before:top-0 before:bottom-0 before:left-0 before:my-auto before:h-8/12 before:w-0.75 before:rounded-r-full before:bg-[#1F2937] before:opacity-0 before:content-[""] data-[state=selected]:before:opacity-100',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p
            className={cn('truncate text-sm font-semibold', {
              'text-gray-400 italic': note.title === '',
            })}
          >
            {note.title || 'Untitled'}
          </p>
          <p className="mt-1 text-xs text-gray-400">{formatNoteDate(note.updatedAt)}</p>
        </div>
        <button
          onClick={handleDeleteNote}
          className={cn(
            'hidden cursor-pointer rounded p-1 group-hover/note:block hover:bg-gray-300',
            'group-hover/note:block group-data-[state=selected]/note:block',
          )}
        >
          <Trash className="size-4" />
        </button>
      </div>
    </div>
  )
}

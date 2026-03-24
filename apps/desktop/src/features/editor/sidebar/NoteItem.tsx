import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuTrigger,
} from '@openlocus/ui/components/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from '@openlocus/ui/components/dropdown-menu'
import { cn } from '@openlocus/ui/lib/utils'
import { useNavigate, useParams } from '@tanstack/react-router'
import { MoreHorizontal, Trash } from 'lucide-react'
import { useState } from 'react'
import { useEditorContext } from '../hooks/use-editor-context'
import { formatNoteDate } from '../utils/format-date'
import { DeleteNoteDialog } from './DeleteNoteDialog'

interface NoteItemProps {
  note: { id: string; title: string; updatedAt: string }
}

export default function NoteItem({ note }: NoteItemProps) {
  const { deleteNote } = useEditorContext()
  const navigate = useNavigate()
  const { id: currentId } = useParams({ strict: false })
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleConfirmDelete = async () => {
    await deleteNote(note.id)
    navigate({ to: '/notes' })
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            onClick={() => navigate({ to: '/notes/$id', params: { id: note.id } })}
            data-state={currentId === note.id ? 'selected' : 'deselected'}
            className={cn(
              'group/note bg-sidebar relative z-10 cursor-pointer rounded-lg border border-transparent px-4 py-3 transition-colors duration-200',
              'hover:bg-gray-200!',
              'data-[state=selected]:border-border data-[state=selected]:bg-white data-[state=selected]:text-black data-[state=selected]:shadow-sm data-[state=selected]:hover:bg-gray-100',
              'before:absolute before:top-0 before:bottom-0 before:left-0 before:my-auto before:h-8/12 before:w-0.75 before:rounded-r-full before:bg-[#1F2937] before:opacity-0 before:content-["\\"] data-[state=selected]:before:opacity-100',
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
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="focus:ring-primary ml-2 flex cursor-pointer items-center justify-center rounded p-1 hover:bg-gray-200 group-data-[state=selected]/note:hover:bg-gray-300 focus:ring-2 focus:outline-none"
                    tabIndex={0}
                    aria-label="Meer opties"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="size-5 text-gray-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent
                    className="animate-fade-in z-50 min-w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                    sideOffset={8}
                    align="end"
                  >
                    <DropdownMenuItem
                      onSelect={() => setDeleteOpen(true)}
                      className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-100 focus:outline-none"
                    >
                      <Trash className="size-4 text-red-600" />
                      Delete note
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent className="animate-fade-in z-50 min-w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <ContextMenuItem
              onSelect={() => setDeleteOpen(true)}
              className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-100 focus:outline-none"
            >
              <Trash className="size-4 text-red-600" />
              Delete note
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenu>
      <DeleteNoteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={note.title || 'Untitled'}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}

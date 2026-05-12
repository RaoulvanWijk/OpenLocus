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
import { ResizableSidebarMenuButton } from '@openlocus/ui/components/resizable-sidebar'
import { cn } from '@openlocus/ui/lib/utils'
import { useNavigate, useParams } from '@tanstack/react-router'
import { EllipsisVertical, Trash } from 'lucide-react'
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
          <ResizableSidebarMenuButton
            onClick={() => navigate({ to: '/notes/$id', params: { id: note.id } })}
            data-state={currentId === note.id ? 'selected' : 'deselected'}
            size="auto"
            variant="custom"
            className={cn(
              'group/note-item relative z-10 items-start justify-between gap-0 rounded-lg border border-transparent bg-transparent p-3 transition-colors duration-200 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-0!',
              'hover:bg-sidebar-accent',
              'data-[state=selected]:border-border data-[state=selected]:bg-white data-[state=selected]:text-black data-[state=selected]:shadow-sm',
              'before:absolute before:top-0 before:bottom-0 before:left-0 before:my-auto before:h-8/12 before:w-0.5 before:rounded-r-full before:bg-[#1F2937] before:opacity-0 group-data-[collapsible=icon]:before:h-1/2 data-[state=selected]:before:opacity-100',
            )}
          >
            <span className="min-w-0 flex-1 space-y-1">
              <p
                className={cn(
                  'mb-0 truncate text-sm whitespace-nowrap group-data-[collapsible=icon]:pl-1 group-data-[collapsible=icon]:text-clip',
                  {
                    'text-gray-400': note.title === '',
                  },
                )}
              >
                {note.title || 'Untitled'}
              </p>
              <p className="text-2xs truncate text-gray-400 group-data-[collapsible=icon]:hidden">
                {formatNoteDate(note.updatedAt)}
              </p>
            </span>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    'focus:ring-primary text-muted-foreground hover:text-foreground hidden cursor-pointer items-center justify-center rounded p-1 hover:bg-gray-200 focus:ring-2 focus:outline-none',
                    'group-data-[state=selected]/note-item:hover:bg-sidebar-accent group-hover/note-item:flex group-data-[collapsible=icon]:hidden! group-data-[state=selected]/note-item:flex',
                  )}
                  tabIndex={0}
                  aria-label="Meer opties"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EllipsisVertical className="size-3.5" />
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
                    className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-600! focus:bg-red-100 focus:outline-none"
                  >
                    <Trash className="size-4 text-red-600" />
                    Delete note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </ResizableSidebarMenuButton>
        </ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent className="animate-fade-in z-50 min-w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <ContextMenuItem
              onSelect={() => setDeleteOpen(true)}
              className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-red-600! focus:bg-red-100 focus:outline-none"
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

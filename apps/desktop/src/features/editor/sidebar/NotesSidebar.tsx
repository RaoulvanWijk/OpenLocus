import { useEditor } from '@/features/editor/hooks/use-editor'
import {
  ResizableSidebar,
  ResizableSidebarContent,
  ResizableSidebarGroup,
  ResizableSidebarHeader,
  ResizableSidebarMenu,
  ResizableSidebarMenuButton,
  ResizableSidebarMenuItem,
  ResizableSidebarSeparator,
} from '@openlocus/ui/components/resizable-sidebar'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import NoteItem from './NoteItem'

export function NotesSidebar() {
  const { availableNotes, createNote } = useEditor()
  const navigate = useNavigate()

  const handleCreateNote = async () => {
    const id = await createNote()
    navigate({ to: '/notes/$id', params: { id } })
  }

  return (
    <ResizableSidebar
      collapsible="icon"
      defaultSize="16rem"
      minSize="10rem"
      maxSize="24rem"
      collapsedSize="3rem"
      className="relative flex h-screen flex-col gap-2 bg-gray-50 transition-[gap] duration-75 data-[collapsible=icon]:gap-1"
    >
      <ResizableSidebarHeader className="px-4 group-data-[collapsible=icon]:px-2">
        <ResizableSidebarMenu>
          <ResizableSidebarMenuItem>
            <ResizableSidebarMenuButton
              onClick={handleCreateNote}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white shadow-sm transition-none group-data-[collapsible=icon]:p-0!"
            >
              <div className="flex aspect-square size-8 items-center justify-center">
                <Plus className="size-3.5 stroke-3" />
              </div>
              <span className="text-sm font-medium text-gray-800">New Note</span>
            </ResizableSidebarMenuButton>
          </ResizableSidebarMenuItem>
        </ResizableSidebarMenu>
      </ResizableSidebarHeader>
      <ResizableSidebarSeparator className="mx-4 group-data-[collapsible=icon]:mx-2" />
      <ResizableSidebarContent>
        <ResizableSidebarGroup className="px-4 group-data-[collapsible=icon]:px-2">
          <ResizableSidebarMenu className="gap-2 transition-[gap] group-data-[collapsible=icon]:gap-1">
            {availableNotes.map((note) => (
              <ResizableSidebarMenuItem key={note.id}>
                <NoteItem note={note} />
              </ResizableSidebarMenuItem>
            ))}
          </ResizableSidebarMenu>
        </ResizableSidebarGroup>
      </ResizableSidebarContent>
    </ResizableSidebar>
  )
}

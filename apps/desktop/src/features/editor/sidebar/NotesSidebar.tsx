import {
  ResizableSidebar,
  ResizableSidebarContent,
  ResizableSidebarGroup,
  ResizableSidebarHeader,
  ResizableSidebarMenu,
  ResizableSidebarMenuButton,
  ResizableSidebarMenuItem,
  ResizableSidebarTrigger,
} from '@openlocus/ui/components/resizable-sidebar'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Plus } from 'lucide-react'
import { useEditorContext } from '../hooks/use-editor-context'
import NoteItem from './NoteItem'

export function NotesSidebar() {
  const { availableNotes, createNote } = useEditorContext()
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
      className="relative flex flex-col transition-[gap] duration-75 data-[collapsible=icon]:gap-1"
    >
      <ResizableSidebarHeader className="flex h-16 shrink-0 flex-row items-center border-b px-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-1 group-data-[collapsible=icon]:pb-0">
        <ResizableSidebarMenu className="group-data-[collapsible=icon]:w-fit">
          <ResizableSidebarMenuItem>
            <ResizableSidebarMenuButton
              onClick={handleCreateNote}
              variant="outline"
              size="lg"
              className="gap-0 px-1 group-data-[collapsible=icon]:size-7!"
            >
              <div className="flex aspect-square size-8 items-center justify-center group-data-[collapsible=icon]:size-7">
                <Plus className="size-3.5" />
              </div>
              <span className="text-sm text-gray-800">New Note</span>
            </ResizableSidebarMenuButton>
          </ResizableSidebarMenuItem>
        </ResizableSidebarMenu>
        <ResizableSidebarTrigger size="icon-lg" className="group-data-[collapsible=icon]:size-7">
          <ChevronLeft className="group-data-[collapsible=icon]:rotate-180" />
        </ResizableSidebarTrigger>
      </ResizableSidebarHeader>
      <ResizableSidebarContent className="overflow-y-auto">
        <ResizableSidebarGroup className="px-2.25 pt-2 group-data-[collapsible=icon]:px-2">
          <ResizableSidebarMenu className="gap-0.5 transition-[gap] group-data-[collapsible=icon]:gap-px">
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

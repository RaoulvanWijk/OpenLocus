import {
  ResizableSidebar,
  ResizableSidebarContent,
  ResizableSidebarGroup,
  ResizableSidebarHeader,
  ResizableSidebarMenu,
  ResizableSidebarMenuButton,
  ResizableSidebarMenuItem,
  ResizableSidebarSeparator,
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
      className="relative flex h-screen flex-col transition-[gap] duration-75 data-[collapsible=icon]:gap-1"
    >
      <ResizableSidebarHeader className="flex-row px-3 pt-4 pb-3 group-data-[collapsible=icon]:flex-col-reverse group-data-[collapsible=icon]:px-2">
        <ResizableSidebarMenu>
          <ResizableSidebarMenuItem>
            <ResizableSidebarMenuButton
              onClick={handleCreateNote}
              variant="outline"
              size="lg"
              className="gap-0 px-1"
            >
              <div className="flex aspect-square size-8 items-center justify-center">
                <Plus className="size-3.5" />
              </div>
              <span className="text-sm text-gray-800">New Note</span>
            </ResizableSidebarMenuButton>
          </ResizableSidebarMenuItem>
        </ResizableSidebarMenu>
        <ResizableSidebarTrigger size="icon-lg" className="group-data-[collapsible=icon]:size-8">
          <ChevronLeft className="group-data-[collapsible=icon]:rotate-180" />
        </ResizableSidebarTrigger>
      </ResizableSidebarHeader>
      <ResizableSidebarSeparator className="mx-4 group-data-[collapsible=icon]:mx-2" />
      <ResizableSidebarContent>
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

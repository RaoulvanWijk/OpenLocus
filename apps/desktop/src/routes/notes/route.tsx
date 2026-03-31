import { ChatSidebar } from '@/features/editor/ai/ChatSidebar'
import type { Note } from '@/features/editor/EditorContext'
import EditorContextProvider from '@/features/editor/EditorContext'
import {
  ResizableSidebarHandle,
  ResizableSidebarInset,
  ResizableSidebarLayout,
  ResizableSidebarProvider,
} from '@openlocus/ui/components/resizable-sidebar'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { NotesSidebar } from '../../features/editor/sidebar/NotesSidebar'

export const Route = createFileRoute('/notes')({
  loader: async () => {
    const docs =
      await invoke<
        { id: string; title: string; created_at: string; updated_at: string; path: string }[]
      >('document_list')
    const notes: Note[] = docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updated_at || doc.created_at,
    }))
    return { notes }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { notes } = Route.useLoaderData()

  return (
    <div className="fixed inset-0">
      <EditorContextProvider initialNotes={notes}>
        <ResizableSidebarProvider>
          <ResizableSidebarLayout>
            <NotesSidebar />
            <ResizableSidebarHandle />
            <ResizableSidebarInset>
              <Outlet />
            </ResizableSidebarInset>
            <ResizableSidebarHandle />
            <ChatSidebar />
          </ResizableSidebarLayout>
        </ResizableSidebarProvider>
      </EditorContextProvider>
    </div>
  )
}

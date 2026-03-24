import { AIChatSidebar } from '@/features/editor/ai/chat'
import type { Note } from '@/features/editor/EditorContext'
import EditorContextProvider from '@/features/editor/EditorContext'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { NotesList } from '../../features/editor/notes-list/NotesList'

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
    <div className="flex">
      <EditorContextProvider initialNotes={notes}>
        <NotesList />
        <Outlet />
        <AIChatSidebar />
      </EditorContextProvider>
    </div>
  )
}

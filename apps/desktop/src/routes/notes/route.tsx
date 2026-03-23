import type { Note } from '@/features/editor/EditorContext'
import EditorContextProvider from '@/features/editor/EditorContext'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { NotesSidebar } from '../../features/editor/sidebar/NotesSidebar'

export const Route = createFileRoute('/notes')({
  loader: async () => {
    const docs =
      await invoke<{ id: string; title: string; created_at: string; path: string }[]>(
        'document_list',
      )
    const notes: Note[] = docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      time: new Date(doc.created_at).toLocaleString(),
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
        <NotesSidebar />
        <Outlet />
      </EditorContextProvider>
    </div>
  )
}

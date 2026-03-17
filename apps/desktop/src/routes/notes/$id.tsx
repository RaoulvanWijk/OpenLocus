import { Editor } from '@/features/editor/Editor'
import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'

type NoteData = {
  id: string
  title: string
  created_at: string
  content: string
}

export const Route = createFileRoute('/notes/$id')({
  loader: async ({ params }) => {
    const note = await invoke<NoteData>('get_note', { id: params.id })
    return { note }
  },
  component: RouteComponent,
  errorComponent: () => (
    <div className="flex h-screen items-center justify-center">
      <p className="text-red-500">Failed to load note. It may have been deleted.</p>
    </div>
  ),
})

function RouteComponent() {
  const { id } = Route.useParams()
  // const { note } = Route.useLoaderData()

  return (
    <main className="flex min-h-svh flex-1 flex-col">
      <Editor key={id} />
    </main>
  )
}

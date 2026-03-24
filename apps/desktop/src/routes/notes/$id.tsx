import { Editor } from '@/features/editor/Editor'
import { GlobalErrorView } from '@/features/error/GlobalErrorView'
import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'

export type NoteData = {
  id: string
  title: string
  created_at: string
  updated_at: string
  content: string
}

export const Route = createFileRoute('/notes/$id')({
  loader: async ({ params }) => {
    const note = await invoke<NoteData>('document_get', { id: params.id })
    return { note }
  },
  component: RouteComponent,
  errorComponent: ({ error, reset }) => <GlobalErrorView error={error} onRetry={reset} />,
})

function RouteComponent() {
  const { note } = Route.useLoaderData()

  return (
    <main className="flex min-h-svh min-w-0 flex-1 flex-col">
      <Editor note={note} />
    </main>
  )
}

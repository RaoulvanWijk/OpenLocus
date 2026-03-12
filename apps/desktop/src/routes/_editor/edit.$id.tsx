import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_editor/edit/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = Route.useParams()

  return (
    <main className="flex min-h-svh flex-1 flex-col">
      <Editor />
    </main>
  )
}

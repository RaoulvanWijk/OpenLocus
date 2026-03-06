import { createFileRoute, Link } from '@tanstack/react-router'
import { Editor } from '../features/editor/editor'

export const Route = createFileRoute('/edit')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main className="flex min-h-screen flex-col rounded-t-2xl bg-gray-100 p-8 pt-4">
      <Link to="/">Back to Home</Link>
      <div className="mt-4 flex flex-1">
        <Editor />
      </div>
    </main>
  )
}

import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/edit')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main className="flex h-screen flex-col rounded-t-2xl bg-gray-100 p-8 pt-4">
      <Link to="/">Back to Home</Link>
      <div
        contentEditable
        className="mt-4 flex-1 rounded-sm bg-white p-4 shadow-xl shadow-black/1 outline-none"
      />
    </main>
  )
}

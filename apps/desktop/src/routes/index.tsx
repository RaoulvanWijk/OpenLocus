import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main>
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Open Locus</h1>
        <Link to="/notes">Edit notes</Link>
      </div>
    </main>
  )
}

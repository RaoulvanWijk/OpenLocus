import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_editor')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex">
      <aside>
        Sidebar
        <nav>
          <Link to="/">Back home</Link>
        </nav>
      </aside>
      <Outlet />
    </div>
  )
}

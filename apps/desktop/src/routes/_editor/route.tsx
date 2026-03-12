import { cn } from '@openlocus/ui/lib/utils'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { Route as EditRoute } from './edit.$id'

export const Route = createFileRoute('/_editor')({
  component: RouteComponent,
})

function RouteComponent() {
  const { id } = EditRoute.useParams()

  return (
    <div className="flex h-svh overflow-hidden">
      <aside className="bg-sidebar">
        <nav>
          <Link to="/">Back home</Link>
        </nav>
        <nav>
          <ul>
            <li>
              <Link
                to="/edit/$id"
                params={{ id: '123' }}
                className={cn('', id === '123' && 'font-bold')}
              >
                Edit note 123
              </Link>
            </li>
            <li>
              <Link
                to="/edit/$id"
                params={{ id: '456' }}
                className={cn('', id === '456' && 'font-bold')}
              >
                Edit note 456
              </Link>
            </li>
            <li>
              <Link
                to="/edit/$id"
                params={{ id: '789' }}
                className={cn('', id === '789' && 'font-bold')}
              >
                Edit note 789
              </Link>
            </li>
            <li>
              <Link
                to="/edit/$id"
                params={{ id: '000' }}
                className={cn('', id === '000' && 'font-bold')}
              >
                Edit note 000
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
      <Outlet />
    </div>
  )
}

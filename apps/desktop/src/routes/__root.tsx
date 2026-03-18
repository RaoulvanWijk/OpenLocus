import { GlobalErrorView } from '@/features/error/GlobalErrorView'
import '@openlocus/ui/globals.css'
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => <Outlet />,
  errorComponent: ({ error, reset }) => <GlobalErrorView error={error} onRetry={reset} />,
})

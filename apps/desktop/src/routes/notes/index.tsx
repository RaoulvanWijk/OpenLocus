import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/notes/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex h-screen flex-1 items-center justify-center">
      <p className="text-gray-400">Select a note or create a new one</p>
    </div>
  )
}

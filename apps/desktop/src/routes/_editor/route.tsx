import EditorContextProvider from '@/features/editor/EditorContext'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { NotesSidebar } from '../../features/editor/sidebar/NotesSidebar'

export const Route = createFileRoute('/_editor')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="flex">
      <EditorContextProvider>
        <NotesSidebar />
        <Outlet />
      </EditorContextProvider>
    </div>
  )
}

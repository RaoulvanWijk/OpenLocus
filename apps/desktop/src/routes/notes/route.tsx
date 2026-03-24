import type { Note } from '@/features/editor/EditorContext'
import EditorContextProvider from '@/features/editor/EditorContext'
import {
  PanelImperativeHandle,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@openlocus/ui/components/resizable'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { useRef, useState } from 'react'
import { NotesSidebar } from '../../features/editor/sidebar/NotesSidebar'

export const Route = createFileRoute('/notes')({
  loader: async () => {
    const docs =
      await invoke<{ id: string; title: string; created_at: string; path: string }[]>(
        'document_list',
      )
    const notes: Note[] = docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      time: new Date(doc.created_at).toLocaleString(),
    }))
    return { notes }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { notes } = Route.useLoaderData()
  const sidebarRef = useRef<PanelImperativeHandle>(null)
  const [isCollapsed, setIsCollapsed] = useState<boolean>()

  const toggleSidebar = () => {
    const sidebar = sidebarRef.current
    if (sidebar) {
      if (sidebar.isCollapsed()) {
        sidebar.expand() // Of gebruik sidebar.resize(20) voor een specifieke grootte
        setIsCollapsed(true)
      } else {
        sidebar.collapse()
        setIsCollapsed(false)
      }
    }
  }

  return (
    <div className="flex">
      <EditorContextProvider initialNotes={notes}>
        <ResizablePanelGroup orientation="horizontal" className="max-w-full">
          <ResizablePanel
            panelRef={sidebarRef}
            defaultSize="16rem"
            minSize="10rem"
            collapsible
            collapsedSize="4rem"
            onResize={() => {
              if (sidebarRef.current && sidebarRef.current.isCollapsed()) {
                setIsCollapsed(true)
                return
              }
              setIsCollapsed(false)
            }}
          >
            <NotesSidebar />
            <button onClick={toggleSidebar}>{isCollapsed ? 'Expand' : 'Collapse'}</button>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel minSize="32rem">
            <Outlet />
          </ResizablePanel>
        </ResizablePanelGroup>
      </EditorContextProvider>
    </div>
  )
}

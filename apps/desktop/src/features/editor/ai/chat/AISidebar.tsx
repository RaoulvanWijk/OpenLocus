import { ResizableSidebar } from '@openlocus/ui/components/resizable-sidebar'

export const AISidebar = () => {
  return (
    <ResizableSidebar minSize="10rem" defaultSize="16rem" maxSize="24rem">
      <div className="p-4">AI Sidebar</div>
    </ResizableSidebar>
  )
}

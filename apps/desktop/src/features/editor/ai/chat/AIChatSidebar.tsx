import { MessageCircle } from 'lucide-react'
import { Sidebar, SidebarContent, SidebarHeader } from '../../Sidebar'

export function AIChatSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4" />
          <span className="text-sm font-semibold text-gray-800">AI Chat</span>
        </div>
        <div className="bg-border h-px" />
      </SidebarHeader>
      <SidebarContent>
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {/* Chat messages will go here */}
        </div>
      </SidebarContent>
    </Sidebar>
  )
}

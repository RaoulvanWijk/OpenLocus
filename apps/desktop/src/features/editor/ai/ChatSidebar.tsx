import {
  ResizableSidebar,
  ResizableSidebarContent,
  ResizableSidebarHeader,
  ResizableSidebarTrigger,
} from '@openlocus/ui/components/resizable-sidebar'
import { BotIcon, ChevronRight, MessageCirclePlus } from 'lucide-react'
import { useEffect } from 'react'
import { ChatError } from './ChatError'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'
import { ModelDownloadProgress } from './ModelDownloadProgress'
import { NewChatDialog } from './NewChatDialog'
import { useAiStore } from './stores/ai-store'

export const ChatSidebar = () => {
  const initListeners = useAiStore((s) => s.initListeners)
  const refreshModels = useAiStore((s) => s.refreshModels)
  const refreshModelStatus = useAiStore((s) => s.refreshModelStatus)
  const resetChat = useAiStore((s) => s.resetChat)

  useEffect(() => {
    void refreshModels()
    void refreshModelStatus()
    return initListeners()
  }, [refreshModels, refreshModelStatus, initListeners])

  return (
    <ResizableSidebar minSize="14rem" defaultSize="20rem" maxSize="32rem" className="max-h-screen">
      <ResizableSidebarHeader className="flex-row items-center justify-between gap-2 border-b px-3 py-2">
        <ResizableSidebarTrigger size="icon-lg" className="group-data-[collapsible=icon]:size-8">
          <ChevronRight className="group-data-[collapsible=offcanvas]:rotate-180" />
        </ResizableSidebarTrigger>
        <div className="flex items-center gap-2">
          <BotIcon className="size-4 shrink-0" />
          <span className="text-sm font-semibold">Open Locus AI</span>
        </div>
        <NewChatDialog onConfirm={resetChat}>
          <button
            className="focus:ring-ring hover:bg-muted rounded p-1 transition-colors focus:ring-2 focus:outline-none"
            aria-label="Start new chat"
            title="Start new chat"
          >
            <MessageCirclePlus className="size-4" />
          </button>
        </NewChatDialog>
      </ResizableSidebarHeader>

      <ResizableSidebarContent className="flex h-full flex-col overflow-hidden">
        <ModelDownloadProgress />
        <MessageList />
        <ChatError />
        <ChatInput />
      </ResizableSidebarContent>
    </ResizableSidebar>
  )
}

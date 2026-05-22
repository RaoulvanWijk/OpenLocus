import {
  ResizableSidebar,
  ResizableSidebarContent,
  ResizableSidebarHeader,
  ResizableSidebarInstanceContext,
} from '@openlocus/ui/components/resizable-sidebar'
import { MessageCirclePlus } from 'lucide-react'
import { useContext, useEffect } from 'react'
import { ChatError } from './ChatError'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'
import { ModelDownloadProgress } from './ModelDownloadProgress'
import { NewChatDialog } from './NewChatDialog'
import { useAiStore } from './stores/ai-store'

function ChatSidebarToggleRegistrar() {
  const instance = useContext(ResizableSidebarInstanceContext)
  const setToggle = useAiStore((s) => s.setChatToggle)

  useEffect(() => {
    if (instance?.toggleSidebar) setToggle(instance.toggleSidebar, instance.isCollapsed)
  }, [instance, instance?.isCollapsed, setToggle])

  return null
}

export const ChatSidebar = () => {
  const initListeners = useAiStore((s) => s.initListeners)
  const refreshModels = useAiStore((s) => s.refreshModels)
  const refreshModelStatus = useAiStore((s) => s.refreshModelStatus)
  const hydrateActiveModel = useAiStore((s) => s.hydrateActiveModel)
  const resetChat = useAiStore((s) => s.resetChat)
  const missingCustomModelIds = useAiStore((s) => s.missingCustomModelIds)

  useEffect(() => {
    void (async () => {
      await refreshModels()
      await hydrateActiveModel()
      await refreshModelStatus()
    })()
    return initListeners()
  }, [refreshModels, refreshModelStatus, initListeners, hydrateActiveModel])

  return (
    <ResizableSidebar minSize="14rem" defaultSize="20rem" maxSize="32rem" className="max-h-screen">
      <ChatSidebarToggleRegistrar />
      <ResizableSidebarHeader className="h-16 flex-row items-center justify-between gap-2 border-b px-3">
        <div className="flex items-center gap-2">
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

      <ResizableSidebarContent className="flex h-full flex-col gap-0 overflow-hidden">
        {missingCustomModelIds.length > 0 && (
          <div className="border-b bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            A custom model file is missing on disk. It has been disabled. Re-add it via the model
            picker.
          </div>
        )}
        <ModelDownloadProgress />
        <MessageList />
        <ChatError />
        <ChatInput />
      </ResizableSidebarContent>
    </ResizableSidebar>
  )
}

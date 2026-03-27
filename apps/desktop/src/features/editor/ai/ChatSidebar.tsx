import { useEditorContext } from '@/features/editor/hooks/use-editor-context'
import {
  ResizableSidebar,
  ResizableSidebarContent,
  ResizableSidebarHeader,
} from '@openlocus/ui/components/resizable-sidebar'
import { BotIcon, MessageCirclePlus } from 'lucide-react'
import { ChatError } from './ChatError'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'
import { ModelSetup } from './ModelSetup'
import { NewChatDialog } from './NewChatDialog'
import { useChat } from './hooks/use-chat'
import { useModelSetup } from './hooks/use-model-setup'

export const ChatSidebar = () => {
  const { activeNoteContent } = useEditorContext()
  const modelSetup = useModelSetup()
  const chat = useChat(activeNoteContent)

  const handleNewChat = () => {
    chat.resetChat()
  }

  return (
    <ResizableSidebar minSize="14rem" defaultSize="20rem" maxSize="32rem" className="max-h-screen">
      <ResizableSidebarHeader className="flex-row items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <BotIcon className="size-4 shrink-0" />
          <span className="text-sm font-semibold">Open Locus AI</span>
        </div>
        <NewChatDialog onConfirm={handleNewChat}>
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
        {!modelSetup.modelStatus.downloaded || !modelSetup.modelStatus.loaded ? (
          <ModelSetup setup={modelSetup} />
        ) : (
          <>
            <MessageList messages={chat.messages} isStreaming={chat.isStreaming} />
            <ChatError error={chat.chatError} />
            <ChatInput chat={chat} />
          </>
        )}
      </ResizableSidebarContent>
    </ResizableSidebar>
  )
}

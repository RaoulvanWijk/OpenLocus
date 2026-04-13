import { useEditorContext } from '@/features/editor/hooks/use-editor-context'
import {
  ResizableSidebar,
  ResizableSidebarContent,
  ResizableSidebarHeader,
  ResizableSidebarTrigger,
} from '@openlocus/ui/components/resizable-sidebar'
import { BotIcon, ChevronRight, MessageCirclePlus } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { ChatError } from './ChatError'
import { ChatInput } from './ChatInput'
import { MessageList } from './MessageList'
import { ModelSetup } from './ModelSetup'
import { NewChatDialog } from './NewChatDialog'
import { useChat } from './hooks/use-chat'
import { useModelSetup } from './hooks/use-model-setup'
import { useModels } from './hooks/use-models'

export const ChatSidebar = () => {
  const { activeNoteContent } = useEditorContext()
  const modelSetup = useModelSetup()
  const modelsState = useModels()
  const chat = useChat(activeNoteContent)

  const selectedModel = useMemo(
    () => modelsState.models.find((model) => model.id === modelSetup.activeModelId),
    [modelsState.models, modelSetup.activeModelId],
  )

  const selectedProgress =
    modelsState.downloadProgressByModel[modelSetup.activeModelId] ?? modelSetup.downloadProgress
  const selectedProgressPercent =
    selectedProgress && selectedProgress.total > 0
      ? Math.round((selectedProgress.loaded / selectedProgress.total) * 100)
      : null
  const selectedModelDownloaded = selectedModel?.downloaded ?? modelSetup.modelStatus.downloaded
  const modelReady = selectedModelDownloaded && modelSetup.modelStatus.loaded

  useEffect(() => {
    if (modelsState.models.length === 0) {
      return
    }

    const currentModel = modelsState.models.find((model) => model.id === modelSetup.activeModelId)
    if (currentModel?.downloaded) {
      return
    }

    const inProgressModelId = Object.entries(modelsState.downloadProgressByModel).find(
      ([, progress]) => progress.total === 0 || progress.loaded < progress.total,
    )?.[0]

    if (inProgressModelId && inProgressModelId !== modelSetup.activeModelId) {
      modelSetup.setActiveModelId(inProgressModelId)
      return
    }

    const firstDownloadedModel = modelsState.models.find((model) => model.downloaded)
    if (firstDownloadedModel && firstDownloadedModel.id !== modelSetup.activeModelId) {
      modelSetup.setActiveModelId(firstDownloadedModel.id)
    }
  }, [
    modelSetup.activeModelId,
    modelSetup.setActiveModelId,
    modelsState.downloadProgressByModel,
    modelsState.models,
  ])

  const handleNewChat = () => {
    chat.resetChat()
  }

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
        <div className="border-b px-3 py-2">
          <label
            htmlFor="model-picker"
            className="text-muted-foreground mb-1 block text-[11px] font-medium tracking-wide uppercase"
          >
            Active model
          </label>
          <select
            id="model-picker"
            className="border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-2 py-1.5 text-xs shadow-xs outline-none focus-visible:ring-[3px]"
            value={modelSetup.activeModelId}
            onChange={(event) => modelSetup.setActiveModelId(event.target.value)}
          >
            {modelsState.models.length === 0 && (
              <option value={modelSetup.activeModelId}>Loading models...</option>
            )}
            {modelsState.models.map((model) => {
              const progress = modelsState.downloadProgressByModel[model.id]
              const progressPercent =
                progress && progress.total > 0
                  ? Math.round((progress.loaded / progress.total) * 100)
                  : null

              const label = progress
                ? `${model.name} (${progressPercent !== null ? `${progressPercent}%` : 'downloading'})`
                : model.downloaded
                  ? model.name
                  : `${model.name} (not downloaded)`

              return (
                <option key={model.id} value={model.id} disabled={!model.downloaded}>
                  {label}
                </option>
              )
            })}
          </select>

          {modelsState.modelsError && (
            <p className="text-destructive mt-1 text-[11px]">{modelsState.modelsError}</p>
          )}

          {selectedProgress && !selectedModelDownloaded && (
            <p className="text-muted-foreground mt-1 text-[11px]">
              Downloading {selectedModel?.name ?? modelSetup.activeModelId}
              {selectedProgressPercent !== null ? ` (${selectedProgressPercent}%)` : ''}
            </p>
          )}
        </div>

        {!modelReady ? (
          <ModelSetup
            setup={modelSetup}
            modelName={selectedModel?.name ?? modelSetup.activeModelId}
          />
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

import { Badge } from '@openlocus/ui/components/badge'
import { Button } from '@openlocus/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openlocus/ui/components/select'
import { Textarea } from '@openlocus/ui/components/textarea'
import { useParams } from '@tanstack/react-router'
import { Download, File, Plus, SendIcon, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useEditorContext } from '../hooks/use-editor-context'
import { CustomModelDialog } from './CustomModelDialog'
import { useAiStore } from './stores/ai-store'

export function ChatInput() {
  const { activeNoteContent, availableNotes } = useEditorContext()
  const input = useAiStore((s) => s.input)
  const onInputChange = useAiStore((s) => s.onInputChange)
  const sendMessage = useAiStore((s) => s.sendMessage)
  const isStreaming = useAiStore((s) => s.isStreaming)
  const maxLength = useAiStore((s) => s.maxLength)
  const models = useAiStore((s) => s.models)
  const activeModelId = useAiStore((s) => s.activeModelId)
  const setActiveModelId = useAiStore((s) => s.setActiveModelId)
  const downloadProgressByModel = useAiStore((s) => s.downloadProgressByModel)
  const storeDownloadModel = useAiStore((s) => s.downloadModel)
  const removeCustomModel = useAiStore((s) => s.removeCustomModel)
  const modelStatus = useAiStore((s) => s.modelStatus)
  const [customDialogOpen, setCustomDialogOpen] = useState(false)

  const { id: currentNoteId } = useParams({ strict: false })
  const currentNote = useMemo(
    () => availableNotes.find((note) => note.id === currentNoteId),
    [availableNotes, currentNoteId],
  )
  const currentNoteTitle = currentNote?.title

  const handleSend = () => {
    void sendMessage(activeNoteContent)
  }

  const exceedsMaxLength = input.length > maxLength
  const canSend = !isStreaming && Boolean(input.trim()) && !exceedsMaxLength

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t px-3 py-2">
      {currentNoteTitle && (
        <Badge className="rounded-md" variant="outline">
          <File />
          {currentNoteTitle}
        </Badge>
      )}
      <Textarea
        className="bg-background placeholder:text-muted-foreground focus:ring-ring field-sizing-content max-h-32 min-h-7 flex-1 resize-none rounded-md border px-3 py-1.5 text-xs focus:ring-1 focus:outline-none"
        placeholder="Ask about your note…"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            if (canSend) {
              handleSend()
            }
          }
        }}
        disabled={isStreaming}
      />

      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs ${exceedsMaxLength ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
        >
          {input.length} / {maxLength}
        </span>
        <div className="flex min-w-0 flex-1 gap-2">
          <Select value={activeModelId} onValueChange={setActiveModelId}>
            <SelectTrigger id="model-picker" size="sm" className="min-w-0 flex-1 shadow-none">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent className="flex w-64" position="popper" align="end">
              {models.length === 0 ? (
                <div className="text-muted-foreground px-2 py-1.5 text-xs">Loading models...</div>
              ) : (
                models.map((model) => {
                  const progress = downloadProgressByModel[model.id]
                  const progressPercent =
                    progress && progress.total > 0
                      ? Math.round((progress.loaded / progress.total) * 100)
                      : null
                  const isDownloading =
                    progress !== undefined && (progressPercent === null || progressPercent < 100)
                  const isDownloaded =
                    model.downloaded || (model.id === activeModelId && modelStatus.downloaded)
                  const canRemove = model.is_custom && model.id !== activeModelId

                  if (!isDownloaded && !isDownloading) {
                    return (
                      <div
                        key={model.id}
                        className="text-muted-foreground flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs select-none"
                      >
                        <span className="min-w-0 flex-1 truncate">{model.name}</span>
                        <div className="flex items-center gap-1">
                          {canRemove && (
                            <button
                              type="button"
                              className="hover:text-destructive shrink-0"
                              aria-label="Remove custom model"
                              onClick={() => void removeCustomModel(model.id)}
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                          <button
                            className="hover:text-foreground ml-1 shrink-0"
                            onClick={() => void storeDownloadModel(model.id)}
                          >
                            <Download className="size-3" />
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      className="flex text-xs [&>span]:flex [&>span]:min-w-0 [&>span]:flex-1"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="min-w-0 flex-1 truncate">{model.name}</span>
                        {model.is_custom && (
                          <span className="text-muted-foreground text-2xs">(custom)</span>
                        )}
                        {isDownloading && progressPercent !== null && (
                          <span className="text-muted-foreground">({progressPercent}%)</span>
                        )}
                      </span>
                    </SelectItem>
                  )
                })
              )}
              <div className="bg-border my-1 h-px" />
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault()
                  setCustomDialogOpen(true)
                }}
                className="text-foreground hover:bg-accent flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs"
              >
                <Plus className="size-3" />
                Add custom model
              </button>
            </SelectContent>
          </Select>

          <Button size="icon-sm" onClick={handleSend} disabled={!canSend} className="shrink-0">
            <SendIcon />
          </Button>
        </div>
      </div>
      <CustomModelDialog open={customDialogOpen} onOpenChange={setCustomDialogOpen} />
    </div>
  )
}

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
import { File, SendIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useEditorContext } from '../hooks/use-editor-context'
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
        <div className="flex gap-2">
          <Select value={activeModelId} onValueChange={setActiveModelId}>
            <SelectTrigger id="model-picker" size="sm" className="shadow-none">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.length === 0 ? (
                <div className="text-muted-foreground px-2 py-1.5 text-xs">Loading models...</div>
              ) : (
                models.map((model) => {
                  const progress = downloadProgressByModel[model.id]
                  const progressPercent =
                    progress && progress.total > 0
                      ? Math.round((progress.loaded / progress.total) * 100)
                      : null

                  const label = progress
                    ? `${model.name}${progressPercent !== null && progressPercent < 100 ? ` (${progressPercent}%)` : ''}`
                    : model.downloaded
                      ? model.name
                      : `${model.name} (not downloaded)`

                  return (
                    <SelectItem
                      key={model.id}
                      value={model.id}
                      disabled={!model.downloaded}
                      className="text-xs"
                    >
                      {label}
                    </SelectItem>
                  )
                })
              )}
            </SelectContent>
          </Select>

          <Button size="icon-sm" onClick={handleSend} disabled={!canSend} className="shrink-0">
            <SendIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

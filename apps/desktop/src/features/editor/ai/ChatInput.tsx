import { Button } from '@openlocus/ui/components/button'
import { SendIcon } from 'lucide-react'
import type { UseChatResult } from './hooks/use-chat'

type ChatInputProps = {
  chat: Pick<UseChatResult, 'input' | 'onInputChange' | 'sendMessage' | 'isStreaming' | 'maxLength'>
}

export function ChatInput({ chat }: ChatInputProps) {
  const { input, onInputChange, sendMessage, isStreaming, maxLength } = chat

  const handleSend = () => {
    sendMessage(input)
  }

  const exceedsMaxLength = input.length > maxLength
  const canSend = !isStreaming && Boolean(input.trim()) && !exceedsMaxLength

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t px-3 py-2">
      <textarea
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

        <Button size="icon-sm" onClick={handleSend} disabled={!canSend} className="shrink-0">
          <SendIcon />
        </Button>
      </div>
    </div>
  )
}

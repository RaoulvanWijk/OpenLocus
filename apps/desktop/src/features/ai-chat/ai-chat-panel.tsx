import { useEffect, useRef, useState } from 'react'
import { useAiChat } from './hooks/use-ai-chat'
import { useLocalModel } from './hooks/use-local-model'

interface Props {
  noteContent: string
}

export function AiChatPanel({ noteContent }: Props) {
  const { status, downloadProgress, error: modelError, startDownload } = useLocalModel()
  const { messages, isLoading, sendMessage, clearMessages } = useAiChat(noteContent)
  const [input, setInput] = useState('')
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Scroll the messages container to the bottom whenever messages update.
  // We scroll the container directly (not scrollIntoView) so only the chat
  // scrolls, not the whole page.
  useEffect(() => {
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading || status !== 'ready') return
    sendMessage(input.trim())
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-l h-full min-h-0">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <span className="text-sm font-semibold">AI Chat</span>
        <span className="text-xs text-muted-foreground">
          {noteContent.length > 0 ? `${noteContent.length} chars` : 'no note'}
        </span>
        {messages.length > 0 && status === 'ready' && (
          <button
            onClick={clearMessages}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Model setup states */}
      {status !== 'ready' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center overflow-hidden">
          {status === 'checking' && (
            <p className="text-sm text-muted-foreground">Checking model…</p>
          )}

          {status === 'not_downloaded' && (
            <>
              <p className="text-sm text-muted-foreground">
                The AI model needs to be downloaded once (~2 GB) and is then stored locally.
              </p>
              <button
                onClick={startDownload}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                Download AI model
              </button>
            </>
          )}

          {status === 'downloading' && (
            <>
              <p className="text-sm font-medium">Downloading model…</p>
              <div className="w-full rounded-full bg-muted h-2">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{downloadProgress}%</p>
            </>
          )}

          {status === 'loading' && (
            <p className="text-sm text-muted-foreground">Loading model into memory…</p>
          )}

          {status === 'error' && (
            <>
              <p className="text-sm text-destructive">{modelError ?? 'Unknown error'}</p>
              <button
                onClick={startDownload}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}

      {/* Chat area */}
      {status === 'ready' && (
        <>
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
          >
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ask anything about your note — summarize it, ask questions, or request rewrites.
              </p>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <span
                    className={`inline-block rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap break-words ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    {msg.content || (msg.role === 'assistant' && isLoading ? '…' : '')}
                  </span>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className="shrink-0 border-t p-3 flex flex-col gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this note… (Enter to send)"
              rows={2}
              disabled={isLoading}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50 self-end"
            >
              {isLoading ? 'Thinking…' : 'Send'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

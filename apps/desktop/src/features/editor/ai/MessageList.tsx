import { useEffect, useRef } from 'react'
import type { Message } from './hooks/use-chat'
import { MarkdownRenderer } from './MarkdownRenderer'

type MessageListProps = {
  messages: Message[]
  isStreaming: boolean
}

const EXAMPLE_PROMPTS = [
  'Summarise this note into three key bullets.',
  'What action items can I extract from this note?',
  'Rewrite this note in a clearer structure.',
]

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5">
      {messages.length === 0 && (
        <div className="mt-4 space-y-2 text-xs">
          <p className="text-muted-foreground text-center">Try one of these prompts:</p>
          {EXAMPLE_PROMPTS.map((prompt) => (
            <div key={prompt} className="bg-muted rounded-md px-3 py-2 text-white">
              {prompt}
            </div>
          ))}
        </div>
      )}

      {messages.map((message, index) => (
        <div
          key={message.id}
          className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
        >
          <div
            className={
              message.role === 'user'
                ? 'bg-primary max-w-[85%] rounded-lg px-3 py-2 text-xs text-white'
                : 'bg-muted/25 max-w-[85%] rounded-lg px-3 py-2 text-xs **:text-xs'
            }
          >
            {message.role === 'assistant' ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              message.content
            )}
            {message.role === 'assistant' && isStreaming && index === messages.length - 1 && (
              <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle" />
            )}
          </div>
        </div>
      ))}

      <div ref={bottomRef} />
    </div>
  )
}

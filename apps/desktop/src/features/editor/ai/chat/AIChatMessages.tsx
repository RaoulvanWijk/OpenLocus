import { LoaderCircle } from 'lucide-react'

interface AIChatMessageProps {
  message: {
    id: string
    role: 'user' | 'assistant'
    content: string
  }
}

export function AIChatMessage({ message }: AIChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
          isUser ? 'bg-gray-800 text-white' : 'border border-gray-200 bg-white text-gray-800'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}

interface AIChatMessagesProps {
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
  }>
  isLoading?: boolean
}

export function AIChatMessages({ messages, isLoading = false }: AIChatMessagesProps) {
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-center text-sm text-gray-400">No messages yet</p>
        </div>
      )}

      {messages.map((message) => (
        <AIChatMessage key={message.id} message={message} />
      ))}

      {isLoading && (
        <div className="flex gap-3">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <LoaderCircle className="size-4 animate-spin text-gray-400" />
          </div>
        </div>
      )}
    </div>
  )
}

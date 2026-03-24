import { useState } from 'react'
import { AIChatMessages } from './AIChatMessages'
import { AITextBox } from './AITextBox'

interface AIPanelProps {
  noteId?: string
}

export function AIPanel({ noteId }: AIPanelProps) {
  const [messages, setMessages] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; content: string }>
  >([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (content: string) => {
    if (!noteId) {
      // Show error - no active note
      return
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // TODO: Call AI API with message + note context
    // For now, just simulate
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="flex h-screen flex-1 flex-col">
      <AIChatMessages messages={messages} isLoading={isLoading} />
      <AITextBox onSend={handleSendMessage} isLoading={isLoading} />
    </div>
  )
}

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useCallback, useRef, useState } from 'react'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatTokenEvent {
  token: string
}

interface ChatErrorEvent {
  message: string
}

export function useAiChat(noteContent: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const unlistensRef = useRef<Array<() => void>>([])

  // Ref keeps the latest noteContent accessible inside the sendMessage callback
  // without stale-closure issues — the ref is updated on every render.
  const noteContentRef = useRef(noteContent)
  noteContentRef.current = noteContent

  const stopListeners = () => {
    unlistensRef.current.forEach((fn) => fn())
    unlistensRef.current = []
  }

  const sendMessage = useCallback(
    async (userMessage: string) => {
      const content = noteContentRef.current
      console.log('[chat] noteContent length:', content.length)
      console.log('[chat] noteContent preview:', content.slice(0, 200))

      const updated: Message[] = [...messages, { role: 'user', content: userMessage }]
      setMessages([...updated, { role: 'assistant', content: '' }])
      setIsLoading(true)

      const unlistenToken = await listen<ChatTokenEvent>('chat_token', (event) => {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: prev[prev.length - 1].content + event.payload.token },
        ])
      })

      const unlistenDone = await listen('chat_done', () => {
        setIsLoading(false)
        stopListeners()
      })

      const unlistenError = await listen<ChatErrorEvent>('chat_error', (event) => {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: `Error: ${event.payload.message}` },
        ])
        setIsLoading(false)
        stopListeners()
      })

      unlistensRef.current = [unlistenToken, unlistenDone, unlistenError]

      try {
        await invoke('chat', { messages: updated, noteContent: content })
      } catch (e) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: `Error: ${String(e)}` },
        ])
        setIsLoading(false)
        stopListeners()
      }
    },
    [messages],
  )

  function clearMessages() {
    stopListeners()
    setMessages([])
    setIsLoading(false)
  }

  return { messages, isLoading, sendMessage, clearMessages }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { startChatStream, type ChatMessage } from '../lib/chat'

const INPUT_MIN_LENGTH = 1
const INPUT_MAX_LENGTH = 4000
const NOTE_CONTEXT_CHAR_BUDGET = 12000

export type Message = ChatMessage & {
  id: string
}

export type UseChatResult = {
  messages: Message[]
  input: string
  isStreaming: boolean
  chatError: string | null
  sendMessage: (text: string) => void
  onInputChange: (value: string) => void
  resetChat: () => void
  maxLength: number
}

function createMessage(role: Message['role'], content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  }
}

export function useChat(noteContent: string): UseChatResult {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const messagesRef = useRef<Message[]>([])
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(
    () => () => {
      cleanupRef.current?.()
    },
    [],
  )

  const clearChatError = useCallback(() => {
    setChatError(null)
  }, [])

  const onInputChange = useCallback(
    (value: string) => {
      setInput(value)
      if (chatError) {
        clearChatError()
      }
    },
    [chatError, clearChatError],
  )

  const sendMessage = useCallback(
    (text: string) => {
      if (isStreaming) return

      const normalizedText = text.trim()

      if (normalizedText.length < INPUT_MIN_LENGTH || normalizedText.length > INPUT_MAX_LENGTH) {
        setChatError(
          `Message must be between ${INPUT_MIN_LENGTH} and ${INPUT_MAX_LENGTH} characters.`,
        )
        return
      }

      cleanupRef.current?.()
      cleanupRef.current = null

      setChatError(null)
      setInput('')
      setIsStreaming(true)

      const userMessage = createMessage('user', normalizedText)
      const assistantPlaceholder = createMessage('assistant', '')

      const previousMessages = messagesRef.current
      const nextConversation = [...previousMessages, userMessage]

      const nextMessagesForState = [...nextConversation, assistantPlaceholder]
      messagesRef.current = nextMessagesForState
      setMessages(nextMessagesForState)

      const trimmedNoteContent =
        noteContent.length > NOTE_CONTEXT_CHAR_BUDGET
          ? noteContent.slice(0, NOTE_CONTEXT_CHAR_BUDGET)
          : noteContent

      if (trimmedNoteContent.length !== noteContent.length) {
        console.warn(
          '[ai] Note content was truncated before sending to model to stay within context budget.',
        )
      }

      const cleanup = startChatStream(nextConversation, trimmedNoteContent, {
        onToken: (token) => {
          setMessages((currentMessages) => {
            const updatedMessages = [...currentMessages]
            const lastMessage = updatedMessages[updatedMessages.length - 1]

            if (lastMessage?.role === 'assistant') {
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                content: `${lastMessage.content}${token}`,
              }
            }

            messagesRef.current = updatedMessages
            return updatedMessages
          })
        },
        onDone: () => {
          cleanupRef.current?.()
          cleanupRef.current = null
          setIsStreaming(false)
        },
        onError: (message) => {
          cleanupRef.current?.()
          cleanupRef.current = null

          setMessages((currentMessages) => {
            const updatedMessages = [...currentMessages]
            const lastMessage = updatedMessages[updatedMessages.length - 1]
            if (lastMessage?.role === 'assistant' && !lastMessage.content) {
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                content: `Error: ${message}`,
              }
            }

            messagesRef.current = updatedMessages
            return updatedMessages
          })

          setInput(userMessage.content)
          setChatError(message)
          setIsStreaming(false)
        },
      })

      cleanupRef.current = cleanup
    },
    [isStreaming, noteContent],
  )

  const resetChat = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    messagesRef.current = []
    setMessages([])
    setInput('')
    setChatError(null)
    setIsStreaming(false)
  }, [])

  return {
    messages,
    input,
    isStreaming,
    chatError,
    sendMessage,
    onInputChange,
    resetChat,
    maxLength: INPUT_MAX_LENGTH,
  }
}

import { invoke } from '@tauri-apps/api/core'

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ChatCallbacks = {
  onToken: (token: string) => void
  onDone: () => void
  onError: (message: string) => void
}

function toErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return 'Unknown chat failure.'
}

export async function startChatStream(
  messages: ChatMessage[],
  noteContent: string,
  callbacks: ChatCallbacks,
): Promise<() => void> {
  let cleanedUp = false

  const cleanup = () => {
    cleanedUp = true
  }

  // 1. Vertaal de front-end data naar jouw specifieke Rust 'ChatInput' struct
  const userMessage = messages[messages.length - 1]?.content || ''
  const chatHistory = messages.slice(0, -1).map((m) => ({
    role: m.role,
    content: m.content,
  }))
  const documentContext = noteContent.trim().length > 0 ? noteContent : null

  // 2. Roep het backend commando aan
  invoke<string>('chat', {
    input: {
      document_context: documentContext,
      chat_history: chatHistory,
      user_message: userMessage,
    },
  })
    .then(async (fullResponse) => {
      if (cleanedUp) return

      // Omdat de backend niet écht streamt, simuleren we hier een 'typewriter' effect.
      // Dit geeft de gebruiker het visuele gevoel van een stream.
      const chunkSize = 3 // Hoeveel karakters per keer
      for (let i = 0; i < fullResponse.length; i += chunkSize) {
        if (cleanedUp) break

        const token = fullResponse.slice(i, i + chunkSize)
        callbacks.onToken(token)

        // Een micro-pauze van 10ms voor het vloeiende effect
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      if (!cleanedUp) {
        callbacks.onDone()
      }
    })
    .catch((error: unknown) => {
      if (cleanedUp) return
      callbacks.onError(toErrorMessage(error))
    })

  return cleanup
}

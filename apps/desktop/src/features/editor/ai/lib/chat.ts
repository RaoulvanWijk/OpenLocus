import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

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
  return 'Unknown chat stream failure.'
}

export function startChatStream(
  messages: ChatMessage[],
  noteContent: string,
  callbacks: ChatCallbacks,
): () => void {
  let cleanedUp = false
  const unlisteners: Array<() => void> = []

  const cleanup = () => {
    if (cleanedUp) return
    cleanedUp = true
    for (const unlisten of unlisteners.splice(0)) {
      unlisten()
    }
  }

  const registerUnlisten = (unlisten: () => void) => {
    if (cleanedUp) {
      unlisten()
      return
    }

    unlisteners.push(unlisten)
  }

  void (async () => {
    try {
      const [unlistenToken, unlistenDone, unlistenError] = await Promise.all([
        listen<{ token: string }>('chat_token', (event) => {
          if (cleanedUp) return
          callbacks.onToken(event.payload.token)
        }),
        listen('chat_done', () => {
          if (cleanedUp) return
          callbacks.onDone()
        }),
        listen<{ message: string }>('chat_error', (event) => {
          if (cleanedUp) return
          callbacks.onError(event.payload.message)
        }),
      ])

      registerUnlisten(unlistenToken)
      registerUnlisten(unlistenDone)
      registerUnlisten(unlistenError)

      if (cleanedUp) return

      await invoke('chat', { messages, noteContent })
    } catch (error) {
      if (cleanedUp) return
      callbacks.onError(toErrorMessage(error))
    }
  })()

  return cleanup
}

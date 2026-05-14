import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { create } from 'zustand'
import { startChatStream, type ChatMessage } from '../lib/chat'
import {
  downloadModel,
  getModelStatus,
  listModels,
  type ModelError,
  type ModelRow,
  type ModelStatus,
} from '../lib/model'

// Constants
const INPUT_MIN_LENGTH = 1
const INPUT_MAX_LENGTH = 4000
const NOTE_CONTEXT_CHAR_BUDGET = 12000
const DEFAULT_MODEL_ID = 'ministral-3b'

// Types
export type Message = ChatMessage & {
  id: string
}

type DownloadProgress = {
  loaded: number
  total: number
}

// Ollama specific payload for pull progress
type OllamaPullProgress = {
  status: string
  completed?: number
  total?: number
}

type AiStore = {
  // Model state
  models: ModelRow[]
  activeModelId: string
  modelStatus: ModelStatus
  downloadProgressByModel: Record<string, DownloadProgress>
  modelError: string | null

  // Chat state
  messages: Message[]
  input: string
  isStreaming: boolean
  chatError: string | null

  // Model actions
  setActiveModelId: (id: string) => void
  refreshModelStatus: () => Promise<void>
  refreshModels: () => Promise<void>
  downloadActiveModel: () => Promise<void>
  autoSelectModel: () => void
  initListeners: () => () => void

  // Chat actions
  sendMessage: (noteContent: string) => Promise<void>
  onInputChange: (value: string) => void
  resetChat: () => void
  isChatOpen: boolean
  toggleChat: () => void
  setChatToggle: (fn: () => void, isCollapsed: boolean) => void

  // Internal
  maxLength: number
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as ModelError).message)
  }
  return 'Unknown error'
}

function createMessage(role: Message['role'], content: string): Message {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  }
}

let activeStreamCleanup: (() => void) | null = null
let chatToggleFn: (() => void) | null = null

export const useAiStore = create<AiStore>((set, get) => ({
  // Model state
  models: [],
  activeModelId: DEFAULT_MODEL_ID,
  modelStatus: { downloaded: false, loaded: false },
  downloadProgressByModel: {},
  modelError: null,

  // Chat state
  messages: [],
  input: '',
  isStreaming: false,
  chatError: null,
  isChatOpen: true,

  maxLength: INPUT_MAX_LENGTH,

  // Model actions
  setActiveModelId: (id: string) => {
    set({
      activeModelId: id,
      modelStatus: { downloaded: false, loaded: false },
      modelError: null,
      downloadProgressByModel: { [id]: { loaded: 0, total: 0 } },
    })

    // Update the LLM client configuration in the backend with the new ollama_id
    const currentModel = get().models.find((m) => m.id === id)
    if (currentModel) {
      invoke('set_llm_config', {
        baseUrl: 'http://localhost:11434/v1',
        model: currentModel.ollama_id,
        apiKey: null,
      }).catch(console.error)
    }

    void get().refreshModelStatus()
  },

  refreshModelStatus: async () => {
    try {
      // Assuming getModelStatus checks the database for the 'downloaded' flag
      const status = await getModelStatus(get().activeModelId)
      set({ modelStatus: status, modelError: null })
    } catch (error) {
      set({ modelError: getErrorMessage(error) })
    }
  },

  refreshModels: async () => {
    try {
      const models = await listModels()
      set({ models })
      get().autoSelectModel()
    } catch (error) {
      set({ modelError: getErrorMessage(error) })
    }
  },

  downloadActiveModel: async () => {
    const { activeModelId } = get()

    // 1. Forceer een refresh als er nog geen modellen zijn geladen
    if (get().models.length === 0) {
      await get().refreshModels()
    }

    const currentModel = get().models.find((m) => m.id === activeModelId)

    if (!currentModel) {
      console.error('[AI Store] Model not found for ID:', activeModelId)
      return
    }

    // 2. Start de pull met de ollama_id (bijv. ministral-3:3b)
    await downloadModel(currentModel.ollama_id, (loaded, total) => {
      set((state) => ({
        downloadProgressByModel: {
          ...state.downloadProgressByModel,
          [activeModelId]: { loaded, total },
        },
      }))
    })

    await get().refreshModelStatus()
  },

  autoSelectModel: () => {
    const { models, activeModelId, downloadProgressByModel } = get()
    if (models.length === 0) return

    const currentModel = models.find((m) => m.id === activeModelId)
    if (currentModel?.downloaded) return

    const inProgressModelId = Object.entries(downloadProgressByModel).find(
      ([, progress]) => progress.total === 0 || progress.loaded < progress.total,
    )?.[0]

    if (inProgressModelId && inProgressModelId !== activeModelId) {
      set({ activeModelId: inProgressModelId })
      return
    }

    const firstDownloaded = models.find((m) => m.downloaded)
    if (firstDownloaded && firstDownloaded.id !== activeModelId) {
      set({ activeModelId: firstDownloaded.id })
    }
  },

  initListeners: () => {
    let isMounted = true
    let progressThrottleTimer: ReturnType<typeof setTimeout> | null = null
    const pendingProgress: Record<string, { loaded: number; total: number }> = {}

    const flushProgress = () => {
      progressThrottleTimer = null
      if (!isMounted) return
      set((state) => ({
        downloadProgressByModel: {
          ...state.downloadProgressByModel,
          ...pendingProgress,
        },
      }))
    }

    // Listen to the new Ollama pull event
    const unlistenPromise = listen<OllamaPullProgress>('model-pull-progress', (event) => {
      if (!isMounted) return

      const { status, completed, total } = event.payload
      const { activeModelId } = get() // Correlate progress to the actively downloading model

      if (completed !== undefined && total !== undefined) {
        pendingProgress[activeModelId] = { loaded: completed, total: total }
      }

      if (status === 'success') {
        if (progressThrottleTimer) {
          clearTimeout(progressThrottleTimer)
          progressThrottleTimer = null
        }
        flushProgress()

        // Mark model as downloaded in the database via an invoke command if necessary here,
        // or ensure your Rust pull_model command updates the SQLite DB upon success.

        void get().refreshModels()
        void get().refreshModelStatus()
        return
      }

      if (!progressThrottleTimer && completed !== undefined) {
        progressThrottleTimer = setTimeout(flushProgress, 250)
      }
    })

    return () => {
      isMounted = false
      if (progressThrottleTimer) clearTimeout(progressThrottleTimer)
      void unlistenPromise.then((unlisten) => unlisten())
    }
  },

  // Chat actions
  sendMessage: async (noteContent: string) => {
    const { input, isStreaming, messages, activeModelId, models } = get()

    if (isStreaming) return

    activeStreamCleanup?.()
    activeStreamCleanup = null

    const normalizedText = input.trim()
    if (normalizedText.length < INPUT_MIN_LENGTH || normalizedText.length > INPUT_MAX_LENGTH) {
      set({
        chatError: `Message must be between ${INPUT_MIN_LENGTH} and ${INPUT_MAX_LENGTH} characters.`,
      })
      return
    }

    set({ chatError: null, input: '', isStreaming: true })

    const userMessage = createMessage('user', normalizedText)
    const assistantPlaceholder = createMessage('assistant', '')
    const nextMessages = [...messages, userMessage, assistantPlaceholder]

    set({ messages: nextMessages })

    const trimmedNoteContent =
      noteContent.length > NOTE_CONTEXT_CHAR_BUDGET
        ? noteContent.slice(0, NOTE_CONTEXT_CHAR_BUDGET)
        : noteContent

    const messagesToSend = [...messages, userMessage]

    // Ensure the backend knows which model to use before sending the chat
    const currentModel = models.find((m) => m.id === activeModelId)
    if (currentModel) {
      await invoke('set_llm_config', {
        baseUrl: 'http://localhost:11434/v1',
        model: currentModel.ollama_id,
        apiKey: null,
      }).catch(console.error)
    }

    // Call the chat command in Rust.
    // Note: If you updated your Rust client to return the full response instead of a stream,
    // you may need to adjust `startChatStream` in `../lib/chat` to handle a standard promise
    // rather than a chunked stream.
    activeStreamCleanup = await startChatStream(
      messagesToSend,
      trimmedNoteContent,
      currentModel?.ollama_id ?? get().activeModelId, // modelId toevoegen
      {
        onToken: (token) => {
          set((state) => {
            const updated = [...state.messages]
            const last = updated[updated.length - 1]
            if (last?.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: `${last.content}${token}`,
              }
            }
            return { messages: updated }
          })
        },
        onDone: () => {
          activeStreamCleanup?.()
          activeStreamCleanup = null
          set({ isStreaming: false })
        },
        onError: (message) => {
          activeStreamCleanup?.()
          activeStreamCleanup = null
          set((state) => {
            const updated = [...state.messages]
            const last = updated[updated.length - 1]
            if (last?.role === 'assistant' && !last.content) {
              updated[updated.length - 1] = {
                ...last,
                content: `Error: ${message}`,
              }
            }
            return {
              messages: updated,
              chatError: message,
              isStreaming: false,
              input: userMessage.content,
            }
          })
        },
      },
    )
  },

  onInputChange: (value: string) => {
    set({ input: value })
    if (get().chatError) {
      set({ chatError: null })
    }
  },

  resetChat: () => {
    activeStreamCleanup?.()
    activeStreamCleanup = null
    set({
      messages: [],
      input: '',
      chatError: null,
      isStreaming: false,
    })
  },

  toggleChat: () => {
    if (chatToggleFn) chatToggleFn()
  },
  setChatToggle: (fn, isCollapsed) => {
    chatToggleFn = fn
    set({ isChatOpen: !isCollapsed })
  },
}))

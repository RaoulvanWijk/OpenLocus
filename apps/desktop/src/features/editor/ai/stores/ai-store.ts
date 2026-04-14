import { listen } from '@tauri-apps/api/event'
import { create } from 'zustand'
import { startChatStream, type ChatMessage } from '../lib/chat'
import {
  downloadModel,
  getModelStatus,
  listModels,
  type ModelDownloadProgress,
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

  maxLength: INPUT_MAX_LENGTH,

  // Model actions
  setActiveModelId: (id: string) => {
    set({
      activeModelId: id,
      modelStatus: { downloaded: false, loaded: false },
      modelError: null,
      downloadProgressByModel: { [id]: { loaded: 0, total: 0 } },
    })
    void get().refreshModelStatus()
  },

  refreshModelStatus: async () => {
    try {
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
      // Auto-select if needed
      get().autoSelectModel()
    } catch (error) {
      set({ modelError: getErrorMessage(error) })
    }
  },

  downloadActiveModel: async () => {
    const { activeModelId } = get()
    try {
      set({ modelError: null })
      await downloadModel(activeModelId, (loaded, total) => {
        set((state) => ({
          downloadProgressByModel: {
            ...state.downloadProgressByModel,
            [activeModelId]: { loaded, total },
          },
        }))
      })
      await get().refreshModelStatus()
    } catch (error) {
      set({ modelError: getErrorMessage(error) })
    }
  },

  autoSelectModel: () => {
    const { models, activeModelId, downloadProgressByModel } = get()
    if (models.length === 0) return

    const currentModel = models.find((m) => m.id === activeModelId)
    if (currentModel?.downloaded) return

    // Switch to in-progress download if any
    const inProgressModelId = Object.entries(downloadProgressByModel).find(
      ([, progress]) => progress.total === 0 || progress.loaded < progress.total,
    )?.[0]

    if (inProgressModelId && inProgressModelId !== activeModelId) {
      set({ activeModelId: inProgressModelId })
      return
    }

    // Switch to first downloaded model
    const firstDownloaded = models.find((m) => m.downloaded)
    if (firstDownloaded && firstDownloaded.id !== activeModelId) {
      set({ activeModelId: firstDownloaded.id })
    }
  },

  initListeners: () => {
    let isMounted = true
    const unlistenPromise = listen<ModelDownloadProgress>('model_download_progress', (event) => {
      if (!isMounted) return

      const { modelId, loaded, total } = event.payload
      set((state) => ({
        downloadProgressByModel: {
          ...state.downloadProgressByModel,
          [modelId]: { loaded, total },
        },
      }))

      // When download completes, refresh
      if (total > 0 && loaded >= total) {
        void get().refreshModels()
        void get().refreshModelStatus()
      }
    })

    return () => {
      isMounted = false
      void unlistenPromise.then((unlisten) => unlisten())
    }
  },

  // Chat actions
  sendMessage: async (noteContent: string) => {
    const { input, isStreaming, messages } = get()

    if (isStreaming) return

    activeStreamCleanup?.()
    activeStreamCleanup = null

    const normalizedText = input.trim()
    if (
      normalizedText.length < INPUT_MIN_LENGTH ||
      normalizedText.length > INPUT_MAX_LENGTH
    ) {
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

    if (trimmedNoteContent.length !== noteContent.length) {
      console.warn(
        '[ai] Note content was truncated before sending to model to stay within context budget.',
      )
    }

    // Send only the conversation history + user message (NOT the empty assistant placeholder)
    const messagesToSend = [...messages, userMessage]

    activeStreamCleanup = await startChatStream(messagesToSend, trimmedNoteContent, {
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
          return { messages: updated, chatError: message, isStreaming: false, input: userMessage.content }
        })
      },
    })
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
}))

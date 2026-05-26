import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { create } from 'zustand'
import {
  addCustomModel as addCustomModelInvoke,
  cancelModelPull,
  downloadModel,
  getModelStatus,
  listModels,
  removeCustomModel as removeCustomModelInvoke,
  verifyCustomModels,
  type AddCustomModelInput,
  type ModelError,
  type ModelRow,
  type ModelStatus,
} from '../lib/model'

const ACTIVE_MODEL_SETTINGS_KEY = 'active_model_id'

// Constants
const INPUT_MIN_LENGTH = 1
const INPUT_MAX_LENGTH = 4000
const NOTE_CONTEXT_CHAR_BUDGET = 12000
const DEFAULT_MODEL_ID = 'ministral-3b'
const TYPEWRITER_CHUNK_SIZE = 3
const TYPEWRITER_DELAY_MS = 10

// Types
export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type Message = ChatMessage & {
  id: string
}

type DownloadProgress = {
  loaded: number
  total: number
}

type OllamaPullProgress = {
  model_id: string
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
  missingCustomModelIds: string[]
  isHydrated: boolean

  // Chat state
  messages: Message[]
  input: string
  isStreaming: boolean
  chatError: string | null

  // Model actions
  setActiveModelId: (id: string) => void
  refreshModelStatus: () => Promise<void>
  refreshModels: () => Promise<void>
  downloadModel: (modelId: string) => Promise<void>
  downloadActiveModel: () => Promise<void>
  cancelDownload: (modelId: string) => Promise<void>
  autoSelectModel: () => void
  initListeners: () => () => void
  hydrateActiveModel: () => Promise<void>
  addCustomModel: (input: AddCustomModelInput) => Promise<ModelRow>
  removeCustomModel: (modelId: string) => Promise<void>

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

// Simulates a typewriter stream effect for the full agent response
async function typewriterEffect(
  fullResponse: string,
  onToken: (token: string) => void,
  isCancelled: () => boolean,
): Promise<void> {
  for (let i = 0; i < fullResponse.length; i += TYPEWRITER_CHUNK_SIZE) {
    if (isCancelled()) break
    const token = fullResponse.slice(i, i + TYPEWRITER_CHUNK_SIZE)
    onToken(token)
    await new Promise((resolve) => setTimeout(resolve, TYPEWRITER_DELAY_MS))
  }
}

let cancelled = false
let chatToggleFn: (() => void) | null = null

export const useAiStore = create<AiStore>((set, get) => ({
  // Model state
  models: [],
  activeModelId: DEFAULT_MODEL_ID,
  modelStatus: { downloaded: false, loaded: false },
  downloadProgressByModel: {},
  modelError: null,
  missingCustomModelIds: [],
  isHydrated: false,

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
    })

    const currentModel = get().models.find((m) => m.id === id)
    if (currentModel) {
      invoke('set_llm_config', {
        baseUrl: 'http://localhost:11434/v1',
        model: currentModel.ollama_id,
        apiKey: null,
      }).catch(console.error)
    }

    invoke('settings_set', {
      key: ACTIVE_MODEL_SETTINGS_KEY,
      value: id,
    }).catch(console.error)

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
      const missing = await verifyCustomModels().catch(() => [] as string[])
      const models = await listModels()
      set({ models, missingCustomModelIds: missing })

      if (missing.includes(get().activeModelId)) {
        get().setActiveModelId(DEFAULT_MODEL_ID)
      }

      get().autoSelectModel()
    } catch (error) {
      set({ modelError: getErrorMessage(error) })
    }
  },

  downloadModel: async (modelId: string) => {
    if (get().models.length === 0) {
      await get().refreshModels()
    }

    const model = get().models.find((m) => m.id === modelId)
    if (!model) {
      console.error('[AI Store] Model not found for ID:', modelId)
      return
    }

    if (model.is_custom && model.file_path) {
      return
    }

    set((state) => ({
      downloadProgressByModel: {
        ...state.downloadProgressByModel,
        [modelId]: { loaded: 0, total: 0 },
      },
      modelError: null,
    }))

    try {
      await downloadModel(modelId, model.ollama_id)
    } catch (error) {
      set({ modelError: getErrorMessage(error) })
      set((state) => {
        const { [modelId]: _, ...rest } = state.downloadProgressByModel
        return { downloadProgressByModel: rest }
      })
    }
  },

  downloadActiveModel: async () => {
    await get().downloadModel(get().activeModelId)
  },

  cancelDownload: async (modelId: string) => {
    try {
      await cancelModelPull(modelId)
    } catch (error) {
      set({ modelError: getErrorMessage(error) })
    }
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

    const unlistenPromise = listen<OllamaPullProgress>('model-pull-progress', (event) => {
      if (!isMounted) return

      const { model_id, status, completed, total } = event.payload

      if (status === 'cancelled' || status === 'ended') {
        if (progressThrottleTimer) {
          clearTimeout(progressThrottleTimer)
          progressThrottleTimer = null
        }
        delete pendingProgress[model_id]
        set((state) => {
          const { [model_id]: _, ...rest } = state.downloadProgressByModel
          return { downloadProgressByModel: rest }
        })
        return
      }

      if (typeof completed === 'number' && typeof total === 'number') {
        pendingProgress[model_id] = { loaded: completed, total }
      }

      if (status === 'success') {
        if (progressThrottleTimer) {
          clearTimeout(progressThrottleTimer)
          progressThrottleTimer = null
        }
        flushProgress()
        setTimeout(() => {
          set((state) => {
            const { [model_id]: _, ...rest } = state.downloadProgressByModel
            return { downloadProgressByModel: rest }
          })
        }, 1000)
        void get().refreshModels()
        if (model_id === get().activeModelId) void get().refreshModelStatus()
        return
      }

      if (!progressThrottleTimer && Object.keys(pendingProgress).length > 0) {
        progressThrottleTimer = setTimeout(flushProgress, 250)
      }
    })

    return () => {
      isMounted = false
      if (progressThrottleTimer) clearTimeout(progressThrottleTimer)
      void unlistenPromise.then((unlisten) => unlisten())
    }
  },

  hydrateActiveModel: async () => {
    try {
      const savedId = await invoke<string | null>('settings_get', {
        key: ACTIVE_MODEL_SETTINGS_KEY,
      })
      if (savedId) {
        const candidate = get().models.find((m) => m.id === savedId)
        const usable = candidate && (!candidate.is_custom || candidate.downloaded)
        if (usable) {
          get().setActiveModelId(savedId)
        }
      }
    } catch (error) {
      console.error('[AI Store] hydrateActiveModel failed', error)
    } finally {
      set({ isHydrated: true })
    }
  },

  addCustomModel: async (input: AddCustomModelInput) => {
    try {
      const row = await addCustomModelInvoke(input)
      await get().refreshModels()
      get().setActiveModelId(row.id)
      return row
    } catch (error) {
      set({ modelError: getErrorMessage(error) })
      throw error
    }
  },

  removeCustomModel: async (modelId: string) => {
    try {
      const wasActive = get().activeModelId === modelId
      await removeCustomModelInvoke(modelId)
      await get().refreshModels()
      if (wasActive) {
        get().setActiveModelId(DEFAULT_MODEL_ID)
      }
    } catch (error) {
      set({ modelError: getErrorMessage(error) })
      throw error
    }
  },

  // Chat actions
  sendMessage: async (noteContent: string) => {
    const { input, isStreaming, messages, activeModelId, models } = get()

    if (isStreaming) return

    cancelled = true // cancel any previous typewriter still running
    cancelled = false

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
    set({ messages: [...messages, userMessage, assistantPlaceholder] })

    const trimmedNoteContent =
      noteContent.length > NOTE_CONTEXT_CHAR_BUDGET
        ? noteContent.slice(0, NOTE_CONTEXT_CHAR_BUDGET)
        : noteContent

    // Ensure the backend knows which model to use
    const currentModel = models.find((m) => m.id === activeModelId)
    if (currentModel) {
      await invoke('set_llm_config', {
        baseUrl: 'http://localhost:11434/v1',
        model: currentModel.ollama_id,
        apiKey: null,
      }).catch(console.error)
    }

    try {
      // Call the agentic command — waits for the full response including any tool calls
      const fullResponse = await invoke<string>('run_agent', {
        userMessage: normalizedText,
        noteContext: trimmedNoteContent || null,
      })

      // Stream the response token by token for the typewriter effect
      await typewriterEffect(
        fullResponse,
        (token) => {
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
        () => cancelled,
      )

      set({ isStreaming: false })
    } catch (error) {
      const message = getErrorMessage(error)
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
    }
  },

  onInputChange: (value: string) => {
    set({ input: value })
    if (get().chatError) {
      set({ chatError: null })
    }
  },

  resetChat: () => {
    cancelled = true
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

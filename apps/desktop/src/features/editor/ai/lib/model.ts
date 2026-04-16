import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

export type ModelStatus = {
  downloaded: boolean
  loaded: boolean
}

export type ModelRow = {
  id: string
  ollama_id: string
  name: string
  description: string
  size_gb: string
  downloaded: boolean
}

// Ollama's specifieke pull progress event
export type OllamaPullProgress = {
  status: string
  completed?: number
  total?: number
}

export type ModelError = {
  type: 'model_error'
  operation: 'get_status' | 'download' | 'list'
  message: string
  cause?: unknown
}

function toModelError(operation: ModelError['operation'], error: unknown): ModelError {
  if (typeof error === 'string') {
    return {
      type: 'model_error',
      operation,
      message: error,
      cause: error,
    }
  }

  if (error instanceof Error) {
    return {
      type: 'model_error',
      operation,
      message: error.message,
      cause: error,
    }
  }

  return {
    type: 'model_error',
    operation,
    message: 'Unknown model operation failure.',
    cause: error,
  }
}

// Deze checkt in de database of hij gedownload is (of je haalt dit uit de backend)
export async function getModelStatus(modelId: string): Promise<ModelStatus> {
  try {
    return await invoke<ModelStatus>('get_model_status', { modelId })
  } catch (error) {
    throw toModelError('get_status', error)
  }
}

export async function listModels(): Promise<ModelRow[]> {
  try {
    // Verander 'models_list' naar 'get_models'
    return await invoke<ModelRow[]>('get_models')
  } catch (error) {
    throw toModelError('list', error)
  }
}
// Zodat we de database kunnen updaten als de download slaagt
export async function setModelDownloaded(modelId: string): Promise<void> {
  try {
    await invoke('set_model_downloaded', { modelId })
  } catch (error) {
    console.error('Failed to update database status', error)
  }
}

export async function downloadModel(
  modelOllamaId: string, // Vanuit ai-store.ts sturen we nu de ollama_id mee!
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  // 1. Luister naar het nieuwe Ollama-event in plaats van het oude
  const unlisten = await listen<OllamaPullProgress>('model-pull-progress', (event) => {
    if (event.payload.completed !== undefined && event.payload.total !== undefined) {
      onProgress(event.payload.completed, event.payload.total)
    }
  })

  try {
    // 2. Roep het NIEUWE commando aan (pull_model) met de juiste parameter (modelName)
    await invoke('pull_model', { modelName: modelOllamaId })
  } catch (error) {
    throw toModelError('download', error)
  } finally {
    unlisten()
  }
}

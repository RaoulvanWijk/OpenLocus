import { invoke } from '@tauri-apps/api/core'

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

export type OllamaPullProgress = {
  model_id: string
  status: string
  completed?: number
  total?: number
}

export type ModelError = {
  type: 'model_error'
  operation: 'get_status' | 'download' | 'list' | 'cancel'
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

export async function downloadModel(modelId: string, modelOllamaId: string): Promise<void> {
  try {
    await invoke('pull_model', { modelId, modelName: modelOllamaId })
  } catch (error) {
    throw toModelError('download', error)
  }
}

export async function cancelModelPull(modelId: string): Promise<void> {
  try {
    await invoke('cancel_model_pull', { modelId })
  } catch (error) {
    throw toModelError('cancel', error)
  }
}

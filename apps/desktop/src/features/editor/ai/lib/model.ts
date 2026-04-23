import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

export type ModelStatus = {
  downloaded: boolean
  loaded: boolean
}

export type ModelRow = {
  id: string
  name: string
  downloaded: boolean
}

export type ModelDownloadProgress = {
  modelId: string
  loaded: number
  total: number
}

export type ModelError = {
  type: 'model_error'
  operation: 'get_status' | 'download' | 'load' | 'list'
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

export async function getModelStatus(modelId: string): Promise<ModelStatus> {
  try {
    return await invoke<ModelStatus>('get_model_status', { modelId })
  } catch (error) {
    throw toModelError('get_status', error)
  }
}

export async function listModels(): Promise<ModelRow[]> {
  try {
    return await invoke<ModelRow[]>('models_list')
  } catch (error) {
    throw toModelError('list', error)
  }
}

export async function downloadModel(
  modelId: string,
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  const unlisten = await listen<ModelDownloadProgress>('model_download_progress', (event) => {
    if (event.payload.modelId !== modelId) {
      return
    }

    onProgress(event.payload.loaded, event.payload.total)
  })

  try {
    await invoke('download_model', { modelId })
  } catch (error) {
    throw toModelError('download', error)
  } finally {
    unlisten()
  }
}

export async function loadModel(modelId: string): Promise<void> {
  try {
    await invoke('load_model', { modelId })
  } catch (error) {
    throw toModelError('load', error)
  }
}

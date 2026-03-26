import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

export type ModelStatus = {
  downloaded: boolean
  loaded: boolean
}

export type ModelError = {
  type: 'model_error'
  operation: 'get_status' | 'download' | 'load'
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

export async function getModelStatus(): Promise<ModelStatus> {
  try {
    return await invoke<ModelStatus>('get_model_status')
  } catch (error) {
    throw toModelError('get_status', error)
  }
}

export async function downloadModel(
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  const unlisten = await listen<{ loaded: number; total: number }>(
    'model_download_progress',
    (event) => {
      onProgress(event.payload.loaded, event.payload.total)
    },
  )

  try {
    await invoke('download_model')
  } catch (error) {
    throw toModelError('download', error)
  } finally {
    unlisten()
  }
}

export async function loadModel(): Promise<void> {
  try {
    await invoke('load_model')
  } catch (error) {
    throw toModelError('load', error)
  }
}

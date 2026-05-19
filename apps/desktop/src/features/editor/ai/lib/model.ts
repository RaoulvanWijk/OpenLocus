import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

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
  is_custom: boolean
  file_path: string | null
}

export type OllamaPullProgress = {
  model_id: string
  status: string
  completed?: number
  total?: number
}

export type ModelError = {
  type: 'model_error'
  operation:
    | 'get_status'
    | 'download'
    | 'list'
    | 'cancel'
    | 'add_custom'
    | 'remove_custom'
    | 'verify_custom'
    | 'pick_file'
  message: string
  cause?: unknown
}

export type AddCustomModelInput = {
  name: string
  source:
    | { source_type: 'gguf'; file_path: string }
    | { source_type: 'ollama'; tag: string }
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
    return await invoke<ModelRow[]>('get_models')
  } catch (error) {
    throw toModelError('list', error)
  }
}

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

export async function addCustomModel(input: AddCustomModelInput): Promise<ModelRow> {
  try {
    return await invoke<ModelRow>('add_custom_model', {
      name: input.name,
      source: input.source,
    })
  } catch (error) {
    throw toModelError('add_custom', error)
  }
}

export async function removeCustomModel(modelId: string): Promise<void> {
  try {
    await invoke('remove_custom_model', { modelId })
  } catch (error) {
    throw toModelError('remove_custom', error)
  }
}

export async function verifyCustomModels(): Promise<string[]> {
  try {
    return await invoke<string[]>('verify_custom_models')
  } catch (error) {
    throw toModelError('verify_custom', error)
  }
}

export async function pickGgufFile(): Promise<string | null> {
  try {
    const result = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'GGUF model', extensions: ['gguf'] }],
    })
    if (typeof result === 'string') return result
    return null
  } catch (error) {
    throw toModelError('pick_file', error)
  }
}

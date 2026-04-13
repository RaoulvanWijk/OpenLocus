import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useState } from 'react'
import { listModels, type ModelDownloadProgress, type ModelRow } from '../lib/model'

type DownloadProgress = {
  loaded: number
  total: number
}

type DownloadProgressByModel = Record<string, DownloadProgress>

type UseModelsResult = {
  models: ModelRow[]
  modelsLoading: boolean
  modelsError: string | null
  downloadProgressByModel: DownloadProgressByModel
  refreshModels: () => Promise<void>
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return 'Failed to load available models.'
}

export function useModels(): UseModelsResult {
  const [models, setModels] = useState<ModelRow[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [downloadProgressByModel, setDownloadProgressByModel] = useState<DownloadProgressByModel>(
    {},
  )

  const refreshModels = useCallback(async () => {
    setModelsLoading(true)
    setModelsError(null)

    try {
      const rows = await listModels()
      setModels(rows)
    } catch (error) {
      setModelsError(getErrorMessage(error))
    } finally {
      setModelsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshModels()
  }, [refreshModels])

  useEffect(() => {
    let isMounted = true
    const unlistenPromise = listen<ModelDownloadProgress>('model_download_progress', (event) => {
      if (!isMounted) {
        return
      }

      const { modelId, loaded, total } = event.payload
      setDownloadProgressByModel((current) => ({
        ...current,
        [modelId]: { loaded, total },
      }))

      if (total > 0 && loaded >= total) {
        void refreshModels()
      }
    })

    return () => {
      isMounted = false
      void unlistenPromise.then((unlisten) => unlisten())
    }
  }, [refreshModels])

  return {
    models,
    modelsLoading,
    modelsError,
    downloadProgressByModel,
    refreshModels,
  }
}

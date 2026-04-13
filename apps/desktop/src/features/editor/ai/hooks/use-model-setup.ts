import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useState } from 'react'
import {
  downloadModel,
  getModelStatus,
  loadModel,
  type ModelDownloadProgress,
  type ModelError,
  type ModelStatus,
} from '../lib/model'

type DownloadProgress = {
  loaded: number
  total: number
}

export type UseModelSetupResult = {
  activeModelId: string
  setActiveModelId: (modelId: string) => void
  modelStatus: ModelStatus
  setupLoading: boolean
  setupError: string | null
  downloadProgress: DownloadProgress | null
  refreshStatus: () => Promise<void>
  handleDownload: () => Promise<void>
  handleLoad: () => Promise<void>
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as ModelError).message)
  }

  return 'Unknown model setup failure.'
}

const DEFAULT_MODEL_ID = 'ministral-3b'

export function useModelSetup(initialModelId = DEFAULT_MODEL_ID): UseModelSetupResult {
  const [activeModelId, setActiveModelId] = useState(initialModelId)
  const [modelStatus, setModelStatus] = useState<ModelStatus>({ downloaded: false, loaded: false })
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)

  const refreshStatus = useCallback(async () => {
    const status = await getModelStatus(activeModelId)
    setModelStatus(status)
  }, [activeModelId])

  useEffect(() => {
    setModelStatus({ downloaded: false, loaded: false })
    setSetupError(null)
    setDownloadProgress(null)

    void refreshStatus().catch((error: unknown) => {
      setSetupError(getErrorMessage(error))
    })
  }, [activeModelId, refreshStatus])

  useEffect(() => {
    let isMounted = true
    const unlistenPromise = listen<ModelDownloadProgress>('model_download_progress', (event) => {
      if (!isMounted || event.payload.modelId !== activeModelId) {
        return
      }

      const nextProgress = {
        loaded: event.payload.loaded,
        total: event.payload.total,
      }

      setDownloadProgress(nextProgress)

      if (nextProgress.total > 0 && nextProgress.loaded >= nextProgress.total) {
        void refreshStatus()
      }
    })

    return () => {
      isMounted = false
      void unlistenPromise.then((unlisten) => unlisten())
    }
  }, [activeModelId, refreshStatus])

  const handleDownload = useCallback(async () => {
    setSetupLoading(true)
    setSetupError(null)
    setDownloadProgress(null)

    try {
      await downloadModel(activeModelId, (loaded, total) => {
        setDownloadProgress({ loaded, total })
      })
      await refreshStatus()
    } catch (error) {
      setSetupError(getErrorMessage(error))
    } finally {
      setSetupLoading(false)
      setDownloadProgress(null)
    }
  }, [activeModelId, refreshStatus])

  const handleLoad = useCallback(async () => {
    setSetupLoading(true)
    setSetupError(null)

    try {
      await loadModel(activeModelId)
      await refreshStatus()
    } catch (error) {
      setSetupError(getErrorMessage(error))
    } finally {
      setSetupLoading(false)
    }
  }, [activeModelId, refreshStatus])

  return {
    activeModelId,
    setActiveModelId,
    modelStatus,
    setupLoading,
    setupError,
    downloadProgress,
    refreshStatus,
    handleDownload,
    handleLoad,
  }
}

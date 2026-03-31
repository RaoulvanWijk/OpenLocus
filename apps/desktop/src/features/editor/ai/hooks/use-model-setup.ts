import { useCallback, useEffect, useState } from 'react'
import {
  downloadModel,
  getModelStatus,
  loadModel,
  type ModelError,
  type ModelStatus,
} from '../lib/model'

type DownloadProgress = {
  loaded: number
  total: number
}

export type UseModelSetupResult = {
  modelStatus: ModelStatus
  setupLoading: boolean
  setupError: string | null
  downloadProgress: DownloadProgress | null
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

export function useModelSetup(): UseModelSetupResult {
  const [modelStatus, setModelStatus] = useState<ModelStatus>({ downloaded: false, loaded: false })
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)

  useEffect(() => {
    void getModelStatus()
      .then(setModelStatus)
      .catch((error: unknown) => {
        setSetupError(getErrorMessage(error))
      })
  }, [])

  const handleDownload = useCallback(async () => {
    setSetupLoading(true)
    setSetupError(null)
    setDownloadProgress(null)

    try {
      await downloadModel((loaded, total) => {
        setDownloadProgress({ loaded, total })
      })
      setModelStatus((status) => ({ ...status, downloaded: true }))
    } catch (error) {
      setSetupError(getErrorMessage(error))
    } finally {
      setSetupLoading(false)
      setDownloadProgress(null)
    }
  }, [])

  const handleLoad = useCallback(async () => {
    setSetupLoading(true)
    setSetupError(null)

    try {
      await loadModel()
      setModelStatus((status) => ({ ...status, loaded: true }))
    } catch (error) {
      setSetupError(getErrorMessage(error))
    } finally {
      setSetupLoading(false)
    }
  }, [])

  return {
    modelStatus,
    setupLoading,
    setupError,
    downloadProgress,
    handleDownload,
    handleLoad,
  }
}

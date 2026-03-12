import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useCallback, useEffect, useRef, useState } from 'react'

export type ModelStatus = 'checking' | 'not_downloaded' | 'downloading' | 'loading' | 'ready' | 'error'

interface DownloadProgressEvent {
  loaded: number
  total: number
}

interface ModelStatusResponse {
  downloaded: boolean
  loaded: boolean
}

export function useLocalModel() {
  const [status, setStatus] = useState<ModelStatus>('checking')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const unlistenRef = useRef<(() => void) | null>(null)
  // useRef instead of module-level variable — survives re-renders but resets on unmount
  const loadStartedRef = useRef(false)

  function startLoad() {
    if (loadStartedRef.current) return
    loadStartedRef.current = true
    setStatus('loading')
    invoke('load_model')
      .then(() => setStatus('ready'))
      .catch((e) => {
        loadStartedRef.current = false
        setError(String(e))
        setStatus('error')
      })
  }

  // Check current model status on mount
  useEffect(() => {
    invoke<ModelStatusResponse>('get_model_status')
      .then((s) => {
        if (s.loaded) {
          setStatus('ready')
        } else if (s.downloaded) {
          startLoad()
        } else {
          setStatus('not_downloaded')
        }
      })
      .catch((e) => {
        setError(String(e))
        setStatus('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clean up progress listener on unmount
  useEffect(() => {
    return () => {
      unlistenRef.current?.()
    }
  }, [])

  const startDownload = useCallback(async () => {
    setStatus('downloading')
    setDownloadProgress(0)
    setError(null)

    const unlisten = await listen<DownloadProgressEvent>('model_download_progress', (event) => {
      const { loaded, total } = event.payload
      if (total > 0) {
        setDownloadProgress(Math.round((loaded / total) * 100))
      }
    })
    unlistenRef.current = unlisten

    try {
      await invoke('download_model')
      unlisten()
      unlistenRef.current = null
      startLoad()
    } catch (e) {
      unlisten()
      unlistenRef.current = null
      setError(String(e))
      setStatus('error')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { status, downloadProgress, error, startDownload }
}

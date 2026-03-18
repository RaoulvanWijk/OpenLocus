import { RouterProvider } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { GlobalErrorView } from './features/error/GlobalErrorView'
import { router } from './router'

function App() {
  const [runtimeError, setRuntimeError] = useState<unknown>(null)

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      setRuntimeError(event.error ?? event.message)
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      setRuntimeError(event.reason ?? 'Unhandled promise rejection')
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [])

  if (runtimeError) {
    return <GlobalErrorView error={runtimeError} onRetry={() => setRuntimeError(null)} />
  }

  return <RouterProvider router={router} />
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

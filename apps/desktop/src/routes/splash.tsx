import { createFileRoute } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { relaunch } from '@tauri-apps/plugin-process'
import { useEffect, useRef, useState } from 'react'

export const Route = createFileRoute('/splash')({
  component: SplashScreen,
})

interface OllamaHealth {
  installed: boolean
  running: boolean
  version: string | null
}

type Step =
  | 'checking'
  | 'installing_engine'
  | 'starting'
  | 'downloading_model'
  | 'finishing'
  | 'error'

export function SplashScreen() {
  const [currentStep, setCurrentStep] = useState<Step>('checking')
  const [overallStatus, setOverallStatus] = useState<string>('Step 1 of 4: Checking environment...')
  const [subStatus, setSubStatus] = useState<string>('Initializing...')

  const [overallProgress, setOverallProgress] = useState<number>(0)
  const [subProgress, setSubProgress] = useState<number>(0)

  const initStarted = useRef(false)

  useEffect(() => {
    if (initStarted.current) return
    initStarted.current = true

    const initSequence = async () => {
      try {
        await new Promise((r) => setTimeout(r, 500)) // Korte buffer voor rendering

        setCurrentStep('checking')
        setOverallProgress(10)
        setOverallStatus('Step 1 of 4: Checking environment')
        setSubStatus('Scanning for AI engine...')

        // We blijven even pollen totdat we een valide antwoord hebben
        let health = await invoke<OllamaHealth>('check_ollama_health')

        // Als NIET geïnstalleerd: Start de volledige installatie flow
        if (!health.installed) {
          await installEngine() // Deze functie wacht nu netjes op de download EN de setup
          return
        }

        // Als WEL geïnstalleerd maar NIET draaiend: Wacht tot de backend thread hem start
        if (!health.running) {
          setCurrentStep('starting')
          setOverallStatus('Step 2 of 4: Initializing Engine')
          setSubStatus('Waiting for background service...')

          let started = false
          for (let i = 0; i < 20; i++) {
            await new Promise((r) => setTimeout(r, 1000))
            const check = await invoke<OllamaHealth>('check_ollama_health')
            if (check.running) {
              started = true
              break
            }
          }
          if (!started) throw new Error('Engine failed to start in time.')
        }

        // --- STEP 3: MODEL CHECK/DOWNLOAD ---
        setCurrentStep('downloading_model')
        setOverallProgress(75)
        setOverallStatus('Step 3 of 4: Verifying AI Models')

        const models = await invoke<string[]>('list_models')

        // --- STEP 4: FINISHING ---
        setCurrentStep('finishing')
        setOverallProgress(100)
        setOverallStatus('Step 4 of 4: Ready!')
        setSubStatus('Launching OpenLocus...')
        setSubProgress(100)

        await new Promise((r) => setTimeout(r, 1000))
        await invoke('close_splashscreen')
      } catch (err) {
        handleError(err)
      }
    }

    initSequence()
  }, [])

  const installEngine = async () => {
    setCurrentStep('installing_engine')
    setOverallProgress(50)
    setOverallStatus('Step 2 of 4: Installing AI Engine')
    setSubStatus('Downloading Installer...')
    setSubProgress(0)

    let lastPercent = 0

    const unlisten = await listen<string>('ollama-install-log', (event) => {
      const text = event.payload.trim()
      if (!text) return

      const match = text.match(/(\d+)(?:[.,]\d+)?\s*%/)
      if (match && match[1]) {
        const percent = parseInt(match[1], 10)
        if (!isNaN(percent) && percent > lastPercent) {
          lastPercent = percent
          setSubProgress(percent)

          if (percent < 100) {
            setSubStatus(`Downloading Installer... ${percent}%`)
          } else {
            setSubStatus('Installing & Configuring... (This may take a minute)')
          }
        }
      }
    })

    try {
      await invoke('install_ollama')
      unlisten()

      setSubProgress(100)
      setSubStatus('Finalizing installation...')

      let setupFinished = false
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        const check = await invoke<OllamaHealth>('check_ollama_health')
        if (check.running) {
          setupFinished = true
          break
        }
      }

      if (!setupFinished) throw new Error('Installation timed out.')

      setSubStatus('Engine installed! Relaunching app...')
      await new Promise((r) => setTimeout(r, 2000))
      await relaunch()
    } catch (e) {
      handleError(e)
      unlisten()
    }
  }

  const downloadModel = async (modelName: string) => {
    setOverallStatus('Step 3 of 4: Downloading AI Model')
    setSubStatus(`Pulling ${modelName}...`)
    setSubProgress(0)

    const unlisten = await listen<any>('model-pull-progress', (event) => {
      const data = event.payload
      if (data.total && data.completed) {
        const percent = Math.round((data.completed / data.total) * 100)
        setSubProgress(percent)
        setSubStatus(`Downloading Model... ${percent}%`)
      }
    })

    try {
      await invoke('pull_model', { modelName })
      setSubStatus('Model downloaded successfully!')
      setSubProgress(100)
    } catch (e) {
      handleError(e)
      throw e
    } finally {
      unlisten()
    }
  }

  const handleError = (err: any) => {
    const message =
      typeof err === 'string'
        ? err
        : (err?.message ?? JSON.stringify(err) ?? 'An unexpected error occurred.')
    setCurrentStep('error')
    setOverallProgress(0)
    setSubProgress(0)
    setOverallStatus('Initialization Failed')
    setSubStatus(message)
  }

  const closeApp = async () => await getCurrentWindow().close()

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
      }}
    >
      <div style={{ width: '85%', textAlign: 'left' }}>
        <h1
          style={{
            marginBottom: '30px',
            fontSize: '24px',
            textAlign: 'center',
            fontWeight: 'bold',
          }}
        >
          OpenLocus
        </h1>

        {/* BAR 1: OVERALL */}
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            <span style={{ color: currentStep === 'error' ? '#ff6b6b' : '#fff' }}>
              {overallStatus}
            </span>
            <span>{overallProgress}%</span>
          </div>
          <div
            style={{ height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden' }}
          >
            <div
              style={{
                height: '100%',
                background: currentStep === 'error' ? '#ff6b6b' : '#4caf50',
                width: `${overallProgress}%`,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>

        {/* BAR 2: SUB-TASK */}
        {currentStep !== 'error' && currentStep !== 'finishing' && (
          <div style={{ marginBottom: '10px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
                fontSize: '12px',
                color: '#aaa',
              }}
            >
              <span>{subStatus}</span>
            </div>
            <div
              style={{
                height: '5px',
                background: '#222',
                borderRadius: '3px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {currentStep === 'installing_engine' && subProgress === 100 ? (
                <div
                  style={{
                    height: '100%',
                    background: '#007bff',
                    width: '35%',
                    animation: 'slide 1.5s infinite linear',
                    position: 'absolute',
                  }}
                />
              ) : (
                <div
                  style={{
                    height: '100%',
                    background: '#007bff',
                    width: `${subProgress}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* ERROR CONTROLS */}
        {currentStep === 'error' && (
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                marginRight: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Retry
            </button>
            <button
              onClick={closeApp}
              style={{
                padding: '10px 20px',
                background: '#333',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Exit
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide {
          0% { left: -35%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  )
}

import { Button } from '@openlocus/ui/components/button'
import { createFileRoute, Link } from '@tanstack/react-router'
import { invoke } from '@tauri-apps/api/core'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [log, setLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const addLog = (msg: string) => setLog((prev) => [...prev, msg])

  const handleDownload = async () => {
    setLoading(true)
    addLog('Starting download...')
    try {
      const result = await invoke<string>('download_model')
      addLog(`✅ ${result}`)
    } catch (e) {
      addLog(`❌ ${e}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInference = async () => {
    setLoading(true)
    addLog('Running inference...')
    try {
      const result = await invoke<string>('run_inference', {
        prompt: 'Hello, what can you do?',
      })
      addLog(`🤖 ${result}`)
    } catch (e) {
      addLog(`❌ ${e}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="p-4">
      <div className="mb-4 flex justify-between">
        <h1 className="text-2xl font-bold">Open Locus</h1>
        <Link to="/notes">Edit notes</Link>
      </div>

      <div className="mb-4 flex gap-2">
        <Button onClick={handleDownload} disabled={loading}>
          {loading ? 'Working...' : 'Download Model'}
        </Button>
        <Button onClick={handleInference} disabled={loading} variant="outline">
          Test Inference
        </Button>
      </div>

      <div className="bg-muted min-h-24 space-y-1 rounded p-3 font-mono text-sm">
        {log.length === 0 && <p className="text-muted-foreground">Logs will appear here...</p>}
        {log.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </main>
  )
}
